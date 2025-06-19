class LagCompensationSystem {
    constructor() {
        // Configuration
        this.snapshotHistorySize = 1024; // How many snapshots to keep
        this.maxRewindTime = 1000; // Max rewind time in ms (1 second)
        
        // State
        this.snapshotHistory = [];
        this.clientPredictionId = 0;
        this.pendingInputs = [];
        this.lastProcessedInput = -1;
    }

    // Called when receiving a new server snapshot
    addSnapshot(snapshot) {
        // Add timestamp if not present
        if (!snapshot.timestamp) {
            snapshot.timestamp = Date.now();
        }
        
        // Add to history
        this.snapshotHistory.push(snapshot);
        
        // Trim history if too large
        if (this.snapshotHistory.length > this.snapshotHistorySize) {
            this.snapshotHistory.shift();
        }
        
        // Reconcile client predictions with server state
        this.reconcile(snapshot);
    }

    // Client-side prediction - called when local player inputs are generated
    predictInput(input) {
        // Assign a unique ID to this input
        input.predictionId = this.clientPredictionId++;
        input.timestamp = Date.now();
        
        // Store for later reconciliation
        this.pendingInputs.push(input);
        
        // Return the input with prediction data
        return input;
    }

    // Reconcile client predictions with server state
    reconcile(serverSnapshot) {
        if (!serverSnapshot.processedInputs) {
            return; // No reconciliation needed
        }
        
        // Find the last processed input ID from the server
        const lastServerProcessed = Math.max(...serverSnapshot.processedInputs);
        
        // Remove all inputs that have been processed by the server
        this.pendingInputs = this.pendingInputs.filter(input => {
            return input.predictionId > lastServerProcessed;
        });
        
        // If our local state differs from server, we need to re-simulate
        if (this.lastProcessedInput !== lastServerProcessed) {
            this.rewindAndReplay(serverSnapshot);
        }
        
        this.lastProcessedInput = lastServerProcessed;
    }

    // Rewind and replay inputs from corrected server state
    rewindAndReplay(serverSnapshot) {
        // Find the snapshot closest to the server's timestamp
        const rewindTime = serverSnapshot.timestamp;
        const baseSnapshot = this.findClosestSnapshot(rewindTime);
        
        if (!baseSnapshot) {
            console.warn("No suitable snapshot found for rewind");
            return;
        }
        
        // Apply all pending inputs to the base snapshot
        let correctedState = this.cloneSnapshot(baseSnapshot);
        
        this.pendingInputs.forEach(input => {
            correctedState = this.applyInput(correctedState, input);
        });
        
        // Use this corrected state as the new baseline
        this.applyCorrectedState(correctedState);
    }

    // Find the closest snapshot to a given timestamp
    findClosestSnapshot(timestamp) {
        // Don't rewind too far back
        const minTime = timestamp - this.maxRewindTime;
        
        // Find the newest snapshot that isn't newer than our target time
        for (let i = this.snapshotHistory.length - 1; i >= 0; i--) {
            const snap = this.snapshotHistory[i];
            if (snap.timestamp <= timestamp && snap.timestamp >= minTime) {
                return snap;
            }
        }
        
        return null;
    }

    // Apply an input to a game state (simplified example)
    applyInput(state, input) {
        // In a real implementation, this would apply movement, actions, etc.
        // to the game state based on the input data
        
        const newState = this.cloneSnapshot(state);
        
        // Example: apply movement to player
        if (input.moveX || input.moveY) {
            const player = newState.players.find(p => p.id === input.playerId);
            if (player) {
                player.x += input.moveX || 0;
                player.y += input.moveY || 0;
                player.timestamp = input.timestamp;
            }
        }
        
        // Example: handle shooting
        if (input.fire) {
            // Create projectile in the state
            // ...
        }
        
        return newState;
    }

    // Apply a corrected state to the game
    applyCorrectedState(correctedState) {
        // In a real game, this would update your game world to match the corrected state
        // This might involve interpolating positions to make the correction smooth
        
        console.log("Applying corrected game state", correctedState);
    }

    // Helper to clone a snapshot (real implementation would be game-specific)
    cloneSnapshot(snapshot) {
        return JSON.parse(JSON.stringify(snapshot));
    }

    // Server-side lag compensation - rewind time for hit detection
    rewindForHitDetection(player, hitDetectionTime) {
        // Find the player's state at the specified time in the past
        const snapshot = this.findClosestSnapshot(hitDetectionTime);
        
        if (!snapshot) {
            console.warn("No snapshot found for hit detection time", hitDetectionTime);
            return null;
        }
        
        // Find the player in the snapshot
        const rewoundPlayer = snapshot.players.find(p => p.id === player.id);
        
        if (!rewoundPlayer) {
            console.warn("Player not found in snapshot", player.id);
            return null;
        }
        
        return rewoundPlayer;
    }

    // Server-side: process a shot with lag compensation
    processShot(attackerId, shotData, currentGameTime) {
        // Calculate the time when the shot was fired (accounting for latency)
        const shotTime = currentGameTime - shotData.ping;
        
        // Rewind the game state to that time
        const snapshot = this.findClosestSnapshot(shotTime);
        
        if (!snapshot) {
            console.warn("No snapshot found for shot time", shotTime);
            return { hit: false, reason: "invalid_time" };
        }
        
        // Get the attacker's state at that time
        const attacker = snapshot.players.find(p => p.id === attackerId);
        
        if (!attacker) {
            return { hit: false, reason: "attacker_not_found" };
        }
        
        // Get the target's state at that time
        const target = snapshot.players.find(p => p.id === shotData.targetId);
        
        if (!target) {
            return { hit: false, reason: "target_not_found" };
        }
        
        // Perform hit detection using the rewound positions
        const hit = this.checkHit(attacker, target, shotData);
        
        return {
            hit,
            attackerPosition: { x: attacker.x, y: attacker.y },
            targetPosition: { x: target.x, y: target.y },
            timestamp: shotTime
        };
    }

    // Simplified hit detection
    checkHit(attacker, target, shotData) {
        // In a real game, this would use proper projectile simulation
        // and hitbox checking
        
        // Simple distance check for example
        const dx = target.x - attacker.x;
        const dy = target.y - attacker.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        return distance < shotData.weaponRange;
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LagCompensationSystem;
}