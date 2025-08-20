import { Router } from 'express';
import User from '../models/User.js';
import Message from '../models/Message.js';

const router = Router();

router.get('/', async (req, res) => {
	try {
		const users = await User.find({ _id: { $ne: req.userId } })
			.select('_id username email')
			.sort({ createdAt: -1 });
		return res.json(users.map(u => ({ id: u._id, username: u.username, email: u.email })));
	} catch (err) {
		return res.status(500).json({ error: 'Failed to fetch users' });
	}
});

// Get users with their last message for conversation list
router.get('/conversations', async (req, res) => {
	try {
		const currentUserId = req.userId;
		
		// Get all users except current user
		const users = await User.find({ _id: { $ne: currentUserId } })
			.select('_id username email')
			.sort({ createdAt: -1 });

		// Get last message for each conversation
		const usersWithLastMessage = await Promise.all(
			users.map(async (user) => {
				const lastMessage = await Message.findOne({
					$or: [
						{ senderId: currentUserId, receiverId: user._id },
						{ senderId: user._id, receiverId: currentUserId }
					]
				}).sort({ createdAt: -1 }).limit(1);

				return {
					id: user._id,
					username: user.username,
					email: user.email,
					lastMessage: lastMessage ? {
						content: lastMessage.content,
						timestamp: lastMessage.createdAt,
						senderId: lastMessage.senderId,
						status: lastMessage.status
					} : null
				};
			})
		);

		// Sort by last message timestamp (most recent first)
		usersWithLastMessage.sort((a, b) => {
			if (!a.lastMessage && !b.lastMessage) return 0;
			if (!a.lastMessage) return 1;
			if (!b.lastMessage) return -1;
			return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
		});

		return res.json(usersWithLastMessage);
	} catch (err) {
		return res.status(500).json({ error: 'Failed to fetch conversations' });
	}
});

export default router;


