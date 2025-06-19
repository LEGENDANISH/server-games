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
exports.KillFeedEntry = void 0;
// KillFeed.ts - Placeholder for KillFeed logic
const schema_1 = require("@colyseus/schema");
class KillFeedEntry extends schema_1.Schema {
    constructor(killerName, victimName, weapon) {
        super();
        this.killerName = killerName;
        this.victimName = victimName;
        this.weapon = weapon;
        this.timestamp = Date.now();
    }
}
exports.KillFeedEntry = KillFeedEntry;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], KillFeedEntry.prototype, "killerName", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], KillFeedEntry.prototype, "victimName", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], KillFeedEntry.prototype, "weapon", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], KillFeedEntry.prototype, "timestamp", void 0);
