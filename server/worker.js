const { getDb } = require('./db');
const { getCardPrice, getBatchedCardPrices } = require('./services/sorare');
const { sendPhotoAlert } = require('./services/telegram');

const POLLING_INTERVAL_MS = 60 * 1000; // 1 minute

const { getRates, convertCurrency } = require('./services/exchange');

async function checkAlerts() {
    console.log('Running alert check...');
    const db = await getDb();
    const alerts = await db.all(`
        SELECT a.*, u.telegramChatId 
        FROM alerts a 
        JOIN users u ON a.userId = u.id 
        WHERE u.telegramChatId IS NOT NULL
    `);

    if (alerts.length === 0) {
        console.log('No alerts to check.');
        return;
    }

    const rates = await getRates();
    console.log(`Current ETH Rate in EUR: ${rates?.eth?.eur || 'N/A'}`);

    const groupedAlerts = {};
    const uniqueRequests = [];
    for (const alert of alerts) {
        const key = `${alert.playerSlug}-${alert.rarity}-${alert.season || 'any'}`;
        if (!groupedAlerts[key]) {
            groupedAlerts[key] = {
                playerSlug: alert.playerSlug,
                rarity: alert.rarity,
                season: alert.season,
                alerts: []
            };
            uniqueRequests.push({ playerSlug: alert.playerSlug, rarity: alert.rarity, season: alert.season });
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

        const { playerSlug, rarity, season, alerts: groupAlerts } = group;

        if (currentData) {
            // Upsert to Cache
            try {
                await db.run(
                    `INSERT INTO card_prices_cache (playerSlug, rarity, season, price, currency, playerPictureUrl, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(playerSlug, rarity, season)
                     DO UPDATE SET price=excluded.price, currency=excluded.currency, playerPictureUrl=excluded.playerPictureUrl, updatedAt=CURRENT_TIMESTAMP`,
                    [playerSlug, rarity, season || 'any', currentData.price || null, currentData.currency || null, currentData.playerPictureUrl || null]
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

                    const success = await sendPhotoAlert(telegramChatId, {
                        playerDisplayName: currentData.playerDisplayName,
                        cardSlug: cardSlug,
                        pictureUrl: currentData.cardPictureUrl,
                        serialNumber: currentData.serialNumber,
                        seasonYear: currentData.seasonYear,
                        rarity: currentData.rarity,
                        currentPrice: { amount: cardPriceConverted, currency },
                        threshold: { amount: priceThreshold, currency }
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
