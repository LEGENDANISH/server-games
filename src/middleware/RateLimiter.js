const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, USE_RATE_LIMITING } = require('../utils/Config');
const Logger = require('../utils/Logger');
const logger = new Logger('RateLimiter');

const requestCounts = new Map();

setInterval(() => {
    requestCounts.clear();
}, RATE_LIMIT_WINDOW * 1000);

module.exports = {
    isRateLimited: function(req) {
        if (!USE_RATE_LIMITING) return false;
        
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const count = requestCounts.get(ip) || 0;
        
        if (count >= RATE_LIMIT_MAX) {
            logger.warn(`Rate limit exceeded for IP: ${ip}`);
            return true;
        }
        
        requestCounts.set(ip, count + 1);
        return false;
    }
};