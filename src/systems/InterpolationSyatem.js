const Logger = require('../utils/Logger');
const logger = new Logger('InterpolationSystem');

class InterpolationSystem {
    constructor() {
        this.bufferSize = 3; // Number of states to buffer
        this.stateBuffer = new Map(); // Map<entityId, state[]>
        this.interpolationDelay = 100; // Milliseconds to wait before rendering
        this.lastUpdateTime = 0;
    }

    addState(newState, timestamp) {
        this.lastUpdateTime = timestamp || Date.now();
        
        // Process each entity in the new state
        for (const entityId in newState.entities) {
            if (!this.stateBuffer.has(entityId)) {
                this.stateBuffer.set(entityId, []);
            }

            const buffer = this.stateBuffer.get(entityId);
            buffer.push({
                ...newState.entities[entityId],
                timestamp: this.lastUpdateTime
            });

            // Maintain buffer size
            if (buffer.length > this.bufferSize) {
                buffer.shift();
            }
        }
    }

    getInterpolatedState(currentTime = Date.now()) {
        const renderTime = currentTime - this.interpolationDelay;
        const interpolatedState = { entities: {} };

        this.stateBuffer.forEach((states, entityId) => {
            if (states.length < 2) {
                // Not enough data to interpolate, use latest state
                interpolatedState.entities[entityId] = states[states.length - 1];
                return;
            }

            // Find the two states to interpolate between
            let prevState = states[0];
            let nextState = states[1];

            for (let i = 1; i < states.length; i++) {
                if (states[i].timestamp > renderTime) {
                    nextState = states[i];
                    prevState = states[i - 1];
                    break;
                }
            }

            // Calculate interpolation factor (0 to 1)
            const timeDiff = nextState.timestamp - prevState.timestamp;
            const factor = timeDiff > 0 
                ? (renderTime - prevState.timestamp) / timeDiff
                : 0;

            // Interpolate each property
            interpolatedState.entities[entityId] = {
                id: entityId,
                position: this.interpolateVector(
                    prevState.position,
                    nextState.position,
                    factor
                ),
                rotation: this.interpolateAngle(
                    prevState.rotation,
                    nextState.rotation,
                    factor
                ),
                // Add other interpolated properties as needed
                health: nextState.health, // Don't interpolate health
                state: nextState.state    // Don't interpolate discrete states
            };
        });

        return interpolatedState;
    }

    interpolateVector(prev, next, factor) {
        return {
            x: prev.x + (next.x - prev.x) * factor,
            y: prev.y + (next.y - prev.y) * factor,
            z: prev.z ? prev.z + (next.z - prev.z) * factor : 0
        };
    }

    interpolateAngle(prev, next, factor) {
        // Handle angle wrapping (e.g., from 350° to 10°)
        let difference = next - prev;
        if (difference > Math.PI) {
            difference -= 2 * Math.PI;
        } else if (difference < -Math.PI) {
            difference += 2 * Math.PI;
        }
        return prev + difference * factor;
    }

    clearBuffer() {
        this.stateBuffer.clear();
    }

    setInterpolationDelay(delay) {
        this.interpolationDelay = Math.max(50, Math.min(delay, 300)); // Clamp between 50-300ms
    }

    adjustForNetworkConditions(latency, jitter) {
        // Dynamically adjust interpolation based on network conditions
        const newDelay = latency + jitter * 2;
        this.setInterpolationDelay(newDelay);
        logger.debug(`Adjusted interpolation delay to ${newDelay}ms`);
    }
}

module.exports = InterpolationSystem;