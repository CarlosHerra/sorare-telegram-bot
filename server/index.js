const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { initDb } = require('./db');
const router = require('./routes');
const { startPolling } = require('./worker');
const { startTelegramUpdatePolling } = require('./services/telegramConnection');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
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
