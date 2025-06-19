"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = void 0;
// GameState.ts - Placeholder for GameState logic
const schema_1 = require("@colyseus/schema");
const Player_1 = require("./Player");
const KillFeed_1 = require("./KillFeed");
const Timer_1 = require("./Timer");
class GameState extends schema_1.Schema {
    constructor(roomSize) {
        super();
        this.players = new schema_1.MapSchema();
        this.killFeed = new schema_1.ArraySchema();
        this.timer = new Timer_1.Timer();
        this.matchStatus = "waiting";
        this.roomSize = roomSize;
    }
}
exports.GameState = GameState;
__decorate([
    (0, schema_1.type)({ map: Player_1.Player }),
    __metadata("design:type", Object)
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)([KillFeed_1.KillFeedEntry]),
    __metadata("design:type", Object)
], GameState.prototype, "killFeed", void 0);
__decorate([
    (0, schema_1.type)(Timer_1.Timer),
    __metadata("design:type", Object)
], GameState.prototype, "timer", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "matchStatus", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "roomSize", void 0);
