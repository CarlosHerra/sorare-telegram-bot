// Node.js 18+ has global fetch

async function getMe() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    const url = `https://api.telegram.org/bot${token}/getMe`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.ok ? data.result : null;
    } catch (error) {
        console.error('Error getting bot info:', error);
        return null;
    }
}

async function getUpdates(offset = 0) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return [];
    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=10`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.ok ? data.result : [];
    } catch (error) {
        console.error('Error getting updates:', error);
        return [];
    }
}

async function sendMessage(chatId, message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return false;
    }
    if (!chatId || String(chatId).trim() === '') {
        console.error('sendMessage called with empty chatId');
        return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message
            })
        });
        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram API error:', data);
            return false;
        } else {
            console.log(`Message sent to ${chatId}`);
            return true;
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return false;
    }
}

async function sendPhotoAlert(chatId, alertData) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return false;
    }
    if (!chatId || String(chatId).trim() === '') {
        console.error('sendPhotoAlert called with empty chatId');
        return false;
    }

    const {
        playerDisplayName,
        cardSlug,
        pictureUrl,
        serialNumber,
        seasonYear,
        rarity,
        currentPrice,
        threshold
    } = alertData;

    // Build card details string
    const seasonDisplay = seasonYear ? `${seasonYear}-${(seasonYear + 1).toString().slice(-2)}` : '';
    const cardDetails = `${playerDisplayName} ${seasonDisplay} • ${rarity} ${serialNumber || ''}`.trim();

    // Build HTML caption
    const caption = `🚨 <b>Price Alert</b>

<b>${playerDisplayName}</b>
${cardDetails}

💰 <b>Current Price:</b> ${currentPrice.amount.toFixed(2)} ${currentPrice.currency}
🎯 <b>Threshold:</b> ${threshold.amount.toFixed(2)} ${threshold.currency}

🔗 <a href="https://sorare.com/cards/${cardSlug}">View on Sorare</a>`;

    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: pictureUrl,
                caption: caption,
                parse_mode: 'HTML'
            })
        });
        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram API error in photo:', data);
            // Fallback to text message if photo fails
            return await sendMessage(chatId, caption.replace(/<[^>]*>/g, ''));
        } else {
            console.log(`Photo alert sent to ${chatId}`);
            return true;
        }
    } catch (error) {
        console.error('Error sending Telegram photo:', error);
        // Fallback to text message
        return await sendMessage(chatId, caption.replace(/<[^>]*>/g, ''));
    }
}

module.exports = { sendMessage, sendPhotoAlert, getMe, getUpdates };
