let ratesCache = { data: null, timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (Sorare rates don't change every second)

async function refreshRates() {
    const now = Date.now();
    if (ratesCache.data && (now - ratesCache.timestamp < CACHE_TTL)) {
        return ratesCache.data;
    }

    const { getExchangeRates } = require('./sorare');
    const newRates = await getExchangeRates();
    
    if (newRates) {
        ratesCache = { data: newRates, timestamp: now };
        return newRates;
    }
    return ratesCache.data; // Fallback
}

async function getEthToEurRate() {
    const rates = await refreshRates();
    return rates?.eth?.eur || null;
}

async function getGbpToEurRate() {
    const rates = await refreshRates();
    if (rates?.eth?.eur && rates?.eth?.gbp) {
        // Calculate EUR per GBP: eth_eur / eth_gbp
        return rates.eth.eur / rates.eth.gbp;
    }
    return null;
}

async function getRates() {
    return await refreshRates();
}

/**
 * Universal currency converter using Sorare-native rates.
 */
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;
    if (!rates || !rates.eth) return amount;

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Helper to get rate relative to ETH (1 ETH = X currency)
    const getEthRate = (currency) => {
        if (currency === 'ETH') return 1;
        const key = currency.toLowerCase();
        return rates.eth[key] || null;
    };

    const rateFrom = getEthRate(from);
    const rateTo = getEthRate(to);

    if (rateFrom && rateTo) {
        return amount * (rateTo / rateFrom);
    }
    
    // Fallback if rates are missing
    return amount;
}

module.exports = { getEthToEurRate, getGbpToEurRate, getRates, convertCurrency };
