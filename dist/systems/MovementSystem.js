"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementSystem = void 0;
class MovementSystem {
    constructor(state) {
        this.state = state;
    }
    update(deltaTime) {
        this.state.players.forEach((player) => {
            if (!player.isAlive)
                return;
            // Apply physics, friction, etc.
            // This would be more complex in a real game
        });
    }
}
exports.MovementSystem = MovementSystem;
