import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(__dirname, 'fashionai.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Running migration: Add try_ons table...\n');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS try_ons (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      garment_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      person_image    TEXT    NOT NULL,
      result_image    TEXT    NOT NULL,
      processing_time INTEGER,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tryons_user_id ON try_ons(user_id);
    CREATE INDEX IF NOT EXISTS idx_tryons_created_at ON try_ons(created_at);
  `);

  console.log('✓ Migration completed successfully');
  console.log('  - Created try_ons table');
  console.log('  - Created indexes for user_id and created_at');
  console.log('\nThe try_ons table is now ready to store virtual try-on results.');
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}

db.close();
