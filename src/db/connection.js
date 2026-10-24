import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema.js';

/** Adapter untuk API database proyek menggunakan SQLite bawaan Node.js 22.13+. */
export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const nativeDb = new DatabaseSync(file);
  const db = {
    prepare(sql) {
      const statement = nativeDb.prepare(sql);
      return {
        get: (...params) => statement.get(...params),
        all: (...params) => statement.all(...params),
        run: (...params) => {
          const result = statement.run(...params);
          return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
        },
      };
    },
    exec: (sql) => nativeDb.exec(sql),
    pragma: (value) => nativeDb.exec(`PRAGMA ${value}`),
    transaction(callback) {
      return (...args) => {
        nativeDb.exec('BEGIN');
        try {
          const result = callback(...args);
          nativeDb.exec('COMMIT');
          return result;
        } catch (error) {
          nativeDb.exec('ROLLBACK');
          throw error;
        }
      };
    },
    close: () => nativeDb.close(),
  };
  db.pragma('foreign_keys = ON');
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  for (const table of ['sessions', 'tasks', 'alarms']) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
    if (!columns.includes('user_id')) db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`);
  }
  const settingsColumns = db.prepare('PRAGMA table_info(settings)').all();
  if (!settingsColumns.some((column) => column.name === 'user_id')) {
    db.exec(`ALTER TABLE settings RENAME TO settings_legacy;
      CREATE TABLE settings (user_id INTEGER NOT NULL DEFAULT 1, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (user_id, key));
      INSERT OR IGNORE INTO settings (user_id, key, value) SELECT 1, key, value FROM settings_legacy;
      DROP TABLE settings_legacy;`);
  }
  return db;
}
