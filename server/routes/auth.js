const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const { generateToken, authenticateToken } = require('../auth');
const {
    getAuthorizationUrl,
    exchangeCodeForTokens,
    getCurrentUser,
} = require('../services/sorareAuth');
const router = express.Router();

// ─── OAuth 2.0 "Login with Sorare" ────────────────────────────────────────────

/**
 * Build the OAuth callback URL from the current request.
 */
function getCallbackUrl(req) {
    if (process.env.SORARE_OAUTH_CALLBACK_URL) {
        return process.env.SORARE_OAUTH_CALLBACK_URL;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}/api/auth/sorare/callback`;
}

/**
 * GET /auth/sorare
 * Redirects the user to Sorare's OAuth authorization page.
 */
router.get('/sorare', (req, res) => {
    try {
        const callbackUrl = getCallbackUrl(req);
        const authUrl = getAuthorizationUrl(callbackUrl);
        res.redirect(authUrl);
    } catch (error) {
        console.error('OAuth redirect error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /auth/sorare/callback
 * Handles the OAuth callback from Sorare after user authorization.
 */
router.get('/sorare/callback', async (req, res) => {
    const { code, error: oauthError } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (oauthError) {
        console.error('OAuth authorization denied:', oauthError);
        return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
        return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent('No authorization code received')}`);
    }

    try {
        const callbackUrl = getCallbackUrl(req);

        // Step 1: Exchange the code for tokens
        const tokens = await exchangeCodeForTokens(code, callbackUrl);

        // Step 2: Get the current user's profile from Sorare
        const sorareUser = await getCurrentUser(tokens.access_token);

        // Step 3: Upsert user in local DB
        const db = await getDb();
        let user = await db.get('SELECT * FROM users WHERE sorareSlug = ?', [sorareUser.slug]);

        if (user) {
            await db.run(
                'UPDATE users SET sorareJwtToken = ?, sorareAvatarUrl = ?, sorareUsername = ?, sorareRefreshToken = ? WHERE id = ?',
                [tokens.access_token, sorareUser.avatarUrl, sorareUser.nickname || sorareUser.slug, tokens.refresh_token, user.id]
            );
        } else {
            const insertResult = await db.run(
                'INSERT INTO users (sorareSlug, sorareUsername, sorareJwtToken, sorareRefreshToken, sorareAvatarUrl) VALUES (?, ?, ?, ?, ?)',
                [sorareUser.slug, sorareUser.nickname || sorareUser.slug, tokens.access_token, tokens.refresh_token, sorareUser.avatarUrl]
            );
            user = { id: insertResult.lastID };
        }

        // Step 4: Issue our own app JWT
        const appToken = generateToken(user.id);

        // Step 5: Redirect to frontend with the token
        res.redirect(`${frontendUrl}?token=${encodeURIComponent(appToken)}`);

    } catch (error) {
        console.error('OAuth callback error:', error.message);
        res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(error.message)}`);
    }
});

// ─── Local Email/Password Auth ─────────────────────────────────────────────────

/**
 * POST /auth/register
 * Create a new local account with email and password.
 */
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    try {
        const db = await getDb();
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (email, passwordHash) VALUES (?, ?)',
            [email, hashedPassword]
        );
        const token = generateToken(result.lastID);
        res.status(201).json({ token, userId: result.lastID, email });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /auth/login
 * Sign in with an existing local account.
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    try {
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateToken(user.id);
        res.json({ token, userId: user.id, email: user.email, telegramChatId: user.telegramChatId, sorareUsername: user.sorareUsername });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Profile Endpoints ────────────────────────────────────────────────────────

/**
 * GET /auth/me — Get authenticated user profile.
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const db = await getDb();
        const user = await db.get(
            'SELECT id, email, telegramChatId, sorareUsername, sorareSlug, sorareAvatarUrl FROM users WHERE id = ?',
            [req.user.userId]
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /auth/me — Update profile (Telegram linking + Sorare username).
 */
router.put('/me', authenticateToken, async (req, res) => {
    const { telegramChatId, sorareUsername } = req.body;
    try {
        const db = await getDb();
        await db.run('UPDATE users SET telegramChatId = ?, sorareUsername = ? WHERE id = ?', [telegramChatId, sorareUsername, req.user.userId]);
        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
