"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// app.ts - Placeholder for app logic
const colyseus_1 = require("colyseus");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const GameRoom_1 = require("./rooms/GameRoom");
const SmallRoom_1 = require("./rooms/SmallRoom");
const AuthMiddleware_1 = require("./middleware/AuthMiddleware");
const RateLimiter_1 = require("./middleware/RateLimiter");
const ErrorHandler_1 = require("./middleware/ErrorHandler");
const Logger_1 = require("./utils/Logger");
const Config_1 = require("./utils/Config");
const monitor_1 = require("@colyseus/monitor");
// Load configuration
(0, Config_1.loadConfig)();
const app = (0, express_1.default)();
const port = Number(process.env.PORT) || 2567;
// Middleware
app.use(express_1.default.json());
app.use(RateLimiter_1.rateLimiter);
app.use(AuthMiddleware_1.authMiddleware);
// Create HTTP & Colyseus server
const httpServer = (0, http_1.createServer)(app);
const gameServer = new colyseus_1.Server({ server: httpServer, pingInterval: 0 });
// Register rooms
gameServer.define("game_room", GameRoom_1.GameRoom);
gameServer.define("small_room", SmallRoom_1.SmallRoom);
// Add Colyseus monitor
app.use("/colyseus", (0, monitor_1.monitor)());
// Error handling
app.use(ErrorHandler_1.errorHandler);
// Start server
gameServer.listen(port).then(() => {
    const url = `http://localhost:${port}`;
    Logger_1.logger.info(`✅ Colyseus server is running at ${url}`);
    Logger_1.logger.info(`📊 Monitor dashboard: ${url}/colyseus`);
    console.log(`✅ Colyseus server is running at ${url}`);
    console.log(`📊 Monitor dashboard: ${url}/colyseus`);
}).catch(err => {
    Logger_1.logger.error(`❌ Error starting server: ${err.message}`);
    console.error(`❌ Error starting server: ${err.message}`);
    process.exit(1);
});
