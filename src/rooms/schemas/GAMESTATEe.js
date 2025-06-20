const Logger = require('../../utils/Logger');
const logger = new Logger('GameState');

class GameState {
  constructor() {
    // Core game entities
    this.players = new Map();        // playerId -> playerData
    this.bullets = new Map();        // bulletId -> bulletData
    this.powerups = new Map();       // powerupId -> powerupData
    this.projectiles = new Map();    // projectileId -> projectileData
    
    // Game timing
    this.gameStartTime = null;
    this.lastUpdate = Date.now();
    this.lastSnapshotTime = 0;
    this.snapshots = []; // For lag compensation
    
    // Game statistics
    this.stats = {
      kills: 0,
      deaths: 0,
      shotsFired: 0
    };
  }

  /* ========================
     PLAYER MANAGEMENT
  ======================== */

  addPlayer(playerData) {
    if (!playerData?.id) {
      logger.warn('Invalid player data:', playerData);
      return false;
    }

    const spawnPoint = this.getRandomSpawnPoint();
    const now = Date.now();

    this.players.set(playerData.id, {
      // Identity
      id: playerData.id,
      name: playerData.name || `Player${playerData.id}`,
      team: playerData.team || this.assignTeam(),
      
      // Physics state
      position: { ...spawnPoint },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      flipX: false,
      isGrounded: false,
      
      // Combat stats
      health: GAME_CONFIG.PLAYER.MAX_HEALTH,
      maxHealth: GAME_CONFIG.PLAYER.MAX_HEALTH,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      
      // Network state
      lastInputSequence: 0,
      lastProcessedInput: 0,
      inputBuffer: [],
      
      // Game state
      ready: false,
      connected: true,
      isDead: false,
      respawnTime: 0,
      lastUpdate: now
    });

    logger.info(`Player ${playerData.id} added`);
    return true;
  }

  removePlayer(playerId) {
    if (!this.players.has(playerId)) return false;
    
    // Clean up player projectiles
    this.getAllProjectiles()
      .filter(p => p.ownerId === playerId)
      .forEach(p => this.projectiles.delete(p.id));
    
    this.players.delete(playerId);
    logger.info(`Player ${playerId} removed`);
    return true;
  }

  /* ========================
     STATE SYNCHRONIZATION
  ======================== */

  takeSnapshot() {
    const now = Date.now();
    if (now - this.lastSnapshotTime < 1000 / GAME_CONFIG.NETWORK.SNAPSHOT_RATE) return;
    
    this.snapshots.push({
      timestamp: now,
      state: this.serialize()
    });
    
    // Keep only recent snapshots
    if (this.snapshots.length > GAME_CONFIG.NETWORK.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
    
    this.lastSnapshotTime = now;
  }

  getSnapshot(timestamp) {
    return this.snapshots
      .filter(s => s.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  serialize() {
    const now = Date.now();
    return {
      // Core game state
      time: now - this.gameStartTime,
      lastUpdate: this.lastUpdate,
      
      // Players
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        position: p.position,
        velocity: p.velocity,
        health: p.health,
        rotation: p.rotation,
        flipX: p.flipX,
        lastProcessedInput: p.lastProcessedInput
      })),
      
      // Projectiles
      projectiles: Array.from(this.projectiles.values()).map(p => ({
        id: p.id,
        ownerId: p.ownerId,
        position: p.position,
        velocity: p.velocity,
        type: p.type
      })),
      
      // Game stats
      stats: { ...this.stats }
    };
  }

  /* ========================
     COMBAT SYSTEM
  ======================== */

  handleDamage(attackerId, victimId, damageInfo) {
    const attacker = this.players.get(attackerId);
    const victim = this.players.get(victimId);
    
    if (!attacker || !victim || victim.isDead) return false;

    // Calculate final damage (could apply armor, buffs, etc.)
    const damage = Math.min(
      this.calculateFinalDamage(damageInfo),
      victim.health
    );

    // Apply damage
    victim.health -= damage;
    attacker.damageDealt += damage;
    this.stats.damageDealt += damage;

    logger.debug(`${attackerId} hit ${victimId} for ${damage} damage`);

    // Check for death
    if (victim.health <= 0) {
      this.handlePlayerDeath(attackerId, victimId);
    }

    return true;
  }

