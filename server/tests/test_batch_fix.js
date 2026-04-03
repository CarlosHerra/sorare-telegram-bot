const { getBatchedCardPrices } = require('../services/sorare');
require('dotenv').config();

async function testBatchedPricesFix() {
  const requests = [
    { playerSlug: 'josh-sargent', rarity: 'limited', season: '2023' },
    { playerSlug: 'lionel-messi', rarity: 'limited', season: '2023' }
  ];

  try {
    console.log('Testing getBatchedCardPrices with multiple players...');
    const results = await getBatchedCardPrices(requests);
    console.log('Success! Results keys:', Object.keys(results));
    console.log('Sample result (Messi):', results['lionel-messi-limited-2023']?.price);
  } catch (error) {
    console.error('FAILED:', error.message);
  }
}

testBatchedPricesFix();
