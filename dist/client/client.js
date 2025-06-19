"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Colyseus = __importStar(require("colyseus.js"));
// Connect to the server
const client = new Colyseus.Client("ws://localhost:2567");
// Join or create the room
client.joinOrCreate("small_room", { name: "Player1" }).then(room => {
    console.log("Joined room:", room.sessionId);
    // Send player input
    document.addEventListener("keydown", event => {
        room.send("player_input", {
            sequence: Date.now(),
            key: event.key
        });
    });
    // Listen for player changes
    room.state.players.onAdd = (player, sessionId) => {
        console.log("Player joined:", player.name);
    };
    room.state.players.onRemove = (player, sessionId) => {
        console.log("Player left:", sessionId);
    };
    // Optional: Monitor match status
    room.state.onChange = (changes) => {
        changes.forEach(change => {
            if (change.field === "matchStatus") {
                console.log("Match status:", change.value);
            }
        });
    };
}).catch(e => {
    console.error("Failed to join room", e);
});
