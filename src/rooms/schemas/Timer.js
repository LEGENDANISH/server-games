const Logger = require('../../utils/Logger');
const logger = new Logger('Timer');

class Timer {
    constructor(duration, onComplete) {
        this.duration = duration;
        this.timeRemaining = duration;
        this.isRunning = false;
        this.onComplete = onComplete || (() => {});
        this.callbacks = [];
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.endTime = this.startTime + this.timeRemaining;
        
        this.interval = setInterval(() => {
            this.timeRemaining = this.endTime - Date.now();
            
            if (this.timeRemaining <= 0) {
                this.stop();
                this.onComplete();
                this.callbacks.forEach(cb => cb());
            }
        }, 100);
    }

    stop() {
        if (!this.isRunning) return;
        
        clearInterval(this.interval);
        this.isRunning = false;
    }

    reset() {
        this.stop();
        this.timeRemaining = this.duration;
    }

    addCallback(callback) {
        this.callbacks.push(callback);
    }

    getTimeFormatted() {
        const seconds = Math.ceil(this.timeRemaining / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
}

module.exports = Timer;