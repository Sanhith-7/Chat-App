import { Router } from 'express';
import Message from '../models/Message.js';

const router = Router();

// GET /conversations/:id/messages
router.get('/:id/messages', async (req, res) => {
	try {
		const otherUserId = req.params.id;
		const currentUserId = req.userId;
		const messages = await Message.find({
			$or: [
				{ senderId: currentUserId, receiverId: otherUserId },
				{ senderId: otherUserId, receiverId: currentUserId }
			]
		})
			.sort({ createdAt: 1 });
		return res.json(messages);
	} catch (err) {
		return res.status(500).json({ error: 'Failed to fetch messages' });
	}
});

export default router;


