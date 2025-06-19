const express = require('express');
const WebSocket = require('ws');
const { PORT } = require('./utils/Config');
const Logger = require('./utils/Logger');
const cors = require('cors');
const logger = new Logger('App');

const app = express();
app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () => {
    logger.info(`🚀 Server started and listening on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

const rooms = new Map(); // Will hold only one room: "LOBBY"
const playerRoomMap = new Map(); // playerId -> roomCode

const FIXED_ROOM_CODE = 'LOBBY'; // All players join this room

const ErrorHandler = require('./middleware/ErrorHandler');
const SmallRoom = require('./rooms/SmallRoom');

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info(`✅ New client connected from ${ip}`);

    let currentPlayerId = null;

    // Setup message handler BEFORE any other logic
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            logger.debug(`📨 Received message from ${currentPlayerId || 'unknown'}: ${data.type}`);
            handleClientMessage(ws, data, currentPlayerId);
        } catch (error) {
            logger.error('Error parsing message:', error);
            ErrorHandler.handleError(ws, error);
        }
    });

    // Automatically assign to the shared room
    let room = rooms.get(FIXED_ROOM_CODE);

    if (!room) {
        // Create the shared room if it doesn't exist
        const ownerId = Date.now().toString();
        room = new SmallRoom(FIXED_ROOM_CODE, ownerId, {
            maxPlayers: 8,
            gameMode: 'deathmatch'
        });
        rooms.set(FIXED_ROOM_CODE, room);

        logger.info(`🎮 Shared room "${FIXED_ROOM_CODE}" created`);
    }

    const playerName = `Player${Date.now().toString().slice(-4)}`;
    const playerId = Date.now().toString() + Math.random().toString(36).substr(2, 5);

    const success = room.addClient(ws, playerId, playerName);

    if (success) {
        currentPlayerId = playerId;
        playerRoomMap.set(playerId, FIXED_ROOM_CODE);
        logger.info(`👤 ${playerName} (${playerId}) joined shared room "${FIXED_ROOM_CODE}"`);

        // Send additional confirmation
        ws.send(JSON.stringify({
            type: 'JOINED_ROOM',
            data: {
                roomCode: FIXED_ROOM_CODE,
                playerId,
                playerName,
                message: `You joined the shared room as ${playerName}`
            }
        }));

        // Notify all other clients about the new player
        room.broadcast({
            type: 'PLAYER_JOINED',
            data: {
                playerId,
                playerName,
                x: 100,
                y: 300,
                position: { x: 100, y: 300 }
            }
        }, playerId);

    } else {
        logger.warn(`🚫 Failed to add player ${playerId} to shared room`);
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'Failed to join room. Room may be full.'
        }));
        ws.close();
        return;
    }

    ws.on('close', () => {
        logger.info(`❌ Client disconnected from ${ip}`);

        if (currentPlayerId) {
            const room = rooms.get(FIXED_ROOM_CODE);
            if (room) {
                room.removeClient(currentPlayerId);
                playerRoomMap.delete(currentPlayerId);

                logger.info(`👋 Player ${currentPlayerId} left the shared room`);
            }
        }
    });

    ws.on('error', (error) => {
        logger.error(`WebSocket error for player ${currentPlayerId}:`, error);
    });
});

// Handle client messages
function handleClientMessage(ws, data, playerId) {
    const { type, data: messageData } = data;

    if (!playerId && type !== 'joinRoom') {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'Player not authenticated'
        }));
        return;
    }

    const roomCode = playerRoomMap.get(playerId) || FIXED_ROOM_CODE;
    const room = rooms.get(roomCode);

    if (!room && type !== 'joinRoom') {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'Room not found'
        }));
        return;
    }

    switch (type) {
        case 'joinRoom':
            // Already handled in connection logic
            logger.debug(`Player ${playerId} attempted to join room (already joined)`);
            break;

        case 'playerAction':
            if (messageData && messageData.type) {
                logger.debug(`Player ${playerId} action: ${messageData.type}`);
                room.handlePlayerAction(playerId, messageData);
            } else {
                logger.warn(`Invalid playerAction from ${playerId}:`, messageData);
            }
            break;

        case 'playerReady':
            room.setPlayerReady(playerId, messageData.ready || false);
            break;

        case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

        default:
            logger.warn(`Unknown message type: ${type} from player ${playerId}`);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: `Unknown message type: ${type}`
            }));
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        rooms: rooms.size,
        players: playerRoomMap.size,
        uptime: process.uptime()
    });
});

// Room info endpoint
app.get('/rooms', (req, res) => {
    const roomsInfo = Array.from(rooms.values()).map(room => room.getRoomInfo());
    res.json(roomsInfo);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

logger.info(`🎮 Multiplayer game server initialized`);