import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  
  socket = io(SOCKET_URL, { 
    autoConnect: true, 
    transports: ['websocket', 'polling'], 
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
  });

  // Add connection event listeners
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    console.warn('Socket not initialized. Call connectSocket first.');
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}


