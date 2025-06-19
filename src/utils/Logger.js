const { LOG_LEVEL } = require('./Config');

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    constructor(name) {
        this.name = name;
        this.level = levels[LOG_LEVEL] || levels.info;
    }

    log(level, message, ...args) {
        if (levels[level] <= this.level) {
            console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.name}] ${message}`, ...args);
        }
    }

    error(message, ...args) { this.log('error', message, ...args); }
    warn(message, ...args) { this.log('warn', message, ...args); }
    info(message, ...args) { this.log('info', message, ...args); }
    debug(message, ...args) { this.log('debug', message, ...args); }
}

module.exports = Logger;