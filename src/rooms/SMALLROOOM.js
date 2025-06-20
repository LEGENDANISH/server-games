const Logger = require('../utils/Logger');
const GameState = require('../rooms/schemas/GameState');
const Timer = require('../rooms/schemas/Timer');
const { GAME_CONFIG } = require('../shared/config');

const MovementSystem = require('../systems/MovementSystem');
const CombatSystem = require('../systems/CombatSystem');
const TickSystem = require('../systems/TickSystem');
const ValidationSystem = require('../systems/ValidationSystem');

const logger = new Logger('SmallRoom');

class SmallRoom {
  constructor(roomCode, creatorId, options = {}) {
    // Room configuration
    this.roomCode = roomCode;
    this.creatorId = creatorId;
    this.maxPlayers = options.maxPlayers || GAME_CONFIG.PLAYER.MAX_PLAYERS;
    this.gameMode = options.gameMode || 'deathmatch';
    this.status = 'waiting';

    // Network state
    this.clients = new Map(); // playerId -> WebSocket
    this.lastBroadcast = 0;
    this.broadcastRate = 1000 / GAME_CONFIG.NETWORK.UPDATE_RATE; // Convert Hz to ms

    // Game systems
    this.gameState = new GameState();
    this.playersReady = new Set();
    this.gameTimer = new Timer(GAME_CONFIG.GAME.DURATION, () => this.endGame('Time Expired'));
    
    // Physics systems
    this.movementSystem = new MovementSystem(GAME_CONFIG);
    this.combatSystem = new CombatSystem(GAME_CONFIG);
    this.validationSystem = new ValidationSystem(GAME_CONFIG);
    this.tickSystem = new TickSystem({
      fixedStep: 1000 / GAME_CONFIG.PHYSICS.FPS,
      onTick: delta => this.physicsStep(delta)
    });

    // State history for lag compensation
    this.stateHistory = {
      snapshots: [],
      addSnapshot: (state) => {
        this.stateHistory.snapshots.push({
          timestamp: Date.now(),
          state: JSON.parse(JSON.stringify(state))
        });
        if (this.stateHistory.snapshots.length > GAME_CONFIG.NETWORK.MAX_SNAPSHOTS) {
          this.stateHistory.snapshots.shift();
        }
      },
      getSnapshot: (timestamp) => {
        return this.stateHistory.snapshots
          .filter(s => s.timestamp <= timestamp)
          .sort((a, b) => b.timestamp - a.timestamp)[0]?.state;
      }
    };

    logger.info(`Room ${roomCode} created with ${this.maxPlayers} player slots`);
  }

  /* ========================
     PLAYER MANAGEMENT
  ======================== */

  addClient(ws, playerId, playerName = `Player${playerId}`) {
    if (this.clients.size >= this.maxPlayers) {
      ws.send(JSON.stringify({ 
        type: 'ROOM_FULL', 
        data: { message: 'Room is full' } 
      }));
      return false;
    }

    const spawnPoint = this.getSpawnPoint();
    const player = {
      id: playerId,
      name: playerName,
      team: this.assignTeam(),
      position: spawnPoint,
      velocity: { x: 0, y: 0 },
      health: GAME_CONFIG.PLAYER.MAX_HEALTH,
      maxHealth: GAME_CONFIG.PLAYER.MAX_HEALTH,
      kills: 0,
      deaths: 0,
      lastProcessedInput: 0,
      inputsThisSecond: 0,
      isGrounded: false,
      connected: true
    };

    // Add to game state
    this.clients.set(playerId, ws);
    this.gameState.addPlayer(player);

    // Setup input rate tracking
    setInterval(() => {
      const player = this.gameState.getPlayer(playerId);
      if (player) player.inputsThisSecond = 0;
    }, 1000);

    // Send join confirmation
    ws.send(JSON.stringify({
      type: 'ROOM_JOINED',
      data: {
        roomCode: this.roomCode,
        playerId,
        spawnPosition: spawnPoint,
        config: {
          physics: GAME_CONFIG.PHYSICS,
          player: GAME_CONFIG.PLAYER
        },
        players: this.getConnectedPlayers()
      }
    }));

    // Broadcast join to others
    this.broadcast({
      type: 'PLAYER_JOINED',
      data: {
        playerId,
        playerName,
        position: spawnPoint,
        team: player.team
      }
    }, playerId);

    logger.info(`Player ${playerId} joined room ${this.roomCode}`);
    return true;
  }

