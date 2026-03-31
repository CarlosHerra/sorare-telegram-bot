const { getGbpToEurRate } = require('./services/exchange');

async function test() {
    console.log("Fetching GBP to EUR rate...");
    const rate = await getGbpToEurRate();
    console.log(`Rate: ${rate}`);
    if (rate && typeof rate === 'number' && rate > 0) {
        console.log("SUCCESS: Rate is valid");
    } else {
        console.error("FAILURE: Rate is invalid");
    }
}

test();
