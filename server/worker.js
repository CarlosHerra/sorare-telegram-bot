const { getDb } = require('./db');
const { getCardPrice } = require('./services/sorare');
const { sendPhotoAlert } = require('./services/telegram');

const POLLING_INTERVAL_MS = 60 * 1000; // 1 minute

const { getEthToEurRate, convertCurrency } = require('./services/exchange');

// Cache rate briefly or fetch fresh? Fetching fresh for now (1 min interval is fine)
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

    // Fetch exchange rate once for the batch if possible
    const ethToEur = await getEthToEurRate() || 2500; // Fallback to 2500 if fails
    console.log(`Current ETH/EUR Rate: ${ethToEur}`);

    // Group alerts by unique combination of playing parameters to reduce API calls
    const groupedAlerts = {};
    for (const alert of alerts) {
        // Create a unique key: e.g., "lionel-messi-limited-2023"
        // If season is null, it should still form a valid key part
        const key = `${alert.playerSlug}-${alert.rarity}-${alert.season || 'any'}`;
        if (!groupedAlerts[key]) {
            groupedAlerts[key] = {
                playerSlug: alert.playerSlug,
                rarity: alert.rarity,
                season: alert.season,
                alerts: []
            };
        }
        groupedAlerts[key].alerts.push(alert);
    }

    // Process each unique group
    for (const key in groupedAlerts) {
        const { playerSlug, rarity, season, alerts: groupAlerts } = groupedAlerts[key];
        
        try {
            // Only perform ONE api call per group
            const currentData = await getCardPrice(playerSlug, rarity, season);

            if (currentData && currentData.price) {
                const cardPrice = currentData.price;
                const cardCurrency = currentData.currency; // The actual currency from the API (ETH, EUR, USD, GBP)
                
                // Now check this single retrieved price against ALL users' alerts in this group
                for (const alert of groupAlerts) {
                    const { id, priceThreshold, currency, telegramChatId, version } = alert;
                    
                    const cardPriceConverted = convertCurrency(cardPrice, cardCurrency, currency, ethToEur);

                    console.log(`Checking ${playerSlug}: Card ${cardPrice} ${cardCurrency} (~${cardPriceConverted.toFixed(2)} ${currency}) vs Alert ${priceThreshold} ${currency}`);

                    if (cardPriceConverted < priceThreshold) {
                        const cardSlug = currentData.cardSlug;
                        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

                        // Check if we already sent an alert today for this alert + card + version combination
                        const existingAlert = await db.get(
                            'SELECT id FROM sent_alerts WHERE alertId = ? AND cardSlug = ? AND dateSent = ? AND alertVersion = ?',
                            [id, cardSlug, today, version || 1]
                        );

                        if (existingAlert) {
                            console.log(`Alert for ${playerSlug} (${cardSlug}) [v${version || 1}] already sent today, skipping.`);
                            continue; // Skip only this individual alert dispatch
                        }

                        // Send rich photo alert
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
                            // Record that we sent this alert today
                            await db.run(
                                'INSERT OR IGNORE INTO sent_alerts (alertId, cardSlug, dateSent, alertVersion) VALUES (?, ?, ?, ?)',
                                [id, cardSlug, today, version || 1]
                            );

                            console.log(`Alert triggered and recorded for ID ${id}`);
                        } else {
                            console.log(`Failed to send alert for ID ${id}. Let's try again next loop.`);
                        }
                    }
                }
            } else {
                console.log(`Could not get price for ${playerSlug}`);
            }
        } catch (error) {
            console.error(`Error processing group ${key}:`, error);
        }
    }
}

function startPolling() {
    setInterval(checkAlerts, POLLING_INTERVAL_MS);
    checkAlerts(); // Run immediately on start
}

module.exports = { startPolling };
