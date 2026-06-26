const ListeningSession = require('../models/ListeningSession');

const handleSessionSocket = (io) => {
    // Keep track of which room a user is in to emit user-left easily
    // We also store their userId to remove them from the DB on disconnect
    const userRooms = new Map();

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        // Join session (room)
        socket.on('join-session', async (data) => {
            const { roomId, userId } = data || {};
            if (!roomId) return;

            const effectiveUserId = userId || socket.id;

            socket.join(roomId);
            userRooms.set(socket.id, { roomId, userId: effectiveUserId });
            console.log(`User ${effectiveUserId} joined room: ${roomId}`);

            try {
                // Optionally add them to the participants array in DB if they aren't there
                const session = await ListeningSession.findOne({ sessionId: roomId });
                if (session && !session.participants.includes(effectiveUserId)) {
                    session.participants.push(effectiveUserId);
                    await session.save();
                }
            } catch (err) {
                console.error('Error updating participants on join:', err);
            }

            // Notify others in the room
            socket.to(roomId).emit('user-joined', { userId: effectiveUserId });
        });

        // Request state from host (when a new listener joins)
        socket.on('request-sync', (data) => {
            const { roomId } = data || {};
            // Forward the request to the room 
            socket.to(roomId).emit('request-sync-from-host', { socketId: socket.id });
        });

        // Host responds with current state
        socket.on('sync-state', (data) => {
            const { targetSocketId, currentTime, isPlaying } = data || {};
            if (targetSocketId) {
                // Send specific state directly to the requester
                io.to(targetSocketId).emit('sync-state', { currentTime, isPlaying });
            }
        });

        // Sync play event
        socket.on('play', async (data) => {
            const { roomId, currentTime } = data || {};
            console.log(`Play event in room ${roomId} at ${currentTime}`);

            try {
                await ListeningSession.findOneAndUpdate(
                    { sessionId: roomId },
                    { isPlaying: true, currentTime }
                );
            } catch (err) {
                console.error('Error updating DB on play', err);
            }

            socket.to(roomId).emit('play', { currentTime });
        });

        // Sync pause event
        socket.on('pause', async (data) => {
            const { roomId, currentTime } = data || {};
            console.log(`Pause event in room ${roomId} at ${currentTime}`);

            try {
                await ListeningSession.findOneAndUpdate(
                    { sessionId: roomId },
                    { isPlaying: false, currentTime }
                );
            } catch (err) {
                console.error('Error updating DB on pause', err);
            }

            socket.to(roomId).emit('pause', { currentTime });
        });

        // Sync seek event
        socket.on('seek', async (data) => {
            const { roomId, seekTime } = data || {};
            console.log(`Seek event in room ${roomId} to ${seekTime}`);

            try {
                await ListeningSession.findOneAndUpdate(
                    { sessionId: roomId },
                    { currentTime: seekTime }
                );
            } catch (err) {
                console.error('Error updating DB on seek', err);
            }

            socket.to(roomId).emit('seek', { seekTime });
        });

        // Auto-sync event (from host)
        socket.on('auto-sync', (data) => {
            const { roomId, currentTime, isPlaying } = data || {};
            socket.to(roomId).emit('auto-sync', { currentTime, isPlaying });
        });

        // Chat message event
        socket.on('chat-message', (data) => {
            const { roomId, userId, text, timestamp } = data || {};
            socket.to(roomId).emit('chat-message', { userId, text, timestamp });
        });

        socket.on('disconnect', async () => {
            console.log(`Client disconnected: ${socket.id}`);
            const userData = userRooms.get(socket.id);

            if (userData) {
                const { roomId, userId } = userData;
                socket.to(roomId).emit('user-left', { userId });

                try {
                    // Remove user from participants in DB
                    const session = await ListeningSession.findOne({ sessionId: roomId });
                    if (session) {
                        session.participants = session.participants.filter(p => p !== userId);
                        await session.save();
                    }
                } catch (err) {
                    console.error('Error removing user from DB participants on disconnect', err);
                }

                userRooms.delete(socket.id);
            }
        });
    });
};

module.exports = handleSessionSocket;
