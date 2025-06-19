const Logger = require('../utils/Logger');
const logger = new Logger('Player');

class Player {
    constructor(id, name, team) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        this.kills = 0;
        this.deaths = 0;
        this.weapons = ['rifle'];
        this.currentWeapon = 'rifle';
        this.lastInput = {};
    }

    takeDamage(amount, attackerId) {
        if (!this.isAlive) return;

        this.health -= amount;
        
        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            this.deaths++;
            return true; // Player died
        }
        
        return false; // Player survived
    }

    respawn() {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.position = { 
            x: Math.random() * 100, 
            y: Math.random() * 100 
        };
    }

    addKill() {
        this.kills++;
    }

    applyInput(input) {
        this.lastInput = input;
        // Movement will be handled by MovementSystem
    }

    update(deltaTime) {
        // Physics update
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            position: this.position,
            health: this.health,
            isAlive: this.isAlive,
            kills: this.kills,
            deaths: this.deaths,
            currentWeapon: this.currentWeapon
        };
    }
}

module.exports = Player;