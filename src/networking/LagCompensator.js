const Logger = require('../utils/Logger');
const logger = new Logger('LagCompensator');

class LagCompensator {
    constructor() {
        this.playerSnapshots = new Map(); // playerId -> snapshot[]
        this.maxSnapshotHistory = 30; // ~1 second at 30Hz
        this.rewindLimit = 500; // Max 500ms rewind
    }

    // Record player state snapshot
    recordSnapshot(playerId, state) {
        if (!this.playerSnapshots.has(playerId)) {
            this.playerSnapshots.set(playerId, []);
        }

        const snapshots = this.playerSnapshots.get(playerId);
        snapshots.push({
            timestamp: Date.now(),
            state: this.cloneState(state)
        });

        // Maintain history size
        if (snapshots.length > this.maxSnapshotHistory) {
            snapshots.shift();
        }
    }

    // Rewind player state for lag compensation
    rewindPlayerState(playerId, rewindTime) {
        const snapshots = this.playerSnapshots.get(playerId);
        if (!snapshots || snapshots.length === 0) {
            logger.warn(`No snapshots for player ${playerId}`);
            return null;
        }

        // Clamp rewind time to limit
        const currentTime = Date.now();
        const maxRewind = currentTime - this.rewindLimit;
        const targetTime = Math.max(currentTime - rewindTime, maxRewind);

        // Find closest snapshot
        let closestSnapshot = null;
        let closestDiff = Infinity;

        for (let i = snapshots.length - 1; i >= 0; i--) {
            const diff = Math.abs(snapshots[i].timestamp - targetTime);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestSnapshot = snapshots[i];
            }
        }

        return closestSnapshot ? closestSnapshot.state : null;
    }

    // Process shot with lag compensation
    processShot(attackerId, targetId, shotData) {
        const attackerRewind = shotData.attackerPing || 0;
        const targetRewind = shotData.targetPing || 0;

        // Rewind both players to the time when the shot was fired
        const rewindTime = Math.max(attackerRewind, targetRewind);
        const attackerState = this.rewindPlayerState(attackerId, rewindTime);
        const targetState = this.rewindPlayerState(targetId, rewindTime);

        if (!attackerState || !targetState) {
            return {
                valid: false,
                reason: 'invalid_rewind_state'
            };
        }

        // Perform hit detection using rewound states
        const hitResult = this.checkHit(attackerState, targetState, shotData);

        return {
            ...hitResult,
            attackerState,
            targetState,
            rewindTime
        };
    }

    // Check if shot hits target (simplified example)
    checkHit(attacker, target, shotData) {
        // In a real game, this would use proper hitbox checking
        const dx = target.position.x - attacker.position.x;
        const dy = target.position.y - attacker.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Simple distance check
        const hit = distance < shotData.weaponRange;

        return {
            hit,
            distance,
            hitPosition: hit ? target.position : null
        };
    }

    // Clone player state for snapshot
    cloneState(state) {
        return JSON.parse(JSON.stringify(state));
    }

    // Clean up old snapshots
    cleanupPlayer(playerId) {
        this.playerSnapshots.delete(playerId);
    }
}

module.exports = LagCompensator;