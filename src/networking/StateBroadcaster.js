const Logger = require('../utils/Logger');
const logger = new Logger('StateBroadcaster');

class StateBroadcaster {
    constructor(io) {
        this.io = io; // socket.io instance
    }

    broadcast(rooms) {
        rooms.forEach(room => {
            const clients = room.getClients(); // assuming this returns array of socket IDs or sockets
            const state = room.getState();

            // If room has no clients, skip broadcasting
            if (!clients.length) return;

            // Emit state to all clients in the room
            this.io.to(room.roomCode).emit('GAME_STATE', {
                type: 'GAME_STATE',
                state
            });

            logger.debug(`Broadcasted game state for room ${room.roomCode}`);
        });
    }
}

module.exports = StateBroadcaster;