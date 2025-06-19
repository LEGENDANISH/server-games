class TickSystem {
    constructor() {
        this.tickRate = 30; // ticks per second
        this.tickLengthMs = 1000 / this.tickRate;
        this.tick = 0;
        this.lastTickTime = Date.now();
        this.simulationTime = 0;
        this.timeAccumulator = 0;
        this.tickHandlers = [];
        this.snapshotHistory = [];
        this.maxSnapshotHistory = 1024;
    }

    // Start the tick loop
    start() {
        this.lastTickTime = Date.now();
        this.tickLoop();
    }

    // Main game loop
    tickLoop() {
        const now = Date.now();
        const deltaTime = now - this.lastTickTime;
        this.lastTickTime = now;
        this.timeAccumulator += deltaTime;

        // Fixed timestep update
        while (this.timeAccumulator >= this.tickLengthMs) {
            this.simulationTime += this.tickLengthMs;
            this.timeAccumulator -= this.tickLengthMs;
            this.processTick();
            this.tick++;
        }

        // Schedule next tick
        setTimeout(() => this.tickLoop(), 0);
    }

    // Process a single game tick
    processTick() {
        // Store snapshot of current game state
        this.storeSnapshot();

        // Execute all registered tick handlers
        this.tickHandlers.forEach(handler => {
            handler(this.tick, this.tickLengthMs, this.simulationTime);
        });
    }

    // Register a tick handler
    registerTickHandler(handler) {
        this.tickHandlers.push(handler);
    }

    // Store game state snapshot
    storeSnapshot() {
        const snapshot = {
            tick: this.tick,
            time: this.simulationTime,
            state: this.getCurrentGameState(), // Implement game-specific state capture
            timestamp: Date.now()
        };

        this.snapshotHistory.push(snapshot);

        // Maintain history size
        if (this.snapshotHistory.length > this.maxSnapshotHistory) {
            this.snapshotHistory.shift();
        }
    }

    // Get snapshot by tick number
    getSnapshotByTick(tick) {
        return this.snapshotHistory.find(snap => snap.tick === tick);
    }

    // Get snapshot closest to a specific time
    getSnapshotByTime(time) {
        for (let i = this.snapshotHistory.length - 1; i >= 0; i--) {
            if (this.snapshotHistory[i].time <= time) {
                return this.snapshotHistory[i];
            }
        }
        return null;
    }

    // Game-specific method to capture current state
    getCurrentGameState() {
        // This should return a serializable object representing the complete game state
        return {
            // Example structure:
            players: [], // Array of player states
            entities: [], // Array of game entities
            time: this.simulationTime
        };
    }

    // Get current tick information
    getCurrentTickInfo() {
        return {
            tick: this.tick,
            time: this.simulationTime,
            tickRate: this.tickRate
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TickSystem;
}