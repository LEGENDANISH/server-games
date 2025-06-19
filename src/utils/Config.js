module.exports = {
    PORT: process.env.PORT || 3000,
    MAX_SMALL_ROOM_PLAYERS: 10,
    MAX_GAME_ROOM_PLAYERS: 50,
    ROOM_CODE_LENGTH: 4,
    TICK_RATE: 30, // 30 ticks per second
    LOG_LEVEL: 'debug', // 'error', 'warn', 'info', 'debug'
    USE_RATE_LIMITING: true,
    RATE_LIMIT_WINDOW: 60, // seconds
    RATE_LIMIT_MAX: 100, // max requests per window
};