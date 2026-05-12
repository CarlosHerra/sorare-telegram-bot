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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      passwordHash TEXT,
      googleId TEXT,
      telegramChatId TEXT,
      sorareUsername TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerSlug TEXT NOT NULL,
      rarity TEXT NOT NULL,
      priceThreshold REAL NOT NULL,
      currency TEXT DEFAULT 'ETH',
      telegramChatId TEXT NOT NULL,
      season INTEGER,
      version INTEGER DEFAULT 1
    )
  `);

  // Table to track sent alerts for daily deduplication
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sent_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alertId INTEGER NOT NULL,
      cardSlug TEXT NOT NULL,
      dateSent TEXT NOT NULL,
      alertVersion INTEGER DEFAULT 1,
      UNIQUE(alertId, cardSlug, dateSent, alertVersion)
    )
  `);

  // Migrations for existing tables
  try {
    await db.run('ALTER TABLE alerts ADD COLUMN season INTEGER');
    console.log('Added season column to alerts table');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE alerts ADD COLUMN userId INTEGER');
    console.log('Added userId column to alerts table');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE users ADD COLUMN sorareUsername TEXT');
    console.log('Added sorareUsername column to users table');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE users ADD COLUMN sorareSlug TEXT');
    console.log('Added sorareSlug column to users table');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE users ADD COLUMN sorareJwtToken TEXT');
    console.log('Added sorareJwtToken column to users table');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE users ADD COLUMN sorareAvatarUrl TEXT');
    console.log('Added sorareAvatarUrl column to users table');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE users ADD COLUMN sorareRefreshToken TEXT');
    console.log('Added sorareRefreshToken column to users table');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE alerts ADD COLUMN version INTEGER DEFAULT 1');
    console.log('Added version column to alerts table');
  } catch (e) { }

  // Migration: add cardType column to alerts
  try {
    await db.run('ALTER TABLE alerts ADD COLUMN cardType TEXT');
    console.log('Added cardType column to alerts table');

    // Migrate existing data: compute current season year
    const now = new Date();
    const currentSeason = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    
    // Alerts with season = current year → in_season
    await db.run('UPDATE alerts SET cardType = ? WHERE season = ?', ['in_season', currentSeason]);
    // Alerts with a specific past season → classic (exclude future seasons)
    await db.run('UPDATE alerts SET cardType = ? WHERE season IS NOT NULL AND season < ? AND cardType IS NULL', ['classic', currentSeason]);
    // Alerts with no season remain cardType = null (meaning "any")
    console.log('Migrated existing alerts to cardType');
  } catch (e) { }

  try {
    await db.run('ALTER TABLE sent_alerts ADD COLUMN alertVersion INTEGER DEFAULT 1');
    console.log('Added alertVersion column to sent_alerts table');

    // SQLite doesn't support easy ALTER TABLE to change UNIQUE constraints.
    // For this simple app, we'll recreate the sent_alerts table if the constraint is old,
    // or just rely on the new column being part of the check logic.
    // To properly update the UNIQUE constraint:
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sent_alerts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alertId INTEGER NOT NULL,
        cardSlug TEXT NOT NULL,
        dateSent TEXT NOT NULL,
        alertVersion INTEGER DEFAULT 1,
        UNIQUE(alertId, cardSlug, dateSent, alertVersion)
      );
      INSERT OR IGNORE INTO sent_alerts_new (id, alertId, cardSlug, dateSent, alertVersion)
      SELECT id, alertId, cardSlug, dateSent, COALESCE(alertVersion, 1) FROM sent_alerts;
      DROP TABLE sent_alerts;
      ALTER TABLE sent_alerts_new RENAME TO sent_alerts;
    `);
    console.log('Migrated sent_alerts table with new UNIQUE constraint');
  } catch (e) {
    // If it fails (e.g. column already exists), we just continue
  }

  // Table to cache prices retrieved by the polling worker to avoid duplicated external api requests
  await db.exec(`
    CREATE TABLE IF NOT EXISTS card_prices_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerSlug TEXT NOT NULL,
      rarity TEXT NOT NULL,
      season TEXT NOT NULL DEFAULT 'any',
      price REAL,
      currency TEXT,
      playerPictureUrl TEXT,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(playerSlug, rarity, season)
    )
  `);

  console.log('Database initialized');

  // Gallery tracker tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_global_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      rarity TEXT NOT NULL,
      thresholdValue REAL,
      currency TEXT DEFAULT 'ETH',
      enabled INTEGER DEFAULT 0,
      UNIQUE(userId, rarity)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_card_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      playerSlug TEXT NOT NULL,
      rarity TEXT NOT NULL,
      thresholdValue REAL,
      currency TEXT DEFAULT 'ETH',
      enabled INTEGER DEFAULT 0,
      UNIQUE(userId, playerSlug, rarity)
    )
  `);
}

module.exports = { getDb, initDb };
