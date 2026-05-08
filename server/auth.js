const jwt = require('jsonwebtoken');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: require('path').join(__dirname, envFile) });
const { getDb } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_do_not_use_in_prod';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_for_development_do_not_use_in_prod')) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in production environment. Ensure it is set in .env');
    process.exit(1);
}
function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

async function checkAlertOwnership(req, res, next) {
    const { id } = req.params;
    if (!id) return next();

    try {
        const db = await getDb();
        const alert = await db.get('SELECT userId FROM alerts WHERE id = ?', [id]);

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        if (alert.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this alert' });
        }

        next();
    } catch (error) {
        console.error('Error checking alert ownership:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { generateToken, authenticateToken, checkAlertOwnership };
