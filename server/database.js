import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use persistent disk path if available, otherwise use local
const dbPath = process.env.DATABASE_PATH || join(__dirname, '../data/leaderboard.db');
const dbDir = dirname(dbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize database schema
function initDatabase() {
  // Agents table - userId is ALWAYS NUMBER (following Adversus standard)
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      userId INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      groupId INTEGER,
      profileImageUrl TEXT,
      personalSoundUrl TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Leaderboards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      timePeriod TEXT NOT NULL CHECK(timePeriod IN ('day', 'week', 'month', 'custom')),
      customStartDate TEXT,
      customEndDate TEXT,
      groupId INTEGER,
      displayOrder INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 1,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Bonus tiers table (campaign-based bonus structure)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bonus_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignName TEXT NOT NULL,
      dealsRequired INTEGER NOT NULL,
      bonusPerDeal REAL NOT NULL,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(campaignName, dealsRequired)
    )
  `);

  // Agent bonus assignments
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_bonus_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      campaignName TEXT NOT NULL,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (userId) REFERENCES agents(userId),
      UNIQUE(userId, campaignName)
    )
  `);

  // Slideshow settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS slideshow_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      displayDuration INTEGER DEFAULT 10,
      enableSound INTEGER DEFAULT 1,
      standardSoundUrl TEXT,
      milestoneSoundUrl TEXT,
      milestoneThreshold REAL DEFAULT 3600,
      updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Insert default slideshow settings
  db.exec(`
    INSERT OR IGNORE INTO slideshow_settings (id, displayDuration, enableSound, milestoneThreshold)
    VALUES (1, 10, 1, 3600)
  `);

  console.log('Database initialized successfully at:', dbPath);
}

// Helper function to ensure userId is always NUMBER
function normalizeUserId(userId) {
  const normalized = Number(userId);
  if (isNaN(normalized)) {
    throw new Error(`Invalid userId: ${userId}. Must be a number.`);
  }
  return normalized;
}

// Agent operations
export const agentQueries = {
  getAll: db.prepare('SELECT * FROM agents ORDER BY name'),

  getById: db.prepare('SELECT * FROM agents WHERE userId = ?'),

  getByGroupId: db.prepare('SELECT * FROM agents WHERE groupId = ? ORDER BY name'),

  upsert: db.prepare(`
    INSERT INTO agents (userId, name, email, groupId, profileImageUrl, personalSoundUrl, updatedAt)
    VALUES (@userId, @name, @email, @groupId, @profileImageUrl, @personalSoundUrl, strftime('%s', 'now'))
    ON CONFLICT(userId) DO UPDATE SET
      name = @name,
      email = @email,
      groupId = @groupId,
      profileImageUrl = COALESCE(@profileImageUrl, profileImageUrl),
      personalSoundUrl = COALESCE(@personalSoundUrl, personalSoundUrl),
      updatedAt = strftime('%s', 'now')
  `),

  updateProfileImage: db.prepare(`
    UPDATE agents
    SET profileImageUrl = ?, updatedAt = strftime('%s', 'now')
    WHERE userId = ?
  `),

  updatePersonalSound: db.prepare(`
    UPDATE agents
    SET personalSoundUrl = ?, updatedAt = strftime('%s', 'now')
    WHERE userId = ?
  `),

  delete: db.prepare('DELETE FROM agents WHERE userId = ?')
};

// Leaderboard operations
export const leaderboardQueries = {
  getAll: db.prepare('SELECT * FROM leaderboards ORDER BY displayOrder, id'),

  getActive: db.prepare('SELECT * FROM leaderboards WHERE isActive = 1 ORDER BY displayOrder, id'),

  getById: db.prepare('SELECT * FROM leaderboards WHERE id = ?'),

  create: db.prepare(`
    INSERT INTO leaderboards (name, timePeriod, customStartDate, customEndDate, groupId, displayOrder, isActive)
    VALUES (@name, @timePeriod, @customStartDate, @customEndDate, @groupId, @displayOrder, @isActive)
  `),

  update: db.prepare(`
    UPDATE leaderboards
    SET name = @name,
        timePeriod = @timePeriod,
        customStartDate = @customStartDate,
        customEndDate = @customEndDate,
        groupId = @groupId,
        displayOrder = @displayOrder,
        isActive = @isActive,
        updatedAt = strftime('%s', 'now')
    WHERE id = @id
  `),

  delete: db.prepare('DELETE FROM leaderboards WHERE id = ?')
};

// Bonus tier operations
export const bonusTierQueries = {
  getAllByCampaign: db.prepare('SELECT * FROM bonus_tiers WHERE campaignName = ? ORDER BY dealsRequired'),

  getAll: db.prepare('SELECT * FROM bonus_tiers ORDER BY campaignName, dealsRequired'),

  upsert: db.prepare(`
    INSERT INTO bonus_tiers (campaignName, dealsRequired, bonusPerDeal)
    VALUES (@campaignName, @dealsRequired, @bonusPerDeal)
    ON CONFLICT(campaignName, dealsRequired) DO UPDATE SET
      bonusPerDeal = @bonusPerDeal
  `),

  delete: db.prepare('DELETE FROM bonus_tiers WHERE id = ?'),

  deleteByCampaign: db.prepare('DELETE FROM bonus_tiers WHERE campaignName = ?')
};

// Agent bonus assignment operations
export const agentBonusQueries = {
  getByUserId: db.prepare(`
    SELECT ab.*, bt.dealsRequired, bt.bonusPerDeal
    FROM agent_bonus_assignments ab
    LEFT JOIN bonus_tiers bt ON ab.campaignName = bt.campaignName
    WHERE ab.userId = ?
    ORDER BY bt.campaignName, bt.dealsRequired
  `),

  assign: db.prepare(`
    INSERT INTO agent_bonus_assignments (userId, campaignName)
    VALUES (@userId, @campaignName)
    ON CONFLICT(userId, campaignName) DO NOTHING
  `),

  unassign: db.prepare('DELETE FROM agent_bonus_assignments WHERE userId = ? AND campaignName = ?')
};

// Slideshow settings operations
export const slideshowQueries = {
  get: db.prepare('SELECT * FROM slideshow_settings WHERE id = 1'),

  update: db.prepare(`
    UPDATE slideshow_settings
    SET displayDuration = @displayDuration,
        enableSound = @enableSound,
        standardSoundUrl = @standardSoundUrl,
        milestoneSoundUrl = @milestoneSoundUrl,
        milestoneThreshold = @milestoneThreshold,
        updatedAt = strftime('%s', 'now')
    WHERE id = 1
  `)
};

// Initialize database on import
initDatabase();

export { db, normalizeUserId };
