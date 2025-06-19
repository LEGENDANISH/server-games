class ValidationSystem {
    constructor(tickSystem) {
        this.tickSystem = tickSystem;
        this.inputHistory = new Map(); // Player ID -> Input[]
        this.maxInputHistory = 120; // Keep last 120 inputs (~4 seconds at 30Hz)
        this.inputValidationRules = [];
    }

    // Register a new input validation rule
    registerValidationRule(rule) {
        this.inputValidationRules.push(rule);
    }

    // Store player input
    recordInput(playerId, input) {
        if (!this.inputHistory.has(playerId)) {
            this.inputHistory.set(playerId, []);
        }

        const history = this.inputHistory.get(playerId);
        input.receivedTime = Date.now();
        input.processed = false;
        history.push(input);

        // Trim history
        if (history.length > this.maxInputHistory) {
            history.shift();
        }
    }

    // Validate a single input
    validateInput(playerId, input) {
        const playerState = this.getPlayerState(playerId);
        const currentTick = this.tickSystem.getCurrentTickInfo();

        // Apply all validation rules
        for (const rule of this.inputValidationRules) {
            const result = rule.validate(input, playerState, currentTick);
            if (!result.valid) {
                return {
                    valid: false,
                    reason: result.reason || 'invalid_input',
                    details: result.details
                };
            }
        }

        return { valid: true };
    }

    // Validate and process a batch of inputs
    processInputs(playerId, inputs) {
        const results = [];
        const validInputs = [];

        for (const input of inputs) {
            const validation = this.validateInput(playerId, input);
            if (validation.valid) {
                validInputs.push(input);
                results.push({ inputId: input.id, valid: true });
            } else {
                results.push({
                    inputId: input.id,
                    valid: false,
                    reason: validation.reason,
                    details: validation.details
                });
            }
        }

        return {
            processed: validInputs,
            results,
            tick: this.tickSystem.getCurrentTickInfo().tick
        };
    }

    // Get player's current state
    getPlayerState(playerId) {
        // In a real implementation, this would get from your game state
        const snapshot = this.tickSystem.getSnapshotByTick(this.tickSystem.tick - 1);
        return snapshot?.state.players.find(p => p.id === playerId) || null;
    }

    // Get player's input history
    getInputHistory(playerId, count = 10) {
        if (!this.inputHistory.has(playerId)) {
            return [];
        }
        const history = this.inputHistory.get(playerId);
        return history.slice(-count);
    }

    // Built-in validation rules
    static get DefaultValidationRules() {
        return {
            // Check for impossible movement
            movementSpeed: {
                validate: (input, state, tickInfo) => {
                    if (!input.moveX && !input.moveY) return { valid: true };
                    
                    const maxSpeed = 10; // units per second
                    const maxDistance = (maxSpeed * tickInfo.tickLengthMs) / 1000;
                    
                    const dx = Math.abs(input.moveX || 0);
                    const dy = Math.abs(input.moveY || 0);
                    
                    if (dx > maxDistance || dy > maxDistance) {
                        return {
                            valid: false,
                            reason: 'movement_too_fast',
                            details: {
                                maxAllowed: maxDistance,
                                actual: { x: dx, y: dy }
                            }
                        };
                    }
                    return { valid: true };
                }
            },
            
            // Check for rapid fire
            fireRate: {
                validate: (input, state, tickInfo) => {
                    if (!input.fire) return { valid: true };
                    
                    const minFireInterval = 300; // ms
                    const history = this.getInputHistory(input.playerId);
                    const lastFire = history.reverse().find(i => i.fire);
                    
                    if (lastFire && (input.timestamp - lastFire.timestamp) < minFireInterval) {
                        return {
                            valid: false,
                            reason: 'fire_rate_too_high',
                            details: {
                                minInterval: minFireInterval,
                                actualInterval: input.timestamp - lastFire.timestamp
                            }
                        };
                    }
                    return { valid: true };
                }
            },
            
            // Check for sequence validity
            sequence: {
                validate: (input, state, tickInfo) => {
                    if (input.sequence === undefined) return { valid: true };
                    
                    const history = this.getInputHistory(input.playerId);
                    if (history.length === 0) return { valid: true };
                    
                    const lastInput = history[history.length - 1];
                    if (lastInput.sequence !== undefined && input.sequence <= lastInput.sequence) {
                        return {
                            valid: false,
                            reason: 'invalid_sequence',
                            details: {
                                lastSequence: lastInput.sequence,
                                currentSequence: input.sequence
                            }
                        };
                    }
                    return { valid: true };
                }
            }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationSystem;
}