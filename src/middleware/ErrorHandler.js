const Logger = require('../utils/Logger');
const logger = new Logger('ErrorHandler');

module.exports = {
    handleError: function(ws, error) {
        logger.error(`WebSocket error: ${error.message}`);
        
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    }
};