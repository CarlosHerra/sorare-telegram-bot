const { convertCurrency, getRates } = require('./server/services/exchange');

async function testAllConversions() {
  const rates = await getRates();
  if (!rates) {
    console.error('Failed to fetch rates');
    return;
  }

  const testCases = [
    { amount: 1, from: 'ETH', to: 'EUR' },
    { amount: 1, from: 'ETH', to: 'USD' },
    { amount: 1, from: 'ETH', to: 'GBP' },
    { amount: 1, from: 'ETH', to: 'SOL' },
    { amount: 100, from: 'EUR', to: 'USD' },
    { amount: 100, from: 'USD', to: 'EUR' },
    { amount: 10, from: 'SOL', to: 'ETH' },
    { amount: 10, from: 'GBP', to: 'SOL' },
  ];

  console.log('--- Universal Conversion Test ---');
  testCases.forEach(({ amount, from, to }) => {
    const result = convertCurrency(amount, from, to, rates);
    console.log(`${amount} ${from} = ${result.toFixed(4)} ${to}`);
  });
}

testAllConversions();
