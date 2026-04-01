const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const { generateToken, authenticateToken } = require('../auth');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    try {
        const db = await getDb();
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (email, passwordHash) VALUES (?, ?)',
            [email, hashedPassword]
        );
        const token = generateToken(result.lastID);
        res.status(201).json({ token, userId: result.lastID, email });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    try {
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateToken(user.id);
        res.json({ token, userId: user.id, email: user.email, telegramChatId: user.telegramChatId });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const db = await getDb();
        const user = await db.get('SELECT id, email, telegramChatId FROM users WHERE id = ?', [req.user.userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/me', authenticateToken, async (req, res) => {
    const { telegramChatId } = req.body;
    try {
        const db = await getDb();
        await db.run('UPDATE users SET telegramChatId = ? WHERE id = ?', [telegramChatId, req.user.userId]);
        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Stubs for Google
router.get('/google', (req, res) => {
    res.status(501).json({ error: 'Not implemented. Add Passport.js Google Strategy here.' });
});

module.exports = router;
