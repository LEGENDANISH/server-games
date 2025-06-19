const Logger = require('../utils/Logger');
const logger = new Logger('CombatSystem');

class CombatSystem {
    constructor() {
        this.attackRange = 10;
        this.attackDamage = 10;
    }

    attack(attacker, target) {
        const distance = Math.sqrt(
            Math.pow(attacker.position.x - target.position.x, 2) +
            Math.pow(attacker.position.y - target.position.y, 2)
        );
        
        if (distance <= this.attackRange) {
            target.health -= this.attackDamage;
            if (target.health <= 0) {
                target.health = 0;
                return 'killed';
            }
            return 'hit';
        }
        return 'missed';
    }
}

module.exports = CombatSystem;