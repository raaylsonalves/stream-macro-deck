const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = process.env.MACRO_WRITABLE_PATH || path.join(__dirname, '..', 'data');
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
    
    this.db = new sqlite3.Database(path.join(this.dbPath, 'db.sqlite'), (err) => {
      if (err) {
        console.error('[DB] Error opening database', err.message);
      } else {
        console.log('[DB] Connected to the SQLite database.');
        this.initTables();
      }
    });
  }

  initTables() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS pages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT DEFAULT 'grid',
          grid_rows INTEGER DEFAULT 3,
          grid_cols INTEGER DEFAULT 5
        )
      `);

      // Migration: Add 'type' column to 'pages' if it doesn't exist
      this.db.all("PRAGMA table_info(pages)", (err, rows) => {
        if (!err && rows && !rows.find(r => r.name === 'type')) {
          this.db.run("ALTER TABLE pages ADD COLUMN type TEXT DEFAULT 'grid'");
        }
      });

      this.db.run(`
        CREATE TABLE IF NOT EXISTS buttons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          page_id INTEGER NOT NULL,
          row_index INTEGER NOT NULL,
          col_index INTEGER NOT NULL,
          text TEXT,
          color TEXT,
          icon TEXT,
          FOREIGN KEY (page_id) REFERENCES pages(id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          button_id INTEGER NOT NULL,
          plugin_id TEXT NOT NULL,
          action_id TEXT NOT NULL,
          payload TEXT,
          FOREIGN KEY (button_id) REFERENCES buttons(id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS plugin_configs (
          plugin_id TEXT PRIMARY KEY,
          config_json TEXT NOT NULL
        )
      `, () => {
        console.log('[DB] Tables initialized');
      });
      
      // Insert a default page if none exists
      this.db.get("SELECT COUNT(*) as count FROM pages", (err, row) => {
        if (!err && row.count === 0) {
          this.db.run("INSERT INTO pages (name) VALUES ('Default Page')");
        }
      });
    });
  }
}

module.exports = new Database();
