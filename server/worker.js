const { getDb } = require('./db');
const { getCardPrice, getBatchedCardPrices, getUserGallery, buildCacheKey } = require('./services/sorare');
const { sendPhotoAlert } = require('./services/telegram');

const POLLING_INTERVAL_MS = 60 * 1000; // 1 minute

const { getRates, convertCurrency } = require('./services/exchange');

async function checkAlerts() {
    console.log('Running alert check...');
    const db = await getDb();
    
    // Manual Alerts
    const alerts = await db.all(`
        SELECT a.*, u.telegramChatId 
        FROM alerts a 
        JOIN users u ON a.userId = u.id 
        WHERE u.telegramChatId IS NOT NULL
    `);

    // Gallery Trackers
    const usersWithGallery = await db.all(`
        SELECT DISTINCT u.id as userId, u.telegramChatId, u.sorareUsername
        FROM users u
        WHERE u.telegramChatId IS NOT NULL AND u.sorareUsername IS NOT NULL
        AND (
            EXISTS(SELECT 1 FROM gallery_global_config g WHERE g.userId = u.id AND g.enabled = 1) OR
            EXISTS(SELECT 1 FROM gallery_card_tracking c WHERE c.userId = u.id AND c.enabled = 1)
        )
    `);

    let galleryAlerts = [];

    for (const user of usersWithGallery) {
        const globals = await db.all('SELECT * FROM gallery_global_config WHERE userId = ? AND enabled = 1', [user.userId]);
        const customs = await db.all('SELECT * FROM gallery_card_tracking WHERE userId = ? AND enabled = 1', [user.userId]);
        
        if (globals.length > 0 || customs.length > 0) {
            // We need to fetch the user's gallery to evaluate global targets and make sure they own the custom targets
            const userCards = await getUserGallery(user.sorareUsername);
            
            for (const card of userCards) {
                // Check if card is tracked via custom override
                const customConfig = customs.find(c => c.playerSlug === card.playerSlug && c.rarity.toLowerCase() === card.rarity.toLowerCase());
                if (customConfig && customConfig.thresholdValue) {
                    galleryAlerts.push({
                        id: `gal_cust_${customConfig.id}`,
                        playerSlug: card.playerSlug,
                        rarity: card.rarity,
                        season: null, // Any season
                        priceThreshold: customConfig.thresholdValue,
                        currency: customConfig.currency,
                        telegramChatId: user.telegramChatId,
                        version: 1
                    });
                    continue; // Skip global check if custom exists
                }

                // Check if card is tracked via global config
                const globalConfig = globals.find(g => g.rarity.toLowerCase() === card.rarity.toLowerCase());
                if (globalConfig && globalConfig.thresholdValue) {
                    galleryAlerts.push({
                        id: `gal_glob_${user.userId}_${card.playerSlug}_${card.rarity}`,
                        playerSlug: card.playerSlug,
                        rarity: card.rarity,
                        season: null,
                        priceThreshold: globalConfig.thresholdValue,
                        currency: globalConfig.currency,
                        telegramChatId: user.telegramChatId,
                        version: 1
                    });
                }
            }
        }
    }

    const allActiveAlerts = [...alerts, ...galleryAlerts];

    if (allActiveAlerts.length === 0) {
        console.log('No alerts to check.');
        return;
    }

    const rates = await getRates();
    console.log(`Current ETH Rate in EUR: ${rates?.eth?.eur || 'N/A'}`);

    const groupedAlerts = {};
    const uniqueRequests = [];
    for (const alert of allActiveAlerts) {
        const cacheKey = buildCacheKey(alert.cardType, alert.season);
        const key = `${alert.playerSlug}-${alert.rarity}-${cacheKey}`;
        if (!groupedAlerts[key]) {
            groupedAlerts[key] = {
                playerSlug: alert.playerSlug,
                rarity: alert.rarity,
                cardType: alert.cardType,
                season: alert.season,
                alerts: []
            };
            uniqueRequests.push({ playerSlug: alert.playerSlug, rarity: alert.rarity, cardType: alert.cardType, season: alert.season });
        }
        groupedAlerts[key].alerts.push(alert);
    }

    // Process in batches of 30 to avoid huge GraphQL queries
    const BATCH_SIZE = 30;
    const allResults = {};

    for (let i = 0; i < uniqueRequests.length; i += BATCH_SIZE) {
        const batch = uniqueRequests.slice(i, i + BATCH_SIZE);
        console.log(`Fetching batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} players)...`);
        const batchResults = await getBatchedCardPrices(batch);
        Object.assign(allResults, batchResults);
    }

    // Process results
    for (const key in allResults) {
        const currentData = allResults[key];
        const group = groupedAlerts[key];
        if (!group) continue;

        const { playerSlug, rarity, cardType, season, alerts: groupAlerts } = group;
        const cacheKeyVal = buildCacheKey(cardType, season);

        if (currentData) {
            // Upsert to Cache
            try {
                await db.run(
                    `INSERT INTO card_prices_cache (playerSlug, rarity, season, price, currency, playerPictureUrl, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(playerSlug, rarity, season)
                     DO UPDATE SET price=excluded.price, currency=excluded.currency, playerPictureUrl=excluded.playerPictureUrl, updatedAt=CURRENT_TIMESTAMP`,
                    [playerSlug, rarity, cacheKeyVal, currentData.price || null, currentData.currency || null, currentData.playerPictureUrl || null]
                );
            } catch (cacheErr) {
                console.error('Error writing to cache:', cacheErr);
            }
        }

        if (currentData && currentData.price) {
            const cardPrice = currentData.price;
            const cardCurrency = currentData.currency;
            
            for (const alert of groupAlerts) {
                const { id, priceThreshold, currency, telegramChatId, version } = alert;
                const cardPriceConverted = convertCurrency(cardPrice, cardCurrency, currency, rates);

                if (cardPriceConverted < priceThreshold) {
                    const cardSlug = currentData.cardSlug;
                    const today = new Date().toISOString().split('T')[0];

                    const existingAlert = await db.get(
                        'SELECT id FROM sent_alerts WHERE alertId = ? AND cardSlug = ? AND dateSent = ? AND alertVersion = ?',
                        [id, cardSlug, today, version || 1]
                    );

                    if (existingAlert) continue;

                    // Message differs if it's a gallery alert
                    const isGallery = typeof id === 'string' && id.startsWith('gal_');
                    const titleText = isGallery ? '🚨 GALLERY TARGET REACHED 🚨' : '🚨 PRICE ALERT 🚨';

                    const success = await sendPhotoAlert(telegramChatId, {
                        ...currentData,
                        titleText,
                        threshold: { amount: priceThreshold, currency },
                        currentPrice: { amount: cardPriceConverted, currency }
                    });

                    if (success) {
                        await db.run(
                            'INSERT OR IGNORE INTO sent_alerts (alertId, cardSlug, dateSent, alertVersion) VALUES (?, ?, ?, ?)',
                            [id, cardSlug, today, version || 1]
                        );
                        console.log(`Alert triggered for ID ${id}`);
                    }
                }
            }
        }
    }
}

function startPolling() {
    setInterval(checkAlerts, POLLING_INTERVAL_MS);
    checkAlerts(); // Run immediately on start
}

module.exports = { startPolling };
