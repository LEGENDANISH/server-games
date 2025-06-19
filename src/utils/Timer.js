class Timer {
    constructor() {
        this.timers = new Map();
        this.idCounter = 0;
        this.paused = false;
        this.timeScale = 1.0;
        this.lastUpdateTime = performance.now();
    }

    /**
     * Update all active timers
     * Should be called from your game loop
     */
    update() {
        if (this.paused) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastUpdateTime) * this.timeScale;
        this.lastUpdateTime = currentTime;

        for (const [id, timer] of this.timers) {
            if (timer.paused) continue;

            timer.elapsed += deltaTime;

            // Handle interval timers
            if (timer.type === 'interval' && timer.elapsed >= timer.interval) {
                const cycles = Math.floor(timer.elapsed / timer.interval);
                timer.elapsed %= timer.interval;
                
                for (let i = 0; i < cycles; i++) {
                    timer.callback(timer.data);
                    if (timer.limit > 0 && ++timer.executionCount >= timer.limit) {
                        this.remove(id);
                        break;
                    }
                }
            }
            // Handle timeout timers
            else if (timer.type === 'timeout' && timer.elapsed >= timer.delay) {
                timer.callback(timer.data);
                this.remove(id);
            }
            // Handle stopwatch timers
            else if (timer.type === 'stopwatch') {
                timer.callback({
                    elapsed: timer.elapsed,
                    data: timer.data
                });
            }
            // Handle countdown timers
            else if (timer.type === 'countdown') {
                const remaining = Math.max(0, timer.duration - timer.elapsed);
                timer.callback({
                    elapsed: timer.elapsed,
                    remaining: remaining,
                    progress: timer.elapsed / timer.duration,
                    data: timer.data
                });

                if (timer.elapsed >= timer.duration) {
                    if (timer.loop) {
                        timer.elapsed = 0;
                    } else {
                        this.remove(id);
                    }
                }
            }
        }
    }

    /**
     * Set a timeout
     * @param {function} callback - Function to call when timer completes
     * @param {number} delay - Delay in milliseconds
     * @param {*} [data] - Optional data to pass to callback
     * @returns {number} Timer ID
     */
    setTimeout(callback, delay, data) {
        return this.addTimer({
            type: 'timeout',
            callback,
            delay,
            data
        });
    }

    /**
     * Set an interval
     * @param {function} callback - Function to call at each interval
     * @param {number} interval - Interval in milliseconds
     * @param {*} [data] - Optional data to pass to callback
     * @param {number} [limit] - Optional limit to number of executions
     * @returns {number} Timer ID
     */
    setInterval(callback, interval, data, limit = 0) {
        return this.addTimer({
            type: 'interval',
            callback,
            interval,
            data,
            limit
        });
    }

    /**
     * Start a countdown timer
     * @param {function} callback - Function to call each update with progress
     * @param {number} duration - Total duration in milliseconds
     * @param {*} [data] - Optional data to pass to callback
     * @param {boolean} [loop=false] - Whether to loop the countdown
     * @returns {number} Timer ID
     */
    startCountdown(callback, duration, data, loop = false) {
        return this.addTimer({
            type: 'countdown',
            callback,
            duration,
            data,
            loop
        });
    }

    /**
     * Start a stopwatch
     * @param {function} callback - Function to call each update with elapsed time
     * @param {*} [data] - Optional data to pass to callback
     * @returns {number} Timer ID
     */
    startStopwatch(callback, data) {
        return this.addTimer({
            type: 'stopwatch',
            callback,
            data
        });
    }

    /**
     * Add a new timer
     * @private
     */
    addTimer(config) {
        const id = ++this.idCounter;
        this.timers.set(id, {
            ...config,
            id,
            elapsed: 0,
            executionCount: 0,
            paused: false
        });
        return id;
    }

    /**
     * Remove a timer
     * @param {number} id - Timer ID to remove
     */
    remove(id) {
        this.timers.delete(id);
    }

    /**
     * Pause a specific timer
     * @param {number} id - Timer ID to pause
     */
    pauseTimer(id) {
        const timer = this.timers.get(id);
        if (timer) timer.paused = true;
    }

    /**
     * Resume a specific timer
     * @param {number} id - Timer ID to resume
     */
    resumeTimer(id) {
        const timer = this.timers.get(id);
        if (timer) timer.paused = false;
    }

    /**
     * Check if a timer exists
     * @param {number} id - Timer ID to check
     * @returns {boolean}
     */
    has(id) {
        return this.timers.has(id);
    }

    /**
     * Pause all timers
     */
    pauseAll() {
        this.paused = true;
    }

    /**
     * Resume all timers
     */
    resumeAll() {
        this.paused = false;
        this.lastUpdateTime = performance.now();
    }

    /**
     * Set time scale (for slow motion effects)
     * @param {number} scale - Time scale (1.0 = normal)
     */
    setTimeScale(scale) {
        this.timeScale = scale;
    }

    /**
     * Clear all timers
     */
    clear() {
        this.timers.clear();
    }

    /**
     * Get remaining time for a countdown or timeout
     * @param {number} id - Timer ID
     * @returns {number} Remaining time in milliseconds
     */
    getRemainingTime(id) {
        const timer = this.timers.get(id);
        if (!timer) return 0;

        if (timer.type === 'countdown' || timer.type === 'timeout') {
            return Math.max(0, (timer.delay || timer.duration) - timer.elapsed);
        }
        return 0;
    }

    /**
     * Get elapsed time for any timer
     * @param {number} id - Timer ID
     * @returns {number} Elapsed time in milliseconds
     */
    getElapsedTime(id) {
        const timer = this.timers.get(id);
        return timer ? timer.elapsed : 0;
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timer;
}