  removeClient(playerId) {
    if (!this.clients.has(playerId)) return;

    this.clients.delete(playerId);
    this.playersReady.delete(playerId);
    this.gameState.removePlayer(playerId);

    this.broadcast({
      type: 'PLAYER_LEFT',
      data: { playerId }
    });

    logger.info(`Player ${playerId} left room ${this.roomCode}`);

    // Close room if empty
    if (this.clients.size === 0) {
      this.closeRoom('Last player left');
    }
  }

  /* ========================
     GAME LOOP & PHYSICS
  ======================== */

  physicsStep(delta) {
    // Apply physics to all players
    this.gameState.players.forEach(player => {
      if (!player.connected) return;

      // Apply gravity
      player.velocity.y += GAME_CONFIG.PHYSICS.GRAVITY * delta;
      player.isGrounded = false; // Reset ground state, collision will set it

      // Update position
      player.position.x += player.velocity.x * delta;
      player.position.y += player.velocity.y * delta;
    });

    // Store state snapshot for lag compensation
    this.stateHistory.addSnapshot(this.gameState.serialize());
  }

  update() {
    // Broadcast game state at fixed rate
    const now = Date.now();
    if (now - this.lastBroadcast >= this.broadcastRate) {
      this.lastBroadcast = now;
      this.broadcastState();
    }
  }

  broadcastState() {
    const state = this.gameState.serialize();
    this.broadcast({
      type: 'GAME_UPDATE',
      data: {
        state,
        timeRemaining: this.gameTimer.getTimeFormatted(),
        serverTime: Date.now()
      }
    });
  }

  /* ========================
     INPUT HANDLING
  ======================== */

