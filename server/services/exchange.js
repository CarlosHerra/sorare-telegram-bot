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

function convertCurrency(amount, fromCurrency, toCurrency, ethToEurRate) {
    if (fromCurrency === toCurrency) return amount;

    if (fromCurrency === 'ETH') {
        if (toCurrency === 'EUR') return amount * ethToEurRate;
        if (toCurrency === 'USD') return amount * ethToEurRate * 1.08;
    } else if (fromCurrency === 'EUR') {
        if (toCurrency === 'USD') return amount * 1.08;
        if (toCurrency === 'ETH') return amount / ethToEurRate;
    } else if (fromCurrency === 'USD') {
        if (toCurrency === 'EUR') return amount / 1.08;
        if (toCurrency === 'ETH') return (amount / 1.08) / ethToEurRate;
    }
    
    return amount;
}

module.exports = { getEthToEurRate, getGbpToEurRate, convertCurrency };
