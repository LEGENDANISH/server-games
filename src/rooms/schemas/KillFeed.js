const Logger = require('../../utils/Logger');
const logger = new Logger('KillFeed');

class KillFeed {
    constructor() {
        this.events = [];
        this.maxEvents = 10;
    }

    addEvent(killer, victim, weapon) {
        const event = {
            killer,
            victim,
            weapon,
            timestamp: Date.now()
        };

        this.events.unshift(event); // Add to beginning of array
        
        // Keep only the most recent events
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }

        logger.info(`Kill event: ${killer} killed ${victim} with ${weapon}`);
    }

    serialize() {
        return this.events;
    }
}

module.exports = KillFeed;