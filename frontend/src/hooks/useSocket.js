import { useEffect, useCallback } from 'react';
import { socket } from '../socket';

export const useSocket = (roomId, audioRef) => {

    useEffect(() => {
        // Connect to the socket server
        socket.connect();

        if (roomId) {
            // Updated to use the new join-session with user data
            socket.emit('join-session', { roomId, userId: socket.id });
        }

        // Set up listeners for synced events
        const onPlay = ({ currentTime }) => {
            if (audioRef.current && audioRef.current.paused) {
                if (Math.abs(audioRef.current.currentTime - currentTime) > 1) {
                    audioRef.current.currentTime = currentTime;
                }
                audioRef.current.play().catch(e => console.error('Play prevented', e));
            }
        };

        const onPause = ({ currentTime }) => {
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
                if (Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
                    audioRef.current.currentTime = currentTime;
                }
            }
        };

        const onSeek = ({ seekTime }) => {
            if (audioRef.current) {
                audioRef.current.currentTime = seekTime;
            }
        };

        const onSyncStateRequest = ({ socketId }) => {
            // If this client is the host, it should respond with its current state
            if (audioRef.current) {
                const currentTime = audioRef.current.currentTime;
                const isPlaying = !audioRef.current.paused;
                socket.emit('sync-state', { targetSocketId: socketId, currentTime, isPlaying });
            }
        };

        const onSyncStateReceive = ({ currentTime, isPlaying }) => {
            if (audioRef.current) {
                audioRef.current.currentTime = currentTime;
                if (isPlaying) {
                    audioRef.current.play().catch(e => console.error('Play prevented on sync', e));
                } else {
                    audioRef.current.pause();
                }
            }
        };

        socket.on('play', onPlay);
        socket.on('pause', onPause);
        socket.on('seek', onSeek);
        socket.on('request-sync-from-host', onSyncStateRequest);
        socket.on('sync-state', onSyncStateReceive);

        // When a user successfully joins a new room, ask the host for the current playback state
        if (roomId) {
            socket.emit('request-sync', { roomId });
        }

        return () => {
            socket.off('play', onPlay);
            socket.off('pause', onPause);
            socket.off('seek', onSeek);
            socket.off('request-sync-from-host', onSyncStateRequest);
            socket.off('sync-state', onSyncStateReceive);
            socket.disconnect();
        };
    }, [roomId, audioRef]);

    // Methods to emit events from the current client
    const emitPlay = useCallback((currentTime) => {
        socket.emit('play', { roomId, currentTime });
    }, [roomId]);

    const emitPause = useCallback((currentTime) => {
        socket.emit('pause', { roomId, currentTime });
    }, [roomId]);

    const emitSeek = useCallback((seekTime) => {
        socket.emit('seek', { roomId, seekTime });
    }, [roomId]);

    return { emitPlay, emitPause, emitSeek };
};
