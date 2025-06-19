const Logger = require('../utils/Logger');
const logger = new Logger('PhysicsSystem');

class PhysicsSystem {
    constructor() {
        this.gravity = 0.5;
    }

    update(entity) {
        // Simple gravity implementation
        if (entity.position.y < 100) { // Ground level
            entity.velocity.y += this.gravity;
        } else {
            entity.velocity.y = 0;
            entity.position.y = 100;
        }
    }
}

module.exports = PhysicsSystem;