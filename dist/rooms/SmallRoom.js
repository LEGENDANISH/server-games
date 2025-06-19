"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmallRoom = void 0;
const colyseus_1 = require("colyseus");
const GameState_1 = require("./schemas/GameState");
const Player_1 = require("./schemas/Player");
const TickSystem_1 = require("../systems/TickSystem");
const CombatSystem_1 = require("../systems/CombatSystem");
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // e.g. 1234
}
class SmallRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.fixedTimeStep = 1000 / 60;
        this.roomCode = "0000";
    }
    resetRoom() {
        console.log("[Room Reset] Resetting room state and systems.");
        this.setState(new GameState_1.GameState(this.maxClients));
        this.tickSystem = new TickSystem_1.TickSystem(this.state, this.fixedTimeStep);
        this.combatSystem = new CombatSystem_1.CombatSystem(this.state);
        this.clock.clear();
        this.clock.setInterval(() => {
            this.state.timer.remainingTime--;
            console.log(`[Timer] Remaining Time: ${this.state.timer.remainingTime}`);
            if (this.state.timer.remainingTime <= 0) {
                this.state.matchStatus = "finished";
                this.clock.clear();
                console.log("[Match] Finished.");
            }
        }, 1000);
    }
    onCreate(options) {
        this.roomCode = options.roomCode || generateRoomCode();
        this.maxClients = options.maxClients || 4;
        console.log(`[Room Created] Code: ${this.roomCode}, Max Clients: ${this.maxClients}`);
        this.setState(new GameState_1.GameState(this.maxClients));
        this.tickSystem = new TickSystem_1.TickSystem(this.state, this.fixedTimeStep);
        this.combatSystem = new CombatSystem_1.CombatSystem(this.state);
        this.onMessage("reset_room", (client) => {
            console.log(`[Admin Action] ${client.sessionId} requested room reset.`);
            this.resetRoom();
        });
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
        try {
            const player = new Player_1.Player(client.sessionId, options.name || "Anonymous");
            this.state.players.set(client.sessionId, player);
            console.log(`[Join] Player joined: ${player.name} (${client.sessionId})`);
            if (this.state.players.size >= this.maxClients) {
                this.state.matchStatus = "playing";
            }
        }
        catch (error) {
            console.error(`[Join Error] ${error.message}`);
        }
    }
    onLeave(client, consented) {
        const id = client.sessionId;
        if (this.state.players.has(id)) {
            this.state.players.delete(id);
            console.log(`[Leave] Removed player ${id}`);
        }
        else {
            console.warn(`[Leave] Tried to remove non-existing player: ${id}`);
        }
    }
    update(deltaTime) {
        this.tickSystem.update(deltaTime);
        this.combatSystem.update(deltaTime);
    }
}
exports.SmallRoom = SmallRoom;
