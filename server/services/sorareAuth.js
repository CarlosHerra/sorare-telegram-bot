const bcryptjs = require('bcryptjs');
const { GraphQLClient, gql } = require('graphql-request');

const SORARE_API_URL = 'https://api.sorare.com';
const SORARE_GRAPHQL_URL = `${SORARE_API_URL}/graphql`;
const AUD = 'sorare-sniper-app';

// ─── OAuth 2.0 Functions ───────────────────────────────────────────────────────

/**
 * Exchange an OAuth authorization code for access + refresh tokens.
 * POST https://api.sorare.com/oauth/token
 */
async function exchangeCodeForTokens(code, redirectUri) {
    const clientId = process.env.SORARE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SORARE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('SORARE_OAUTH_CLIENT_ID and SORARE_OAUTH_CLIENT_SECRET must be set in .env');
    }

    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
    });

    const res = await fetch(`${SORARE_API_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to exchange code for tokens: ${res.status} ${text}`);
    }

    const data = await res.json();
    // data = { access_token, refresh_token, token_type, expires_in, scope, created_at }
    return data;
}

/**
 * Refresh an expired OAuth access token.
 * POST https://api.sorare.com/oauth/token
 */
async function refreshAccessToken(refreshToken) {
    const clientId = process.env.SORARE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SORARE_OAUTH_CLIENT_SECRET;

    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    });

    const res = await fetch(`${SORARE_API_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to refresh token: ${res.status} ${text}`);
    }

    return await res.json();
}

/**
 * Query Sorare GraphQL API for the current user's profile using an OAuth access token.
 */
async function getCurrentUser(accessToken) {
    const client = new GraphQLClient(SORARE_GRAPHQL_URL, {
        headers: {
            'content-type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    const query = gql`
        query CurrentUserQuery {
            currentUser {
                slug
                nickname
                avatarUrl
            }
        }
    `;

    const data = await client.request(query);

    if (!data.currentUser) {
        throw new Error('Failed to retrieve current user from Sorare');
    }

    return data.currentUser;
}

/**
 * Build the Sorare OAuth authorization URL.
 */
function getAuthorizationUrl(redirectUri) {
    const clientId = process.env.SORARE_OAUTH_CLIENT_ID;
    if (!clientId) {
        throw new Error('SORARE_OAUTH_CLIENT_ID must be set in .env');
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: '',
    });

    return `https://sorare.com/oauth/authorize?${params.toString()}`;
}

// ─── Direct SignIn Functions (fallback) ────────────────────────────────────────

/**
 * Retrieve the bcrypt salt for a Sorare user by email.
 */
async function getSalt(email) {
    const res = await fetch(`${SORARE_API_URL}/api/v1/users/${encodeURIComponent(email)}`);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to retrieve salt for ${email}: ${res.status} ${text}`);
    }
    const data = await res.json();
    if (!data.salt) {
        throw new Error('No salt returned. Check if the email is registered on Sorare.');
    }
    return data.salt;
}

/**
 * Hash a password using the provided bcrypt salt.
 */
function hashPassword(password, salt) {
    return bcryptjs.hashSync(password, salt);
}

const SIGN_IN_MUTATION = gql`
    mutation SignInMutation($input: signInInput!) {
        signIn(input: $input) {
            currentUser {
                slug
                nickname
                avatarUrl
            }
            jwtToken(aud: "${AUD}") {
                token
                expiredAt
            }
            otpSessionChallenge
            tcuToken
            errors {
                message
            }
        }
    }
`;

/**
 * Sign in to Sorare with email + hashed password.
 */
async function signIn(email, hashedPassword) {
    const client = new GraphQLClient(SORARE_GRAPHQL_URL, {
        headers: { 'content-type': 'application/json' },
    });

    const data = await client.request(SIGN_IN_MUTATION, {
        input: { email, password: hashedPassword },
    });

    return data.signIn;
}

/**
 * Complete 2FA sign-in.
 */
async function signInWith2FA(otpSessionChallenge, otpAttempt) {
    const client = new GraphQLClient(SORARE_GRAPHQL_URL, {
        headers: { 'content-type': 'application/json' },
    });

    const data = await client.request(SIGN_IN_MUTATION, {
        input: { otpSessionChallenge, otpAttempt },
    });

    return data.signIn;
}

/**
 * Full direct authentication flow: get salt, hash password, call signIn.
 */
async function authenticate(email, password) {
    const salt = await getSalt(email);
    const hashedPassword = hashPassword(password, salt);
    const result = await signIn(email, hashedPassword);

    if (result.errors && result.errors.length > 0) {
        return { success: false, errors: result.errors.map(e => e.message) };
    }

    if (result.tcuToken) {
        return { success: false, requiresTCU: true, tcuToken: result.tcuToken };
    }

    if (!result.currentUser && result.otpSessionChallenge) {
        return { success: false, requires2FA: true, otpSessionChallenge: result.otpSessionChallenge };
    }

    if (result.currentUser && result.jwtToken) {
        return { success: true, currentUser: result.currentUser, jwtToken: result.jwtToken };
    }

    return { success: false, errors: ['Unknown authentication error'] };
}

/**
 * Complete 2FA and return structured result.
 */
async function complete2FA(otpSessionChallenge, otpAttempt) {
    const result = await signInWith2FA(otpSessionChallenge, otpAttempt);

    if (result.errors && result.errors.length > 0) {
        return { success: false, errors: result.errors.map(e => e.message) };
    }

    if (result.currentUser && result.jwtToken) {
        return { success: true, currentUser: result.currentUser, jwtToken: result.jwtToken };
    }

    return { success: false, errors: ['2FA verification failed'] };
}

module.exports = {
    // OAuth
    getAuthorizationUrl,
    exchangeCodeForTokens,
    refreshAccessToken,
    getCurrentUser,
    // Direct signIn (fallback)
    authenticate,
    complete2FA,
};
