import { Router } from 'express';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
	try {
		const { username, email, password } = req.body || {};
		if (!username || !email || !password) {
			return res.status(400).json({ error: 'Missing fields' });
		}
		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ error: 'Email already in use' });
		const user = await User.create({ username, email, password });
		const token = signToken(user._id.toString());
		return res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
	} catch (err) {
		return res.status(500).json({ error: 'Registration failed' });
	}
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body || {};
		if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const valid = await user.comparePassword(password);
		if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
		const token = signToken(user._id.toString());
		return res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
	} catch (err) {
		return res.status(500).json({ error: 'Login failed' });
	}
});

export default router;


