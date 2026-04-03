const express = require('express');
const { getDb } = require('./db');
const { searchPlayers, getCardPrice } = require('./services/sorare');
const { getMe } = require('./services/telegram');
const { createPendingConnection, checkConnection } = require('./services/telegramConnection');
const { authenticateToken, checkAlertOwnership } = require('./auth');
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
// GET all alerts
router.get('/alerts', authenticateToken, async (req, res) => {
    const db = await getDb();
    const alerts = await db.all('SELECT * FROM alerts WHERE userId = ?', [req.user.userId]);
    
    // Fetch current prices in parallel to return alongside the alert configurations
    const { getEthToEurRate, convertCurrency } = require('./services/exchange');
    const ethToEur = await getEthToEurRate() || 2500;
    
    const alertsWithPrice = await Promise.all(alerts.map(async (alert) => {
        const { playerSlug, rarity, season, currency } = alert;
        const currentData = await getCardPrice(playerSlug, rarity, season);
        let currentFloorPrice = null;

        if (currentData && currentData.price) {
            const cardPriceConverted = convertCurrency(currentData.price, currentData.currency, currency, ethToEur);
            currentFloorPrice = cardPriceConverted;
        }

        return {
            ...alert,
            currentFloorPrice,
            playerPictureUrl: currentData?.playerPictureUrl || null
        };
    }));

    res.json(alertsWithPrice);
});

// POST create alert
router.post('/alerts', authenticateToken, async (req, res) => {
    const { playerSlug, rarity, priceThreshold, currency, season } = req.body;
    if (!playerSlug || !rarity || !priceThreshold) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await getDb();
    const result = await db.run(
        'INSERT INTO alerts (playerSlug, rarity, priceThreshold, currency, season, userId, telegramChatId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [playerSlug, rarity, priceThreshold, currency || 'ETH', season || null, req.user.userId, '']
    );

    res.status(201).json({ id: result.lastID, ...req.body, userId: req.user.userId });
});

// DELETE alert
router.delete('/alerts/:id', authenticateToken, checkAlertOwnership, async (req, res) => {
    const { id } = req.params;
    const db = await getDb();
    
    // Existence and ownership are already verified by the middleware
    await db.run('DELETE FROM alerts WHERE id = ?', [id]);
    
    res.json({ message: 'Alert deleted' });
});

// PUT update alert
router.put('/alerts/:id', authenticateToken, checkAlertOwnership, async (req, res) => {
    const { id } = req.params;
    const { rarity, priceThreshold, currency, season } = req.body;

    if (!rarity || !priceThreshold) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await getDb();

    // Existence and ownership are already verified by the middleware
    await db.run(
        `UPDATE alerts 
         SET rarity = ?, priceThreshold = ?, currency = ?, season = ?, version = version + 1 
         WHERE id = ?`,
        [rarity, priceThreshold, currency || 'ETH', season || null, id]
    );

    res.json({ message: 'Alert updated and cooldown reset', id });
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
