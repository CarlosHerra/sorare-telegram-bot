const https = require('https');

const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur';

async function getEthToEurRate() {
    return new Promise((resolve, reject) => {
        https.get(API_URL, { headers: { 'User-Agent': 'NodeJS Script' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.ethereum && json.ethereum.eur) {
                        resolve(json.ethereum.eur);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    console.error('Error parsing Coingecko response:', e);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error('Coingecko request failed:', err);
            resolve(null);
        });
    });
}

async function getGbpToEurRate() {
    return new Promise((resolve, reject) => {
        // Using a free API for currency conversion without auth
        const url = 'https://latest.currency-api.pages.dev/v1/currencies/gbp.json';

        https.get(url, { headers: { 'User-Agent': 'NodeJS Script' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.gbp && json.gbp.eur) {
                        resolve(json.gbp.eur);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    console.error('Error parsing currency response:', e);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error('Currency request failed:', err);
            resolve(null);
        });
    });
}

module.exports = { getEthToEurRate, getGbpToEurRate };
