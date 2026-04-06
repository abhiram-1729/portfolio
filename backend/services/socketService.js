import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.use((socket, next) => {
    // Try to get token from auth object (standard Socket.IO) or headers
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1] || socket.handshake.query.token;
    
    if (!token) {
      console.log('Socket Connection Error: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Contains id, role, assignedVehicleId
      next();
    } catch (err) {
      console.log('Socket Connection Error: Invalid token', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.user.id} (${socket.user.role || 'no role'})`);

    // Join individualized room
    socket.join(`user:${socket.user.id}`);
    
    // Join role-based room
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
      console.log(`User ${socket.user.id} joined room role:${socket.user.role}`);
    }
    
    // Join vehicle-based room
    if (socket.user.assignedVehicleId) {
      socket.join(`vehicle:${socket.user.assignedVehicleId}`);
      console.log(`User ${socket.user.id} joined room vehicle:${socket.user.assignedVehicleId}`);
    }

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${socket.user.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
