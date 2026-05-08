const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, envFile) });
const { initDb } = require('./db');
const router = require('./routes');
const authRouter = require('./routes/auth');
const { startPolling } = require('./worker');
const { startTelegramUpdatePolling } = require('./services/telegramConnection');

const app = express();
const PORT = process.env.PORT || 3002;

// Confía en el proxy inverso (ej. Cloudflare Tunnel) para que el Rate Limiting funcione correctamente con la IP real
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "img-src": ["'self'", "data:", "https://*.sorare.com"],
      "script-src": ["'self'", "'unsafe-inline'"], // Needed for some React/Vite setups
    }
  }
}));

// Restrict CORS in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL || true) // True allows the same origin when serving static files
    : '*', // Allow all in development
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Stricter limit for auth routes
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to routes
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api', router);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

async function startServer() {
  try {
    // Initialize DB
    await initDb();

    // Start Polling Worker
    startPolling();

    // Start Telegram Polling
    startTelegramUpdatePolling();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
