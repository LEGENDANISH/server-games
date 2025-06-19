"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LagCompensationSystem = void 0;
class LagCompensationSystem {
    constructor(state) {
        this.playerInputs = new Map();
        this.state = state;
    }
    rewindAndExecute(sessionId, rewindTime, callback) {
        const player = this.state.players.get(sessionId);
        if (!player)
            return;
        // Save current state
        const originalState = {
            x: player.x,
            y: player.y,
            rotation: player.rotation
        };
        // Rewind state
        const inputs = this.playerInputs.get(sessionId) || [];
        const rewindInputs = inputs.filter(input => input.timestamp >= Date.now() - rewindTime);
        // Replay inputs
        rewindInputs.forEach(input => {
            player.x = input.x;
            player.y = input.y;
            player.rotation = input.rotation;
        });
        // Execute the callback (usually hit detection)
        callback();
        // Restore state
        player.x = originalState.x;
        player.y = originalState.y;
        player.rotation = originalState.rotation;
    }
    storeInput(sessionId, input) {
        if (!this.playerInputs.has(sessionId)) {
            this.playerInputs.set(sessionId, []);
        }
        this.playerInputs.get(sessionId).push({
            ...input,
            timestamp: Date.now()
        });
    }
}
exports.LagCompensationSystem = LagCompensationSystem;
