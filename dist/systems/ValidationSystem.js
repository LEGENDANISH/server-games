"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationSystem = void 0;
class ValidationSystem {
    constructor(state) {
        this.state = state;
    }
    validateInput(sessionId, input) {
        const player = this.state.players.get(sessionId);
        if (!player)
            return false;
        // Basic validation checks
        if (input.sequence <= player.lastProcessedInput) {
            return false; // Old input
        }
        // Validate movement values
        if (Math.abs(input.x) > 1 || Math.abs(input.y) > 1) {
            return false; // Impossible movement values
        }
        // More checks would be here in a real game
        return true;
    }
}
exports.ValidationSystem = ValidationSystem;
