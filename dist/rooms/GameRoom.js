"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
// GameRoom.ts - Placeholder for GameRoom logic
const colyseus_1 = require("colyseus");
const GameState_1 = require("./schemas/GameState");
const Player_1 = require("./schemas/Player");
const TickSystem_1 = require("../systems/TickSystem");
const CombatSystem_1 = require("../systems/CombatSystem");
class GameRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.fixedTimeStep = 1000 / 60; // 60Hz
    }
    onCreate(options) {
        this.maxClients = 50;
        this.setState(new GameState_1.GameState(50));
        this.tickSystem = new TickSystem_1.TickSystem(this.state, this.fixedTimeStep);
        this.combatSystem = new CombatSystem_1.CombatSystem(this.state);
        this.clock.setInterval(() => {
            this.state.timer.remainingTime--;
            if (this.state.timer.remainingTime <= 0) {
                this.state.matchStatus = "finished";
                this.clock.clear();
            }
        }, 1000);
        this.setSimulationInterval((deltaTime) => this.update(deltaTime));
        this.onMessage("player_input", (client, input) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.lastProcessedInput = input.sequence;
                this.tickSystem.processPlayerInput(client.sessionId, input);
            }
        });
    }
    onJoin(client, options) {
        const player = new Player_1.Player(client.sessionId, options.name);
        this.state.players.set(client.sessionId, player);
        if (this.state.players.size >= this.maxClients) {
            this.state.matchStatus = "playing";
        }
    }
    onLeave(client, consented) {
        this.state.players.delete(client.sessionId);
    }
    update(deltaTime) {
        this.tickSystem.update(deltaTime);
        this.combatSystem.update(deltaTime);
    }
}
exports.GameRoom = GameRoom;
