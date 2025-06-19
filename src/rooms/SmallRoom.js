const Logger = require('../utils/Logger');
const GameState = require('../rooms/schemas/GameState');
const Timer = require('../rooms/schemas/Timer');

const MovementSystem = require('../systems/MovementSystem');
const CombatSystem = require('../systems/CombatSystem');
const TickSystem = require('../systems/TickSystem');
const ValidationSystem = require('../systems/ValidationSystem');

const logger = new Logger('SmallRoom');

class SmallRoom {
  constructor(roomCode, creatorId, options = {}) {
    this.roomCode = roomCode;
    this.creatorId = creatorId;
    this.maxPlayers = options.maxPlayers || 4;
    this.gameMode = options.gameMode || 'deathmatch';

    this.clients = new Map(); // Map<playerId, ws>
    this.gameState = new GameState();
    this.playersReady = new Set();
    this.status = 'waiting';

    this.gameTimer = new Timer(10 * 60 * 1000, () => this.endGame('Time Expired'));

    // Systems
    this.movementSystem = new MovementSystem();
    this.combatSystem = new CombatSystem();
    this.tickSystem = new TickSystem();
    this.validationSystem = new ValidationSystem(this.tickSystem);

    // Track last update time for controlled broadcasting
    this.lastBroadcast = 0;
    this.broadcastRate = 50; // 20 updates per second (50ms)

    // Tick loop
    this.tickSystem.registerTickHandler(() => this.update());
    this.tickSystem.start();

    logger.info(`Room ${roomCode} created.`);
  }

  addClient(ws, playerId, playerName = `Player${playerId}`) {
    if (this.clients.size >= this.maxPlayers) {
      ws.send(JSON.stringify({ type: 'ROOM_FULL', data: { message: 'Room is full' } }));
      return false;
    }

    const player = {
      id: playerId,
      name: playerName,
      team: this.assignTeam(),
      position: this.getSpawnPoint(),
      health: 100,
      kills: 0,
      deaths: 0,
      velocity: { x: 0, y: 0 },
      ready: false,
      connected: true,
      rotation: 0,
      flipX: false
    };

    this.clients.set(playerId, ws);
    this.gameState.addPlayer(player);

    // Send room joined confirmation
    ws.send(JSON.stringify({
      type: 'ROOM_JOINED',
      data: {
        roomCode: this.roomCode,
        playerId,
        spawnPosition: player.position,
        players: Array.from(this.gameState.players.values())
      }
    }));

    // Broadcast to other players that someone joined
    this.broadcast({
      type: 'PLAYER_JOINED',
      data: {
        playerId,
        playerName,
        position: player.position,
        team: player.team
      }
    }, playerId);

    logger.info(`Player ${playerId} (${playerName}) joined room ${this.roomCode}`);
    return true;
  }

  removeClient(playerId) {
    this.clients.delete(playerId);
    this.playersReady.delete(playerId);

    // Update player as disconnected instead of removing
    const player = this.gameState.getPlayer(playerId);
    if (player) {
      player.connected = false;
    }

    this.broadcast({
      type: 'PLAYER_LEFT',
      data: { playerId }
    });

    logger.info(`Player ${playerId} left room ${this.roomCode}`);

    if (this.clients.size === 0) {
      this.closeRoom('All players left.');
    }
  }

  setPlayerReady(playerId, isReady) {
    const player = this.gameState.getPlayer(playerId);
    if (!player) return;

    player.ready = isReady;
    isReady ? this.playersReady.add(playerId) : this.playersReady.delete(playerId);

    if (this.playersReady.size === this.clients.size && this.clients.size >= 2) {
      this.startGame();
    }
  }

  startGame() {
    if (this.status !== 'waiting') return;
    this.status = 'playing';
    this.gameTimer.start();

    this.broadcast({ type: 'GAME_STARTED', data: { time: Date.now() } });
    logger.info(`Game started in room ${this.roomCode}`);
  }

  endGame(reason = 'Time Expired') {
    this.status = 'ended';
    this.gameTimer.stop();

    const winner = this.determineWinner();

    this.broadcast({
      type: 'GAME_ENDED',
      data: {
        winner,
        reason,
        stats: this.getGameStats()
      }
    });

    logger.info(`Game ended in room ${this.roomCode}. Winner: ${winner}`);
  }

  determineWinner() {
    let topPlayer = null;
    this.gameState.players.forEach(p => {
      if (!topPlayer || p.kills > topPlayer.kills) {
        topPlayer = p;
      }
    });
    return topPlayer ? topPlayer.id : null;
  }

