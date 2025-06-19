const { MAX_GAME_ROOM_PLAYERS } = require('../utils/Config');
const Logger = require('../utils/Logger');
const GameState = require('../rooms/schemas/GameState');
const KillFeed = require('../rooms/schemas/KillFeed');
const Timer = require('../rooms/schemas/Timer');
const logger = new Logger('GameRoom');

class GameRoom {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.clients = new Map(); // Map<playerId, ws>
        this.gameState = new GameState();
        this.killFeed = new KillFeed();
        this.gameTimer = new Timer(15 * 60 * 1000, () => this.handleGameEnd()); // 15 minute game
        this.status = 'waiting'; // waiting, playing, ended
        this.spawnPoints = this.generateSpawnPoints(50);
        this.nextPlayerId = 1;
    }

    generateSpawnPoints(count) {
        const points = [];
        for (let i = 0; i < count; i++) {
            points.push({
                x: Math.random() * 1000,
                y: Math.random() * 800,
                team: i % 2 === 0 ? 'red' : 'blue'
            });
        }
        return points;
    }

    addClient(ws) {
        if (this.clients.size >= MAX_GAME_ROOM_PLAYERS) {
            ws.send(JSON.stringify({
                type: 'ROOM_FULL',
                message: 'This room is full (50/50 players)'
            }));
            return null;
        }

        const playerId = `p${this.nextPlayerId++}`;
        const team = this.clients.size % 2 === 0 ? 'red' : 'blue';
        const spawn = this.spawnPoints.find(p => p.team === team) || { x: 0, y: 0 };

        const player = {
            id: playerId,
            name: `Player${playerId}`,
            team,
            position: { x: spawn.x, y: spawn.y },
            health: 100,
            kills: 0,
            deaths: 0,
            connected: true
        };

        this.clients.set(playerId, ws);
        this.gameState.addPlayer(player);

        // Notify the new player about their ID and team
        ws.send(JSON.stringify({
            type: 'PLAYER_INFO',
            playerId,
            team,
            spawnPosition: player.position
        }));

        // Notify all clients about new player
        this.broadcast({
            type: 'PLAYER_JOINED',
            playerId,
            team,
            currentPlayers: this.clients.size
        });

        // Start game if enough players
        if (this.clients.size >= 2 && this.status === 'waiting') {
            this.startGame();
        }

        return playerId;
    }

    removeClient(playerId) {
        if (!this.clients.has(playerId)) return;

        this.clients.delete(playerId);
        const player = this.gameState.getPlayer(playerId);
        if (player) {
            player.connected = false;
            this.broadcast({
                type: 'PLAYER_LEFT',
                playerId,
                currentPlayers: this.clients.size
            });
        }

        // End game if too few players remain
        if (this.status === 'playing' && this.clients.size < 2) {
            this.endGame('not enough players');
        }
    }

    startGame() {
        this.status = 'playing';
        this.gameTimer.start();
        this.broadcast({
            type: 'GAME_START',
            startTime: Date.now(),
            duration: this.gameTimer.duration
        });
        logger.info(`Game started in room ${this.roomCode}`);
    }

    endGame(reason = 'game completed') {
        this.status = 'ended';
        this.gameTimer.stop();
        
        const winner = this.determineWinner();
        this.broadcast({
            type: 'GAME_END',
            winner,
            reason,
            stats: this.getGameStats()
        });
        
        logger.info(`Game ended in room ${this.roomCode}. Winner: ${winner}`);
    }

    determineWinner() {
        // Simple team-based win condition
        const teamStats = { red: 0, blue: 0 };
        
        this.gameState.players.forEach(player => {
            teamStats[player.team] += player.kills;
        });

        return teamStats.red > teamStats.blue ? 'red' : 
               teamStats.blue > teamStats.red ? 'blue' : 'draw';
    }

    getGameStats() {
        const stats = {
            players: [],
            teams: {
                red: { kills: 0, deaths: 0 },
                blue: { kills: 0, deaths: 0 }
            }
        };

        this.gameState.players.forEach(player => {
            stats.players.push({
                id: player.id,
                name: player.name,
                team: player.team,
                kills: player.kills,
                deaths: player.deaths
            });

            stats.teams[player.team].kills += player.kills;
            stats.teams[player.team].deaths += player.deaths;
        });

        return stats;
    }

    handlePlayerAction(playerId, action) {
        const player = this.gameState.getPlayer(playerId);
        if (!player || !player.connected) return;

        switch (action.type) {
            case 'MOVE':
                this.handleMovement(player, action);
                break;
            case 'SHOOT':
                this.handleShooting(player, action);
                break;
            case 'CHANGE_WEAPON':
                player.currentWeapon = action.weapon;
                break;
            // Add more action types as needed
        }
    }

    handleMovement(player, action) {
        // Update player position based on movement input
        // This would integrate with your MovementSystem
        player.position.x += action.dx * player.speed;
        player.position.y += action.dy * player.speed;
        
        // Broadcast position update to all clients
        this.broadcast({
            type: 'PLAYER_MOVED',
            playerId: player.id,
            position: player.position
        });
    }

    handleShooting(player, action) {
        // This would integrate with your CombatSystem
        const targetId = action.targetId;
        const target = this.gameState.getPlayer(targetId);
        
        if (target && target.team !== player.team) {
            const hit = this.gameState.applyDamage(targetId, 25); // Example damage value
            
            if (hit) {
                player.kills++;
                this.killFeed.addEvent(player.id, target.id, player.currentWeapon);
                
                this.broadcast({
                    type: 'PLAYER_HIT',
                    attackerId: player.id,
                    targetId: target.id,
                    damage: 25,
                    newHealth: target.health
                });

                if (target.health <= 0) {
                    target.deaths++;
                    this.handlePlayerDeath(target.id);
                }
            }
        }
    }

    handlePlayerDeath(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) return;

        // Respawn logic
        setTimeout(() => {
            if (player.connected) {
                player.health = 100;
                const spawn = this.spawnPoints.find(p => p.team === player.team);
                player.position = { x: spawn.x, y: spawn.y };
                
                this.broadcast({
                    type: 'PLAYER_RESPAWNED',
                    playerId,
                    position: player.position
                });
            }
        }, 5000); // 5 second respawn delay
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((ws, playerId) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(messageStr);
            }
        });
    }

    update(deltaTime) {
        if (this.status !== 'playing') return;

        // Update game state
        this.gameState.update(deltaTime);
        
        // Broadcast full state at lower frequency
        if (this.lastBroadcastTime === undefined || Date.now() - this.lastBroadcastTime > 100) {
            this.lastBroadcastTime = Date.now();
            this.broadcast({
                type: 'GAME_STATE_UPDATE',
                state: this.gameState.serialize(),
                killFeed: this.killFeed.serialize(),
                timeRemaining: this.gameTimer.getTimeFormatted()
            });
        }
    }

    getInfo() {
        return {
            roomCode: this.roomCode,
            playerCount: this.clients.size,
            maxPlayers: MAX_GAME_ROOM_PLAYERS,
            status: this.status,
            gameTime: this.gameTimer.getTimeFormatted()
        };
    }
}

module.exports = GameRoom;