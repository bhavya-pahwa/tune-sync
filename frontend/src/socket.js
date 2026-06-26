import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
    autoConnect: false, // We'll manage connection manually depending on when we want it
});
