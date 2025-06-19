"use strict";
// InterpolationSystem.ts - Placeholder for InterpolationSystem logic
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterpolationSystem = void 0;
class InterpolationSystem {
    constructor(state) {
        this.snapshotBuffer = new Map();
        this.state = state;
    }
    update(deltaTime) {
        // For each player, interpolate between previous and current state
        this.state.players.forEach((player, sessionId) => {
            if (!this.snapshotBuffer.has(sessionId)) {
                this.snapshotBuffer.set(sessionId, []);
            }
            const buffer = this.snapshotBuffer.get(sessionId);
            // Store current state in buffer
            buffer.push({
                x: player.x,
                y: player.y,
                rotation: player.rotation,
                timestamp: Date.now()
            });
            // Keep only last 2 snapshots
            if (buffer.length > 2) {
                buffer.shift();
            }
            // If we have enough data, interpolate
            if (buffer.length === 2) {
                const [prev, current] = buffer;
                const alpha = deltaTime / (current.timestamp - prev.timestamp);
                // Apply interpolation
                player.x = prev.x + (current.x - prev.x) * alpha;
                player.y = prev.y + (current.y - prev.y) * alpha;
                player.rotation = prev.rotation + (current.rotation - prev.rotation) * alpha;
            }
        });
    }
}
exports.InterpolationSystem = InterpolationSystem;
