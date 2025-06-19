const Logger = require('../utils/Logger');
const logger = new Logger('InputHandler');

class InputHandler {
  constructor() {
    this.rooms = null; // Will be set from main server
    this.playerRoomMap = null; // Will be set from main server
  }

  setRooms(rooms, playerRoomMap) {
    this.rooms = rooms;
    this.playerRoomMap = playerRoomMap;
  }

  handleInput(ws, message) {
    try {
      const { type, data } = message;
      
      logger.info(`[INPUT] Received message type: ${type}`, data);

      switch (type) {
        case 'createRoom':
          this.handleCreateRoom(ws, data);
          break;

        case 'joinRoom':
          this.handleJoinRoom(ws, data);
          break;

        case 'playerAction':
          this.handlePlayerAction(ws, data);
          break;

        case 'playerUpdate': // Backward compatibility
          this.handleLegacyPlayerUpdate(ws, data);
          break;

        case 'playerShoot':
          this.handlePlayerShoot(ws, data);
          break;

        case 'setReady':
          this.handleSetReady(ws, data);
          break;

        default:
          logger.warn(`[INPUT] Unknown message type: ${type}`);
          ws.send(JSON.stringify({
            type: 'ERROR',
            data: { message: `Unknown message type: ${type}` }
          }));
      }
    } catch (error) {
      logger.error('[INPUT] Error handling input:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        data: { message: 'Internal server error' }
      }));
    }
  }

  handleCreateRoom(ws, data) {
    // Since we're using a fixed LOBBY room, this might not be needed
    // But keeping for potential future use
    logger.info('[INPUT] Create room requested (using fixed LOBBY)');
    
    ws.send(JSON.stringify({
      type: 'ERROR',
      data: { message: 'Room creation not supported. Join LOBBY instead.' }
    }));
  }

  handleJoinRoom(ws, data) {
    const { roomCode } = data;
    logger.info(`[INPUT] Join room requested: ${roomCode}`);
    
    // In your current setup, players are auto-joined to LOBBY
    // This is handled in the main server file
    // So this might not be called, but keeping for completeness
  }

  handlePlayerAction(ws, data) {
    // Find which room this player is in
    const playerId = this.findPlayerIdBySocket(ws);
    if (!playerId) {
      logger.warn('[INPUT] Could not find player ID for socket');
      return;
    }

    const roomCode = this.playerRoomMap?.get(playerId);
    if (!roomCode) {
      logger.warn(`[INPUT] Could not find room for player ${playerId}`);
      return;
    }

    const room = this.rooms?.get(roomCode);
    if (!room) {
      logger.warn(`[INPUT] Room ${roomCode} not found`);
      return;
    }

    logger.info(`[INPUT] Player ${playerId} action:`, data);
    
    // Forward the action to the room
    room.handlePlayerAction(playerId, data);
  }

  handleLegacyPlayerUpdate(ws, data) {
    // Convert old playerUpdate format to new playerAction format
    logger.info('[INPUT] Converting legacy playerUpdate to playerAction');
    
    const actionData = {
      type: 'MOVE',
      data: {
        position: data.position,
        velocity: data.velocity,
        rotation: data.flipX ? Math.PI : 0,
        flipX: data.flipX
      }
    };

    this.handlePlayerAction(ws, actionData);
  }

  handlePlayerShoot(ws, data) {
    // Convert shoot data to action format
    const actionData = {
      type: 'SHOOT',
      data: data
    };

    this.handlePlayerAction(ws, actionData);
  }

  handleSetReady(ws, data) {
    const playerId = this.findPlayerIdBySocket(ws);
    if (!playerId) return;

    const roomCode = this.playerRoomMap?.get(playerId);
    if (!roomCode) return;

    const room = this.rooms?.get(roomCode);
    if (!room) return;

    room.setPlayerReady(playerId, data.ready);
  }

  findPlayerIdBySocket(ws) {
    // This is a bit tricky since we need to reverse-lookup the player ID from the socket
    // In a real implementation, you might want to store this mapping differently
    
    if (!this.rooms || !this.playerRoomMap) return null;

    // Look through all rooms to find the socket
    for (const [roomCode, room] of this.rooms) {
      for (const [playerId, socket] of room.clients) {
        if (socket === ws) {
          return playerId;
        }
      }
    }

    return null;
  }
}

module.exports = InputHandler;