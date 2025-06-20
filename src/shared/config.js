export const GAME_CONFIG = {
  // Player Configuration
  PLAYER: {
    // Movement
    SPEED: 200,                 // Horizontal movement speed (pixels/second)
    ACCELERATION: 1000,          // How quickly player reaches max speed (pixels/second²)
    DECELERATION: 1200,          // How quickly player stops (pixels/second²)
    JUMP_VELOCITY: -500,         // Initial jump velocity (negative = upward)
    AIR_CONTROL: 0.7,            // Movement control while airborne (0-1)
    MAX_FALL_SPEED: 800,         // Terminal velocity (pixels/second)
    
    // Combat
    MAX_HEALTH: 100,
    SIZE: { width: 20, height: 40 }, // Collision bounds
    HITBOX_OFFSET: { x: 0, y: 5 },   // Visual adjustment
    
    // Shooting
    BULLET_DAMAGE: 25,
    SHOOT_COOLDOWN: 200,         // Milliseconds between shots
    BULLET_SPEED: 800,           // Pixels/second
    BULLET_LIFETIME: 2000,       // Milliseconds
    BULLET_SIZE: { width: 8, height: 4 },
    
    // Game Limits
    MAX_PLAYERS: 8,
    RESPAWN_TIME: 5000,          // Milliseconds
    INVULNERABILITY_TIME: 2000   // After respawn
  },

  // World Configuration
  WORLD: {
    WIDTH: 3000,
    HEIGHT: 800,
    GRAVITY: 1500,               // Pixels/second²
    GROUND_HEIGHT: 100,          // Height of ground plane
    
    // Spawning
    SPAWN_X_OFFSET: 100,
    SPAWN_Y_OFFSET: 300,
    SPAWN_AREA_WIDTH: 300,
    SPAWN_AREA_HEIGHT: 200,
    TEAM_SPAWN_OFFSET: 150,      // Distance between team spawn areas
    
    // Collision
    PLATFORM_THICKNESS: 20,
    WALL_BOUNCE: 0.2             // Elasticity coefficient (0-1)
  },

  // Game Rules
  GAME: {
    DEFAULT_DURATION: 10 * 60 * 1000, // 10 minutes
    WARMUP_TIME: 10000,          // Milliseconds
    ENDGAME_DELAY: 8000,         // After match ends
    
    // Scoring
    KILL_SCORE: 100,
    DEATH_PENALTY: -50,
    DAMAGE_SCORE_FACTOR: 0.2,    // Score per damage point
    
    // Win Conditions
    SCORE_LIMIT: 5000,
    KILL_LIMIT: 25,
    TIME_LIMIT: 900000           // 15 minutes
  },

  // Network Settings
  NETWORK: {
    UPDATE_RATE: 20,             // Hz (server updates per second)
    SNAPSHOT_RATE: 20,           // Hz (for lag compensation)
    MAX_SNAPSHOTS: 60,           // Keep 3 seconds at 20fps
    
    // Client Prediction
    MAX_REWIND: 200,             // Milliseconds for lag compensation
    RECONCILE_THRESHOLD: 10,     // Pixels difference before correcting
    
    // Input
    MAX_INPUT_RATE: 30,          // Inputs/second per client
    INPUT_BUFFER_SIZE: 60,       // Stored inputs per player
    
    // Timeouts
    DISCONNECT_TIMEOUT: 10000,   // Milliseconds
    RECONNECT_WINDOW: 5000
  },

  // Physics Engine
  PHYSICS: {
    FPS: 60,                     // Physics simulation rate
    STEP_SIZE: 1000 / 60,        // Fixed timestep (ms)
    VELOCITY_ITERATIONS: 8,      // For constraint solving
    POSITION_ITERATIONS: 3,
    
    // Collision Categories
    COLLISION_CATEGORIES: {
      PLAYER: 0x0001,
      ENEMY: 0x0002,
      BULLET: 0x0004,
      PLATFORM: 0x0008,
      POWERUP: 0x0010
    }
  },

  // Visual Settings
  RENDER: {
    INTERPOLATION_TIME: 100,     // Milliseconds for smooth movement
    HEALTHBAR_WIDTH: 30,
    HEALTHBAR_HEIGHT: 4,
    NAME_TAG_OFFSET: -45,
    
    // Colors
    TEAM_COLORS: {
      RED: 0xFF5555,
      BLUE: 0x5555FF,
      GREEN: 0x55FF55
    }
  }
};