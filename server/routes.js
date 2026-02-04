const express = require('express');
const { getDb } = require('./db');
const { searchPlayers } = require('./services/sorare');
const { getMe } = require('./services/telegram');
const { createPendingConnection, checkConnection } = require('./services/telegramConnection');
const router = express.Router();

// GET search players
router.get('/players/search', async (req, res) => {
    const { query } = req.query;
    if (!query || query.length < 3) {
        return res.json([]);
    }
    const players = await searchPlayers(query);
    res.json(players);
});

// GET all alerts
router.get('/alerts', async (req, res) => {
    const db = await getDb();
    const alerts = await db.all('SELECT * FROM alerts');
    res.json(alerts);
});

// POST create alert
router.post('/alerts', async (req, res) => {
    const { playerSlug, rarity, priceThreshold, currency, telegramChatId, season } = req.body;
    if (!playerSlug || !rarity || !priceThreshold || !telegramChatId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await getDb();
    const result = await db.run(
        'INSERT INTO alerts (playerSlug, rarity, priceThreshold, currency, telegramChatId, season) VALUES (?, ?, ?, ?, ?, ?)',
        [playerSlug, rarity, priceThreshold, currency || 'ETH', telegramChatId, season || null]
    );

    res.status(201).json({ id: result.lastID, ...req.body });
});

// DELETE alert
router.delete('/alerts/:id', async (req, res) => {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM alerts WHERE id = ?', id);
    res.json({ message: 'Alert deleted' });
});

// Telegram Connection Routes
router.get('/telegram/bot-info', async (req, res) => {
    const botInfo = await getMe();
    if (botInfo) {
        res.json({ username: botInfo.username });
    } else {
        res.status(500).json({ error: 'Could not get bot info' });
    }
});

router.post('/telegram/create-code', (req, res) => {
    const code = createPendingConnection();
    res.json({ code });
});

router.get('/telegram/check-code/:code', (req, res) => {
    const { code } = req.params;
    const chatId = checkConnection(code.toUpperCase());
    res.json({ chatId });
});

module.exports = router;
