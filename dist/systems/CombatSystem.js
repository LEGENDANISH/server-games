"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombatSystem = void 0;
const KillFeed_1 = require("../rooms/schemas/KillFeed");
class CombatSystem {
    constructor(state) {
        this.state = state;
    }
    update(deltaTime) {
        // Check for combat interactions
        // This would be more complex with actual hit detection
    }
    playerAttack(attackerSessionId, targetSessionId, damage) {
        const attacker = this.state.players.get(attackerSessionId);
        const target = this.state.players.get(targetSessionId);
        if (!attacker || !target || !target.isAlive)
            return;
        target.health -= damage;
        if (target.health <= 0) {
            target.isAlive = false;
            target.deaths++;
            attacker.kills++;
            // Add to kill feed
            const killEntry = new KillFeed_1.KillFeedEntry(attacker.name, target.name, "weapon" // Would be dynamic in real game
            );
            // Keep kill feed to last 5 entries
            if (this.state.killFeed.length >= 5) {
                this.state.killFeed.shift();
            }
            this.state.killFeed.push(killEntry);
        }
    }
}
exports.CombatSystem = CombatSystem;
