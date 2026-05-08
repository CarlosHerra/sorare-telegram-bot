/**
 * Debug script to inspect what the Sorare API returns for card data.
 */
require('dotenv').config();
const { getCardPrice } = require('./services/sorare');

async function debug() {
    // Test with a common player
    const testPlayer = 'julian-alvarez';
    const rarity = 'rare';
    
    console.log(`\nFetching card data for: ${testPlayer} (${rarity})...\n`);
    const result = await getCardPrice(testPlayer, rarity);
    
    if (!result) {
        console.log('No result returned!');
        return;
    }

    console.log('Full result object:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n--- Key fields for Telegram alert ---');
    console.log('cardSlug:', result.cardSlug);
    console.log('cardPictureUrl:', result.cardPictureUrl);
    console.log('playerPictureUrl:', result.playerPictureUrl);
    console.log('playerDisplayName:', result.playerDisplayName);
    console.log('\n--- Telegram would use ---');
    console.log('Photo URL:', result.cardPictureUrl || result.playerPictureUrl || 'NONE');
    console.log('Sorare link:', result.cardSlug ? `https://sorare.com/cards/${result.cardSlug}` : 'NO SLUG');
}

debug().catch(console.error);
