"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMessage = exports.ClientMessage = void 0;
// MessageTypes.ts - Placeholder for MessageTypes logic
var ClientMessage;
(function (ClientMessage) {
    ClientMessage["PlayerInput"] = "player_input";
    ClientMessage["PlayerAction"] = "player_action";
    ClientMessage["ChatMessage"] = "chat_message";
})(ClientMessage || (exports.ClientMessage = ClientMessage = {}));
var ServerMessage;
(function (ServerMessage) {
    ServerMessage["GameStateUpdate"] = "game_state_update";
    ServerMessage["PlayerJoined"] = "player_joined";
    ServerMessage["PlayerLeft"] = "player_left";
    ServerMessage["KillFeedUpdate"] = "kill_feed_update";
    ServerMessage["MatchEnded"] = "match_ended";
})(ServerMessage || (exports.ServerMessage = ServerMessage = {}));
