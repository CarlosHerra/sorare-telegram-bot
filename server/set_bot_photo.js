/**
 * One-time script to set the Telegram bot's profile photo using the app logo.
 * 
 * Usage: node set_bot_photo.js
 * 
 * Requires TELEGRAM_BOT_TOKEN in server/.env
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const LOGO_PATH = path.join(__dirname, '..', 'docs', 'sorare-sniper-logo.png');

async function setBotPhoto() {
    if (!BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN not set in .env');
        process.exit(1);
    }

    if (!fs.existsSync(LOGO_PATH)) {
        console.error('Logo file not found at:', LOGO_PATH);
        process.exit(1);
    }

    console.log('Setting bot profile photo...');

    // Read the file and create a FormData-like multipart request
    const fileBuffer = fs.readFileSync(LOGO_PATH);
    const boundary = '----BotPhotoUpload' + Date.now();

    const bodyParts = [
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="photo"; filename="logo.png"\r\n`,
        `Content-Type: image/png\r\n\r\n`,
    ];

    const bodyEnd = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
        Buffer.from(bodyParts.join('')),
        fileBuffer,
        Buffer.from(bodyEnd),
    ]);

    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyPhoto`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: bodyBuffer,
        });

        const data = await res.json();

        if (data.ok) {
            console.log('✅ Bot profile photo updated successfully!');
        } else {
            console.error('❌ Failed to set bot photo:', data.description);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    // Also set the bot description and short description
    try {
        const descRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: 'Sorare Sniper — Get instant Telegram alerts when Sorare card prices hit your target. Automate your market strategy.'
            }),
        });
        const descData = await descRes.json();
        if (descData.ok) {
            console.log('✅ Bot description updated!');
        } else {
            console.error('❌ Failed to set description:', descData.description);
        }
    } catch (error) {
        console.error('❌ Error setting description:', error.message);
    }

    try {
        const shortRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyShortDescription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                short_description: 'Sorare Sniper — Price alerts for Sorare cards via Telegram.'
            }),
        });
        const shortData = await shortRes.json();
        if (shortData.ok) {
            console.log('✅ Bot short description updated!');
        } else {
            console.error('❌ Failed to set short description:', shortData.description);
        }
    } catch (error) {
        console.error('❌ Error setting short description:', error.message);
    }
}

setBotPhoto();