  handlePlayerAction(playerId, action) {
    const player = this.gameState.getPlayer(playerId);
    if (!player || !player.connected) {
      logger.warn(`Action from invalid player: ${playerId}`);
      return;
    }

    // Rate limiting
    if (++player.inputsThisSecond > GAME_CONFIG.NETWORK.MAX_INPUT_RATE) {
      logger.warn(`Player ${playerId} exceeded input rate`);
      return;
    }

    switch (action.type) {
      case 'INPUT':
        this.handlePlayerInput(player, action.data);
        break;
      case 'SHOOT':
        this.handlePlayerShoot(player, action.data);
        break;
      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  handlePlayerInput(player, input) {
    // Validate input
    if (!this.validationSystem.validateInput(input, player)) {
      logger.warn(`Invalid input from player ${player.id}`);
      return;
    }

    // Process movement
    const newState = this.movementSystem.processInput(
      player,
      input,
      this.gameState
    );

    // Update player state
    player.position = newState.position;
    player.velocity = newState.velocity;
    player.isGrounded = newState.isGrounded;
    player.lastProcessedInput = input.sequence;

    // Broadcast update
    this.broadcast({
      type: 'PLAYER_STATE',
      data: {
        playerId: player.id,
        position: player.position,
        velocity: player.velocity,
        lastProcessedInput: input.sequence
      }
    }, player.id);
  }

  handlePlayerShoot(player, shootData) {
    // Lag compensation - rewind time based on ping
    const lag = Date.now() - shootData.timestamp;
    const rewindTime = Math.min(lag, GAME_CONFIG.NETWORK.MAX_REWIND);
    const snapshot = this.stateHistory.getSnapshot(shootData.timestamp - rewindTime);

    // Process shot against historical state
    const hit = this.combatSystem.processShot(snapshot, shootData);

    if (hit) {
      this.handlePlayerDamage(hit.playerId, {
        damage: shootData.damage,
        attackerId: player.id
      });
    }

    // Broadcast shot to all players
    this.broadcast({
      type: 'PLAYER_SHOT',
      data: {
        playerId: player.id,
        position: shootData.position,
        direction: shootData.direction,
        timestamp: shootData.timestamp
      }
    }, player.id);
  }

  /* ========================
     COMBAT SYSTEM
  ======================== */

  handlePlayerDamage(playerId, damageData) {
    const player = this.gameState.getPlayer(playerId);
    if (!player || player.health <= 0) return;

    const attacker = this.gameState.getPlayer(damageData.attackerId);
    const finalDamage = this.combatSystem.calculateDamage(damageData, player);

    player.health = Math.max(0, player.health - finalDamage);

    this.broadcast({
      type: 'PLAYER_DAMAGED',
      data: {
        playerId,
        health: player.health,
        attackerId: damageData.attackerId
      }
    });

    if (player.health <= 0) {
      this.handlePlayerDeath(playerId, damageData.attackerId);
    }
  }

  handlePlayerDeath(playerId, killerId) {
    const player = this.gameState.getPlayer(playerId);
    const killer = this.gameState.getPlayer(killerId);

    if (!player || player.isDead) return;

    player.isDead = true;
    player.deaths++;
    if (killer) killer.kills++;

    this.broadcast({
      type: 'PLAYER_DIED',
      data: {
        playerId,
        killerId,
        respawnTime: GAME_CONFIG.PLAYER.RESPAWN_TIME
      }
    });

    // Schedule respawn
    setTimeout(() => {
      if (this.gameState.players.has(playerId)) {
        this.respawnPlayer(playerId);
      }
    }, GAME_CONFIG.PLAYER.RESPAWN_TIME);
  }

  respawnPlayer(playerId) {
    const player = this.gameState.getPlayer(playerId);
    if (!player) return;

    const spawnPoint = this.getSpawnPoint();
    player.position = spawnPoint;
    player.velocity = { x: 0, y: 0 };
    player.health = player.maxHealth;
    player.isDead = false;

    this.broadcast({
      type: 'PLAYER_RESPAWNED',
      data: {
        playerId,
        position: spawnPoint,
        health: player.health
      }
    });
  }

  /* ========================
     GAME MANAGEMENT
  ======================== */

  startGame() {
    if (this.status !== 'waiting') return;
    this.status = 'playing';
    this.gameTimer.start();
    this.tickSystem.start();

    this.broadcast({ 
      type: 'GAME_STARTED', 
      data: { startTime: Date.now() } 
    });
    logger.info(`Game started in room ${this.roomCode}`);
  }

  endGame(reason) {
    this.status = 'ended';
    this.gameTimer.stop();
    this.tickSystem.stop();

    const winner = this.determineWinner();
    const stats = this.getGameStats();

    this.broadcast({
      type: 'GAME_ENDED',
      data: { winner, reason, stats }
    });

    logger.info(`Game ended in room ${this.roomCode}. Winner: ${winner}`);
  }

  /* ========================
     UTILITY METHODS
  ======================== */

  getConnectedPlayers() {
    return Array.from(this.gameState.players.values())
      .filter(p => p.connected)
      .map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.team
      }));
  }

  getGameStats() {
    const players = Array.from(this.gameState.players.values());
    return {
      duration: this.gameTimer.getTimeFormatted(),
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        kills: p.kills,
        deaths: p.deaths,
        score: p.kills * 100 - p.deaths * 50
      })),
      winner: this.determineWinner()
    };
  }

  determineWinner() {
    let topPlayer = null;
    this.gameState.players.forEach(p => {
      if (!topPlayer || p.kills > topPlayer.kills) {
        topPlayer = p;
      }
    });
    return topPlayer?.id || null;
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
      x: Math.floor(Math.random() * GAME_CONFIG.WORLD.SPAWN_AREA_WIDTH) + GAME_CONFIG.WORLD.SPAWN_X_OFFSET,
      y: Math.floor(Math.random() * GAME_CONFIG.WORLD.SPAWN_AREA_HEIGHT) + GAME_CONFIG.WORLD.SPAWN_Y_OFFSET
    };
  }

  broadcast(message, excludeId = null) {
    const msg = JSON.stringify(message);
    this.clients.forEach((ws, playerId) => {
      if (playerId !== excludeId && ws.readyState === ws.OPEN) {
        try {
          ws.send(msg);
        } catch (error) {
          logger.error(`Failed to send to ${playerId}:`, error);
        }
      }
    });
  }

  closeRoom(reason) {
    this.broadcast({ 
      type: 'ROOM_CLOSED', 
      data: { reason } 
    });
    
    this.clients.forEach(ws => {
      try {
        ws.close(1000, reason);
      } catch (error) {
        logger.error('Error closing connection:', error);
      }
    });
    
    this.tickSystem.stop();
    logger.info(`Room ${this.roomCode} closed: ${reason}`);
  }
}

module.exports = SmallRoom;