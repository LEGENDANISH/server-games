const Logger = require('../utils/Logger');
const logger = new Logger('MovementSystem');

class MovementSystem {
    constructor() {
        this.speed = 5;
    }

    update(player, input) {
        if (input.up) player.position.y -= this.speed;
        if (input.down) player.position.y += this.speed;
        if (input.left) player.position.x -= this.speed;
        if (input.right) player.position.x += this.speed;
        
        // Simple boundary checking
        player.position.x = Math.max(0, Math.min(100, player.position.x));
        player.position.y = Math.max(0, Math.min(100, player.position.y));
    }
}

module.exports = MovementSystem;