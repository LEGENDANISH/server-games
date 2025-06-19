"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateBroadcaster = void 0;
class StateBroadcaster {
    constructor(room, broadcastInterval = 100) {
        this.room = room;
        this.broadcastInterval = broadcastInterval;
    }
    start() {
        this.room.clock.setInterval(() => {
            this.broadcastState();
        }, this.broadcastInterval);
    }
    broadcastState() {
        // Colyseus automatically syncs the state, but we can optimize here
        this.room.state.players.forEach((player) => {
            // Could add custom filtering or delta compression here
        });
    }
}
exports.StateBroadcaster = StateBroadcaster;