  handlePlayerDeath(attackerId, victimId) {
    const attacker = this.players.get(attackerId);
    const victim = this.players.get(victimId);

    if (!victim || victim.isDead) return;

    // Update stats
    victim.isDead = true;
    victim.deaths += 1;
    victim.respawnTime = Date.now() + GAME_CONFIG.PLAYER.RESPAWN_TIME;
    
    if (attacker && attackerId !== victimId) {
      attacker.kills += 1;
    }

    this.stats.kills += 1;
    this.stats.deaths += 1;

    logger.info(`${attackerId} killed ${victimId}`);
  }

  respawnPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player || !player.isDead) return;

    const spawnPoint = this.getRandomSpawnPoint();
    
    player.position = { ...spawnPoint };
    player.velocity = { x: 0, y: 0 };
    player.health = player.maxHealth;
    player.isDead = false;
    player.respawnTime = 0;

    logger.info(`${playerId} respawned at ${spawnPoint.x},${spawnPoint.y}`);
  }

  /* ========================
     PHYSICS & UPDATES
  ======================== */

  update(deltaTime) {
    // Update players
    this.players.forEach(player => {
      if (player.isDead) return;

      // Apply gravity if not grounded
      if (!player.isGrounded) {
        player.velocity.y += GAME_CONFIG.PHYSICS.GRAVITY * (deltaTime / 1000);
      }

      // Update position
      player.position.x += player.velocity.x * (deltaTime / 1000);
      player.position.y += player.velocity.y * (deltaTime / 1000);
      
      // Check for respawn
      if (player.respawnTime > 0 && Date.now() >= player.respawnTime) {
        this.respawnPlayer(player.id);
      }
    });

    // Update projectiles
    this.projectiles.forEach(projectile => {
      projectile.position.x += projectile.velocity.x * (deltaTime / 1000);
      projectile.position.y += projectile.velocity.y * (deltaTime / 1000);
      
      // Check lifetime
      if (Date.now() - projectile.createdAt > projectile.lifetime) {
        this.projectiles.delete(projectile.id);
      }
    });

    // Take snapshot for lag compensation
    this.takeSnapshot();
    this.lastUpdate = Date.now();
  }

  /* ========================
     UTILITY METHODS
  ======================== */

  getRandomSpawnPoint() {
    return {
      x: Math.floor(Math.random() * GAME_CONFIG.WORLD.SPAWN_AREA_WIDTH) + GAME_CONFIG.WORLD.SPAWN_X_OFFSET,
      y: Math.floor(Math.random() * GAME_CONFIG.WORLD.SPAWN_AREA_HEIGHT) + GAME_CONFIG.WORLD.SPAWN_Y_OFFSET
    };
  }

  assignTeam() {
    const teamCounts = { red: 0, blue: 0 };
    this.players.forEach(p => {
      if (p.connected) teamCounts[p.team]++;
    });
    return teamCounts.red <= teamCounts.blue ? 'red' : 'blue';
  }

  calculateFinalDamage(damageInfo) {
    // Could apply armor reduction, buffs, etc.
    return Math.max(0, damageInfo.baseDamage * (damageInfo.multiplier || 1));
  }

  /* ========================
     GETTERS & STATS
  ======================== */

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  getConnectedPlayers() {
    return this.getAllPlayers().filter(p => p.connected);
  }

  getProjectile(projectileId) {
    return this.projectiles.get(projectileId);
  }

  getAllProjectiles() {
    return Array.from(this.projectiles.values());
  }

  getGameStats() {
    return {
      ...this.stats,
      playerCount: this.players.size,
      activeProjectiles: this.projectiles.size,
      uptime: this.gameStartTime ? Date.now() - this.gameStartTime : 0
    };
  }

  reset() {
    this.players.clear();
    this.projectiles.clear();
    this.powerups.clear();
    this.snapshots = [];
    this.gameStartTime = null;
    this.lastUpdate = Date.now();
    this.stats = {
      kills: 0,
      deaths: 0,
      shotsFired: 0,
      damageDealt: 0
    };
  }
}

module.exports = GameState;