const { getEthToEurRate, getGbpToEurRate } = require('./server/services/exchange');

async function verifyRates() {
  console.log('Fetching ETH to EUR rate...');
  const ethRate = await getEthToEurRate();
  console.log('ETH/EUR:', ethRate);

  console.log('Fetching GBP to EUR rate...');
  const gbpRate = await getGbpToEurRate();
  console.log('GBP/EUR:', gbpRate);

  if (ethRate && gbpRate) {
    console.log('Verification successful!');
  } else {
    console.log('Verification failed - rates are missing.');
  }
}

verifyRates();
