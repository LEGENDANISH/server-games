"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickSystem = void 0;
const LagCompensator_1 = require("../networking/LagCompensator");
const InterpolationSystem_1 = require("./InterpolationSystem");
class TickSystem {
    constructor(state, tickRate) {
        this.currentTick = 0;
        this.accumulator = 0;
        this.state = state;
        this.tickRate = tickRate;
        this.lagCompensator = new LagCompensator_1.LagCompensator(state);
        this.interpolationSystem = new InterpolationSystem_1.InterpolationSystem(state);
    }
    processPlayerInput(sessionId, input) {
        // Store input for processing in the next tick
        this.lagCompensator.storeInput(sessionId, input);
    }
    update(deltaTime) {
        this.accumulator += deltaTime;
        while (this.accumulator >= this.tickRate) {
            this.currentTick++;
            this.fixedUpdate(this.tickRate);
            this.accumulator -= this.tickRate;
        }
        // Update interpolation for smoother rendering
        this.interpolationSystem.update(deltaTime);
    }
    fixedUpdate(deltaTime) {
        // Process all buffered inputs with lag compensation
        this.lagCompensator.processInputs(this.currentTick);
        // Update all player positions based on their inputs
        this.state.players.forEach((player, sessionId) => {
            if (!player.isAlive)
                return;
            // Apply movement from inputs (simplified)
            const input = this.lagCompensator.getInput(sessionId, this.currentTick);
            if (input) {
                // Apply movement, rotation, etc. based on input
                // This would be more complex in a real game
                player.x += input.x * deltaTime;
                player.y += input.y * deltaTime;
                player.rotation = input.rotation;
            }
        });
    }
}
exports.TickSystem = TickSystem;
