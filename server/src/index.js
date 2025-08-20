import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import { authMiddleware } from './middleware/auth.js';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:19006,http://localhost:8081,http://localhost:8080')
	.split(',')
	.map((s) => s.trim());

const io = new SocketIOServer(server, {
	cors: {
		origin: CLIENT_ORIGINS,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		credentials: true,
		allowedHeaders: ['Content-Type', 'Authorization']
	},
	transports: ['websocket', 'polling'],
	pingTimeout: 60000,
	pingInterval: 25000,
});

// In-memory presence tracking
const userIdToSocketId = new Map();
const socketIdToUserId = new Map();

// Socket auth via JWT token provided in connection auth
io.use(async (socket, next) => {
	try {
		const { token } = socket.handshake.auth || {};
		if (!token) {
			console.log('No token provided for socket connection');
			return next(new Error('No token provided'));
		}
		// Lazy import to avoid circular deps
		const { verifyToken } = await import('./middleware/auth.js');
		const payload = verifyToken(token);
		socket.data.userId = payload.userId;
		console.log(`Socket authenticated for user: ${payload.userId}`);
		return next();
	} catch (err) {
		console.log('Socket authentication failed:', err.message);
		return next(new Error('Unauthorized'));
	}
});

io.on('connection', (socket) => {
	const userId = socket.data.userId;
	console.log(`Socket connected: ${socket.id} for user: ${userId}`);
	
	if (userId) {
		// Remove any existing connection for this user
		const existingSocketId = userIdToSocketId.get(userId);
		if (existingSocketId && existingSocketId !== socket.id) {
			console.log(`Removing existing connection for user ${userId}: ${existingSocketId}`);
			userIdToSocketId.delete(userId);
			socketIdToUserId.delete(existingSocketId);
		}
		
		userIdToSocketId.set(userId, socket.id);
		socketIdToUserId.set(socket.id, userId);
		broadcastPresence();
		console.log(`User ${userId} is now online. Total online: ${userIdToSocketId.size}`);
	}

	socket.on('message:send', async (payload, cb) => {
		try {
			const senderId = socket.data.userId;
			if (!senderId) return cb && cb({ ok: false, error: 'Unauthorized' });
			const { receiverId, content } = payload || {};
			if (!receiverId || !content) return cb && cb({ ok: false, error: 'Invalid payload' });

			let message = await Message.create({
				senderId,
				receiverId,
				content,
				status: 'sent'
			});

			const receiverSocketId = userIdToSocketId.get(receiverId);
			if (receiverSocketId) {
				// Mark delivered when receiver is online
				message.status = 'delivered';
				await message.save();
				io.to(receiverSocketId).emit('message:new', { message });
			}
			// Echo back to sender as well
			io.to(socket.id).emit('message:new', { message });
			cb && cb({ ok: true, message });
		} catch (error) {
			console.error('Error sending message:', error);
			cb && cb({ ok: false, error: 'Failed to send message' });
		}
	});

	socket.on('typing:start', ({ receiverId }) => {
		const receiverSocketId = userIdToSocketId.get(receiverId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit('typing:start', { fromUserId: socket.data.userId });
		}
	});

	socket.on('typing:stop', ({ receiverId }) => {
		const receiverSocketId = userIdToSocketId.get(receiverId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit('typing:stop', { fromUserId: socket.data.userId });
		}
	});

	socket.on('message:read', async ({ fromUserId }) => {
		try {
			const currentUserId = socket.data.userId;
			if (!currentUserId) return;
			await Message.updateMany(
				{ senderId: fromUserId, receiverId: currentUserId, status: { $ne: 'read' } },
				{ $set: { status: 'read' } }
			);
			const senderSocketId = userIdToSocketId.get(fromUserId);
			if (senderSocketId) {
				io.to(senderSocketId).emit('message:read', { byUserId: currentUserId });
			}
		} catch (error) {
			console.error('Error marking messages as read:', error);
		}
	});

	// Allow clients to fetch a presence snapshot on demand
	socket.on('presence:get', () => {
		const onlineUserIds = Array.from(userIdToSocketId.keys());
		socket.emit('presence:update', { onlineUserIds });
		console.log(`Presence update sent to ${socket.id}. Online users: ${onlineUserIds.length}`);
	});

	socket.on('disconnect', (reason) => {
		console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
		if (userId) {
			userIdToSocketId.delete(userId);
			socketIdToUserId.delete(socket.id);
			broadcastPresence();
			console.log(`User ${userId} is now offline. Total online: ${userIdToSocketId.size}`);
		}
	});

	socket.on('error', (error) => {
		console.error(`Socket error for ${socket.id}:`, error);
	});
});

function broadcastPresence() {
	const onlineUserIds = Array.from(userIdToSocketId.keys());
	io.emit('presence:update', { onlineUserIds });
	console.log(`Broadcasting presence update. Online users: ${onlineUserIds.length}`);
}

// Express setup
const CORS_OPTIONS = {
	origin: function (origin, callback) {
		if (!origin) return callback(null, true);
		if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
		return callback(new Error('Not allowed by CORS'));
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(CORS_OPTIONS));
app.options('*', cors(CORS_OPTIONS));
app.use(express.json());

app.get('/', (_, res) => {
	res.json({ ok: true, service: 'chat-app-server' });
});

app.use('/auth', authRoutes);
app.use('/users', authMiddleware, userRoutes);
app.use('/conversations', authMiddleware, conversationRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
	try {
		const DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/chat_app';
		await mongoose.connect(DB_URI);
		console.log('Connected to MongoDB');
		server.listen(PORT, () => {
			console.log(`Server listening on http://localhost:${PORT}`);
			console.log(`Socket.IO server ready`);
		});
	} catch (err) {
		console.error('Failed to start server', err);
		process.exit(1);
	}
}

start();