  // NEW: Handle player actions from frontend
  handlePlayerAction(playerId, action) {
    const player = this.gameState.getPlayer(playerId);
    if (!player || !player.connected) {
      logger.warn(`Action from non-existent or disconnected player: ${playerId}`);
      return;
    }

    switch (action.type) {
      case 'MOVE':
        this.handlePlayerMovement(player, action.data);
        break;

      case 'SHOOT':
        this.handlePlayerShooting(player, action.data);
        break;

      default:
        logger.warn(`Unhandled action type: ${action.type} from player ${playerId}`);
    }
  }

  handlePlayerMovement(player, data) {
    if (!data.position) {
      logger.warn(`Invalid movement data from player ${player.id}`);
      return;
    }

    // Update player position and velocity
    const oldPosition = { ...player.position };
    
    player.position.x = data.position.x;
    player.position.y = data.position.y;
    
    if (data.velocity) {
      player.velocity.x = data.velocity.x;
      player.velocity.y = data.velocity.y;
    }
    
    if (data.rotation !== undefined) {
      player.rotation = data.rotation;
    }
    
    if (data.flipX !== undefined) {
      player.flipX = data.flipX;
    }

    // Broadcast movement to other players
    this.broadcast({
      type: 'PLAYER_MOVED',
      data: {
        playerId: player.id,
        position: player.position,
        velocity: player.velocity,
        rotation: player.rotation,
        flipX: player.flipX
      }
    }, player.id);

    logger.debug(`Player ${player.id} moved from (${oldPosition.x}, ${oldPosition.y}) to (${player.position.x}, ${player.position.y})`);
  }

  handlePlayerShooting(player, data) {
    if (!data.position || data.rotation === undefined) {
      logger.warn(`Invalid shooting data from player ${player.id}`);
      return;
    }

    // Broadcast shooting to other players
    this.broadcast({
      type: 'PLAYER_SHOT',
      data: {
        playerId: player.id,
        position: data.position,
        rotation: data.rotation
      }
    }, player.id);

    logger.debug(`Player ${player.id} shot from position (${data.position.x}, ${data.position.y}) with rotation ${data.rotation}`);
  }

  broadcast(message, excludeId = null) {
    const msg = JSON.stringify(message);
    this.clients.forEach((ws, playerId) => {
      if (playerId !== excludeId && ws.readyState === ws.OPEN) {
        try {
          ws.send(msg);
        } catch (error) {
          logger.error(`Failed to send message to player ${playerId}:`, error);
        }
      }
    });
  }

  update() {
    if (this.status !== 'playing') return;

    const now = Date.now();
    
    // Only broadcast updates at controlled rate
    if (now - this.lastBroadcast >= this.broadcastRate) {
      this.lastBroadcast = now;
      
      const serializedState = this.gameState.serialize();

      // Log current state for debugging
      logger.debug(`[TICK] Broadcasting state with ${Object.keys(serializedState.players).length} players`);
      
      this.broadcast({
        type: 'GAME_UPDATE',
        data: {
          state: serializedState,
          timeRemaining: this.gameTimer.getTimeFormatted()
        }
      });
    }
  }

  closeRoom(reason = 'Room closed') {
    this.broadcast({ type: 'ROOM_CLOSED', data: { reason } });
    this.clients.forEach(ws => {
      try {
        ws.close(1000, reason);
      } catch (error) {
        logger.error('Error closing WebSocket:', error);
      }
    });
    logger.info(`Room ${this.roomCode} closed. Reason: ${reason}`);
  }

  assignTeam() {
    const teamCounts = { red: 0, blue: 0 };
    this.gameState.players.forEach(p => {
      if (p.connected) teamCounts[p.team]++;
    });
    return teamCounts.red <= teamCounts.blue ? 'red' : 'blue';
  }

  getSpawnPoint() {
    return {
      x: Math.floor(Math.random() * 300) + 100,
      y: Math.floor(Math.random() * 200) + 300
    };
  }

  getGameStats() {
    return {
      duration: this.gameTimer.getTimeFormatted(),
      players: Array.from(this.gameState.players.values()).map(p => ({
        id: p.id,
        kills: p.kills,
        deaths: p.deaths,
        score: p.kills * 100 - p.deaths * 50
      }))
    };
  }

  getRoomInfo() {
    return {
      roomCode: this.roomCode,
      status: this.status,
      currentPlayers: this.clients.size,
      maxPlayers: this.maxPlayers
    };
  }
}

module.exports = SmallRoom;