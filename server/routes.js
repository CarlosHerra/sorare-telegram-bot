const express = require('express');
const { getDb } = require('./db');
const { searchPlayers } = require('./services/sorare');
const { getMe } = require('./services/telegram');
const { createPendingConnection, checkConnection } = require('./services/telegramConnection');
const { authenticateToken, checkAlertOwnership } = require('./auth');
const { getUserGallery } = require('./services/sorare');
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

router.get('/alerts', authenticateToken, async (req, res) => {
    const db = await getDb();
    const alerts = await db.all('SELECT * FROM alerts WHERE userId = ?', [req.user.userId]);
    
    // Fetch exchange rate to apply conversions based on locally cached prices
    const { getRates, convertCurrency } = require('./services/exchange');
    const rates = await getRates();
    
    // Resolve cached data for each alert seamlessly
    const alertsWithPrice = await Promise.all(alerts.map(async (alert) => {
        const { playerSlug, rarity, season, currency } = alert;
        
        // Grab values cleanly from the background cache instead of blocking external APIs
        const cachedData = await db.get(
            `SELECT price, currency as cachedCurrency, playerPictureUrl 
             FROM card_prices_cache 
             WHERE playerSlug = ? AND rarity = ? AND season = ?`,
            [playerSlug, rarity, season || 'any']
        );
        
        let currentFloorPrice = null;
        let playerPictureUrl = null;

        if (cachedData) {
            playerPictureUrl = cachedData.playerPictureUrl;
            if (cachedData.price) {
                const cardPriceConverted = convertCurrency(cachedData.price, cachedData.cachedCurrency, currency, rates);
                currentFloorPrice = cardPriceConverted;
            }
        }

        return {
            ...alert,
            currentFloorPrice,
            playerPictureUrl
        };
    }));

    res.json(alertsWithPrice);
});

// POST create alert
router.post('/alerts', authenticateToken, async (req, res) => {
    const { playerSlug, rarity, priceThreshold, currency, season } = req.body;
    if (!playerSlug || !rarity || priceThreshold === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const numPrice = parseFloat(priceThreshold);
    if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ error: 'Invalid price threshold' });
    }

    const db = await getDb();
    const result = await db.run(
        'INSERT INTO alerts (playerSlug, rarity, priceThreshold, currency, season, userId, telegramChatId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [playerSlug, rarity, numPrice, currency || 'ETH', season || null, req.user.userId, '']
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

    if (!rarity || priceThreshold === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const numPrice = parseFloat(priceThreshold);
    if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ error: 'Invalid price threshold' });
    }

    const db = await getDb();

    // Existence and ownership are already verified by the middleware
    await db.run(
        `UPDATE alerts 
         SET rarity = ?, priceThreshold = ?, currency = ?, season = ?, version = version + 1 
         WHERE id = ?`,
        [rarity, numPrice, currency || 'ETH', season || null, id]
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

// Gallery Tracker Routes
router.get('/gallery/cards', authenticateToken, async (req, res) => {
    const db = await getDb();
    const user = await db.get('SELECT sorareUsername FROM users WHERE id = ?', [req.user.userId]);
    
    if (!user || !user.sorareUsername) {
        return res.status(400).json({ error: 'Sorare username is not configured.' });
    }

    const gallery = await getUserGallery(user.sorareUsername);
    res.json(gallery);
});

router.get('/gallery/global-config', authenticateToken, async (req, res) => {
    const db = await getDb();
    const configs = await db.all('SELECT * FROM gallery_global_config WHERE userId = ?', [req.user.userId]);
    res.json(configs);
});

router.post('/gallery/global-config', authenticateToken, async (req, res) => {
    const { rarity, thresholdValue, currency, enabled } = req.body;
    if (!rarity) return res.status(400).json({ error: 'Missing rarity' });
    
    let numThreshold = null;
    if (thresholdValue !== undefined && thresholdValue !== null && thresholdValue !== '') {
        numThreshold = parseFloat(thresholdValue);
        if (isNaN(numThreshold) || numThreshold < 0) {
            return res.status(400).json({ error: 'Invalid threshold value' });
        }
    }
    
    const db = await getDb();
    await db.run(
        `INSERT INTO gallery_global_config (userId, rarity, thresholdValue, currency, enabled)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(userId, rarity) 
         DO UPDATE SET thresholdValue=excluded.thresholdValue, currency=excluded.currency, enabled=excluded.enabled`,
        [req.user.userId, rarity, numThreshold, currency || 'ETH', enabled ? 1 : 0]
    );
    res.json({ message: 'Global config updated' });
});

router.get('/gallery/card-tracking', authenticateToken, async (req, res) => {
    const db = await getDb();
    const trackers = await db.all('SELECT * FROM gallery_card_tracking WHERE userId = ?', [req.user.userId]);
    res.json(trackers);
});

router.post('/gallery/card-tracking', authenticateToken, async (req, res) => {
    const { playerSlug, rarity, thresholdValue, currency, enabled } = req.body;
    if (!playerSlug || !rarity) return res.status(400).json({ error: 'Missing playerSlug or rarity' });

    let numThreshold = null;
    if (thresholdValue !== undefined && thresholdValue !== null && thresholdValue !== '') {
        numThreshold = parseFloat(thresholdValue);
        if (isNaN(numThreshold) || numThreshold < 0) {
            return res.status(400).json({ error: 'Invalid threshold value' });
        }
    }

    const db = await getDb();
    await db.run(
        `INSERT INTO gallery_card_tracking (userId, playerSlug, rarity, thresholdValue, currency, enabled)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(userId, playerSlug, rarity)
         DO UPDATE SET thresholdValue=excluded.thresholdValue, currency=excluded.currency, enabled=excluded.enabled`,
        [req.user.userId, playerSlug, rarity, numThreshold, currency || 'ETH', enabled ? 1 : 0]
    );
    res.json({ message: 'Card tracking updated' });
});

module.exports = router;
