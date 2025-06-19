"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputHandler = void 0;
class InputHandler {
    constructor(validationSystem) {
        this.validationSystem = validationSystem;
    }
    processInput(sessionId, input) {
        if (!this.validationSystem.validateInput(sessionId, input)) {
            return false;
        }
        // Process valid input
        return true;
    }
}
exports.InputHandler = InputHandler;
