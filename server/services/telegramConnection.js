const { getUpdates } = require('./telegram');

const pendingConnections = new Map(); // code -> { chatId, timestamp }
let lastUpdateId = 0;

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function startTelegramUpdatePolling() {
    console.log('Starting Telegram update polling...');

    const poll = async () => {
        try {
            const updates = await getUpdates(lastUpdateId + 1);
            for (const update of updates) {
                lastUpdateId = update.update_id;

                if (update.message && update.message.text) {
                    const text = update.message.text.trim();
                    const chatId = update.message.chat.id;

                    // Check if message is /start CODE or just CODE
                    let code = null;
                    if (text.startsWith('/start ')) {
                        code = text.split(' ')[1].toUpperCase();
                    } else if (text.length === 6) {
                        code = text.toUpperCase();
                    }

                    if (code && pendingConnections.has(code)) {
                        console.log(`Matched code ${code} to chatId ${chatId}`);
                        pendingConnections.set(code, {
                            chatId,
                            username: update.message.from.username,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error in Telegram poll loop:', error);
        }
        setTimeout(poll, 3000); // Poll every 3 seconds
    };

    poll();
}

function createPendingConnection() {
    const code = generateCode();
    pendingConnections.set(code, { chatId: null, timestamp: Date.now() });

    // Cleanup old codes after 10 minutes
    setTimeout(() => {
        if (pendingConnections.has(code) && !pendingConnections.get(code).chatId) {
            pendingConnections.delete(code);
        }
    }, 10 * 60 * 1000);

    return code;
}

function checkConnection(code) {
    const connection = pendingConnections.get(code);
    if (connection && connection.chatId) {
        // Return it and then cleanup
        pendingConnections.delete(code);
        return connection.chatId;
    }
    return null;
}

module.exports = {
    startTelegramUpdatePolling,
    createPendingConnection,
    checkConnection
};
