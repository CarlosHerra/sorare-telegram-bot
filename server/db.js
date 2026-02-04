const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  return dbInstance;
}

async function initDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerSlug TEXT NOT NULL,
      rarity TEXT NOT NULL,
      priceThreshold REAL NOT NULL,
      currency TEXT DEFAULT 'ETH',
      telegramChatId TEXT NOT NULL,
      season INTEGER
    )
  `);

  // Table to track sent alerts for daily deduplication
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sent_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alertId INTEGER NOT NULL,
      cardSlug TEXT NOT NULL,
      dateSent TEXT NOT NULL,
      UNIQUE(alertId, cardSlug, dateSent)
    )
  `);

  try {
    await db.run('ALTER TABLE alerts ADD COLUMN season INTEGER');
    console.log('Added season column to alerts table');
  } catch (e) {
    // Ignore error if column already exists
  }

  console.log('Database initialized');
}

module.exports = { getDb, initDb };
