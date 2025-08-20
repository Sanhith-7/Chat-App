import jwt from 'jsonwebtoken';

export function verifyToken(token) {
	const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
	return jwt.verify(token, secret);
}

export function authMiddleware(req, res, next) {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;
	if (!token) return res.status(401).json({ error: 'Unauthorized' });
	try {
		const payload = verifyToken(token);
		req.userId = payload.userId;
		next();
	} catch {
		return res.status(401).json({ error: 'Unauthorized' });
	}
}

export function signToken(userId) {
	const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
	return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}


