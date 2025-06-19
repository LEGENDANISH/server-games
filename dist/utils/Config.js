"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
// Config.ts - Placeholder for Config logic
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
let config;
function loadConfig(env = process.env.NODE_ENV || "development") {
    const configPath = path_1.default.join(__dirname, `../../config/${env}.json`);
    if (!(0, fs_1.existsSync)(configPath)) {
        throw new Error(`Config file not found for environment: ${env}`);
    }
    config = JSON.parse((0, fs_1.readFileSync)(configPath, "utf8"));
    return config;
}
function getConfig() {
    if (!config) {
        return loadConfig();
    }
    return config;
}
