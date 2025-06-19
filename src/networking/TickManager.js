const Logger = require('../utils/Logger');
const logger = new Logger('TickManager');

class TickManager {
    constructor() {
        this.tickRate = 30; // ticks per second (30Hz)
        this.tickLengthMs = 1000 / this.tickRate;
        this.lastTickTime = 0;
        this.tickNumber = 0;
        this.isRunning = false;
        this.systems = [];
        this.rooms = new Map(); // Reference to rooms
        this.timeAccumulator = 0;
        this.lastFrameTime = 0;
        this.stats = {
            tickTimes: [],
            updateTimes: [],
            tickRate: 0
        };
    }

    // Initialize with room references
    initialize(rooms) {
        this.rooms = rooms;
    }

    // Register a system that needs tick updates
    registerSystem(system) {
        if (typeof system.update === 'function') {
            this.systems.push(system);
            logger.info(`Registered system: ${system.constructor.name}`);
        } else {
            logger.warn(`System ${system.constructor.name} has no update method`);
        }
    }

    // Start the tick loop
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTickTime = performance.now();
        this.lastFrameTime = this.lastTickTime;
        this.tickNumber = 0;
        this.timeAccumulator = 0;

        logger.info(`Starting tick manager at ${this.tickRate}Hz`);
        this.tickLoop();
    }

    // Stop the tick loop
    stop() {
        this.isRunning = false;
        logger.info('Stopping tick manager');
    }

    // Main tick loop
    tickLoop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        this.timeAccumulator += deltaTime;

        // Fixed timestep updates
        while (this.timeAccumulator >= this.tickLengthMs) {
            const tickStart = performance.now();
            
            // Update all registered systems
            this.updateSystems(this.tickLengthMs);
            
            // Update all rooms
            this.updateRooms(this.tickLengthMs);
            
            this.tickNumber++;
            this.timeAccumulator -= this.tickLengthMs;
            this.lastTickTime = now;

            // Track performance
            const tickDuration = performance.now() - tickStart;
            this.recordTickStats(tickDuration);
        }

        // Calculate dynamic sleep time to maintain tick rate
        const nextTickIn = this.tickLengthMs - (performance.now() - this.lastFrameTime);
        setTimeout(() => this.tickLoop(), Math.max(0, nextTickIn));
    }

    // Update all registered systems
    updateSystems(deltaTime) {
        for (const system of this.systems) {
            const start = performance.now();
            system.update(deltaTime, this.tickNumber);
            const duration = performance.now() - start;
            
            // Optional: Track system-specific performance
            if (system.constructor.name === 'PhysicsSystem' && duration > 5) {
                logger.warn(`PhysicsSystem update took ${duration.toFixed(2)}ms`);
            }
        }
    }

    // Update all active rooms
    updateRooms(deltaTime) {
        this.rooms.forEach(room => {
            if (room.status === 'playing') {
                try {
                    room.update(deltaTime);
                } catch (error) {
                    logger.error(`Error updating room ${room.roomCode}:`, error);
                }
            }
        });
    }

    // Record performance statistics
    recordTickStats(tickDuration) {
        this.stats.tickTimes.push(tickDuration);
        
        // Keep only the last 100 samples
        if (this.stats.tickTimes.length > 100) {
            this.stats.tickTimes.shift();
        }
        
        // Calculate average tick rate every second
        if (this.tickNumber % this.tickRate === 0) {
            const avgTickTime = this.stats.tickTimes.reduce((sum, t) => sum + t, 0) / 
                              this.stats.tickTimes.length;
            this.stats.tickRate = 1000 / avgTickTime;
            
            // Log if we're falling behind
            if (avgTickTime > this.tickLengthMs * 1.2) {
                logger.warn(`Tick overload! Avg: ${avgTickTime.toFixed(2)}ms ` +
                          `(Target: ${this.tickLengthMs.toFixed(2)}ms)`);
            }
        }
    }

    // Get current tick information
    getTickInfo() {
        return {
            tickNumber: this.tickNumber,
            tickRate: this.stats.tickRate,
            tickLengthMs: this.tickLengthMs,
            timeMs: this.lastTickTime,
            performance: {
                avgTickTime: this.stats.tickTimes.length > 0 ? 
                    this.stats.tickTimes.reduce((sum, t) => sum + t, 0) / 
                    this.stats.tickTimes.length : 0,
                maxTickTime: this.stats.tickTimes.length > 0 ? 
                    Math.max(...this.stats.tickTimes) : 0
            }
        };
    }

    // Adjust tick rate dynamically (e.g., for slow-mo or debugging)
    setTickRate(newRate) {
        if (newRate >= 1 && newRate <= 120) {
            this.tickRate = newRate;
            this.tickLengthMs = 1000 / newRate;
            logger.info(`Tick rate changed to ${newRate}Hz`);
            return true;
        }
        return false;
    }

    // Get estimated server time (synced with game ticks)
    getServerTime() {
        return {
            serverTime: Date.now(),
            tickTime: this.lastTickTime,
            tickNumber: this.tickNumber
        };
    }
}

module.exports = TickManager;