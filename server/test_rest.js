const https = require('https');
require('dotenv').config();

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.SORARE_API_KEY;
        // console.log(`Requesting ${url} with Key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'None'}`);

        const options = {
            headers: {
                // 'Authorization': `Bearer ${apiKey}`, // specific to auth type, let's try raw or none first for public endpoints
                'APIKEY': apiKey,
                'User-Agent': 'NodeJS Test Script'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(data));
                    } else {
                        console.log(`Status: ${res.statusCode}`);
                        resolve(data); // resolve text for debugging
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}

async function test() {
    console.log("--- Testing REST Search (Mbappe) ---");
    try {
        const searchData = await makeRequest('https://api.sorare.com/api/v1/players/search?q=Mbappe');
        console.log(JSON.stringify(searchData).substring(0, 500) + "...");
    } catch (e) {
        console.log("Search error:", e.message);
    }

    console.log("\n--- Testing REST Card (Example) ---");
    // Need a valid card slug. Usually assetId or slug.
    // Use one from search result if possible, or guess.
    // https://api.sorare.com/api/v1/cards/kylian-mbappe-2022-limited-1
    try {
        const cardData = await makeRequest('https://api.sorare.com/api/v1/cards/kylian-mbappe-2022-limited-1');
        console.log(JSON.stringify(cardData, null, 2));
    } catch (e) {
        console.log("Card error:", e.message);
    }
}

test();
