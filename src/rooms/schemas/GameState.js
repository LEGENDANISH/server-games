const Logger = require('../../utils/Logger');
const logger = new Logger('GameState');

class GameState {
  constructor() {
    this.players = new Map(); // Map<playerId, playerObject>
    this.bullets = new Map(); // Map<bulletId, bulletObject>
    this.powerups = new Map(); // Map<powerupId, powerupObject>
    this.gameStartTime = null;
    this.lastUpdate = Date.now();
  }

  addPlayer(player) {
    if (!player || !player.id) {
      logger.warn('Attempted to add invalid player:', player);
      return false;
    }

    this.players.set(player.id, {
      id: player.id,
      name: player.name || `Player${player.id}`,
      team: player.team || 'red',
      position: player.position || { x: 100, y: 300 },
      velocity: player.velocity || { x: 0, y: 0 },
      health: player.health || 100,
      maxHealth: player.maxHealth || 100,
      kills: player.kills || 0,
      deaths: player.deaths || 0,
      ready: player.ready || false,
      connected: player.connected !== undefined ? player.connected : true,
      rotation: player.rotation || 0,
      flipX: player.flipX || false,
      lastUpdate: Date.now()
    });

    logger.debug(`Player ${player.id} added to game state`);
    return true;
  }

  removePlayer(playerId) {
    const removed = this.players.delete(playerId);
    if (removed) {
      logger.debug(`Player ${playerId} removed from game state`);
    }
    return removed;
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  updatePlayer(playerId, updates) {
    const player = this.players.get(playerId);
    if (!player) {
      logger.warn(`Attempted to update non-existent player: ${playerId}`);
      return false;
    }

    // Merge updates with existing player data
    Object.assign(player, updates);
    player.lastUpdate = Date.now();
    
    logger.debug(`Player ${playerId} updated:`, updates);
    return true;
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  getConnectedPlayers() {
    return Array.from(this.players.values()).filter(p => p.connected);
  }

  addBullet(bullet) {
    if (!bullet || !bullet.id) {
      logger.warn('Attempted to add invalid bullet:', bullet);
      return false;
    }

    this.bullets.set(bullet.id, {
      id: bullet.id,
      ownerId: bullet.ownerId,
      position: bullet.position || { x: 0, y: 0 },
      velocity: bullet.velocity || { x: 0, y: 0 },
      damage: bullet.damage || 10,
      createdAt: Date.now()
    });

    return true;
  }

  removeBullet(bulletId) {
    return this.bullets.delete(bulletId);
  }

  getAllBullets() {
    return Array.from(this.bullets.values());
  }

  // Clean up old bullets (older than 5 seconds)
  cleanupBullets() {
    const now = Date.now();
    const maxAge = 5000; // 5 seconds

    this.bullets.forEach((bullet, id) => {
      if (now - bullet.createdAt > maxAge) {
        this.bullets.delete(id);
        logger.debug(`Cleaned up old bullet ${id}`);
      }
    });
  }

  serialize() {
    const result = {
      players: {},
      bullets: {},
      gameTime: this.gameStartTime ? Date.now() - this.gameStartTime : 0,
      lastUpdate: this.lastUpdate
    };

    // Serialize players
    this.players.forEach((player, id) => {
      result.players[id] = {
        id: player.id,
        name: player.name,
        team: player.team,
        position: player.position,
        velocity: player.velocity,
        health: player.health,
        maxHealth: player.maxHealth,
        kills: player.kills,
        deaths: player.deaths,
        connected: player.connected,
        rotation: player.rotation,
        flipX: player.flipX
      };
    });

    // Serialize bullets
    this.bullets.forEach((bullet, id) => {
      result.bullets[id] = {
        id: bullet.id,
        ownerId: bullet.ownerId,
        position: bullet.position,
        velocity: bullet.velocity,
        damage: bullet.damage
      };
    });

    this.lastUpdate = Date.now();
    return result;
  }

  update(deltaTime) {
    // Update bullets positions
    this.bullets.forEach((bullet, id) => {
      if (bullet.velocity) {
        bullet.position.x += bullet.velocity.x * (deltaTime / 1000);
        bullet.position.y += bullet.velocity.y * (deltaTime / 1000);
      }
    });

    // Cleanup old bullets
    this.cleanupBullets();

    // Update physics for players if needed
    this.players.forEach((player, id) => {
      if (player.velocity) {
        // Apply basic physics updates if needed
        // This could include gravity, drag, etc.
      }
    });
  }

  reset() {
    this.players.clear();
    this.bullets.clear();
    this.powerups.clear();
    this.gameStartTime = null;
    this.lastUpdate = Date.now();
    
    logger.info('Game state reset');
  }

  getStats() {
    return {
      totalPlayers: this.players.size,
      connectedPlayers: this.getConnectedPlayers().length,
      activeBullets: this.bullets.size,
      gameUptime: this.gameStartTime ? Date.now() - this.gameStartTime : 0
    };
  }
}

module.exports = GameState;