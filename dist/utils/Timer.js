"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameTimer = void 0;
// Timer.ts - Placeholder for Timer logic
class GameTimer {
    constructor(duration, callback) {
        this.interval = null;
        this.duration = duration;
        this.remaining = duration;
        this.callback = callback;
    }
    start() {
        if (this.interval)
            return;
        this.interval = setInterval(() => {
            this.remaining--;
            if (this.remaining <= 0) {
                this.stop();
                this.callback();
            }
        }, 1000);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    reset() {
        this.stop();
        this.remaining = this.duration;
    }
    getRemainingTime() {
        return this.remaining;
    }
}
exports.GameTimer = GameTimer;
