import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema.js';

/** Adapter untuk API database proyek menggunakan SQLite bawaan Node.js 22.13+. */
export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const nativeDb = new DatabaseSync(file);
  const db = {
    dialect: 'sqlite',
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

const POSTGRES_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 1,
    course TEXT NOT NULL,
    day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    course TEXT NOT NULL DEFAULT '',
    due_date TEXT NOT NULL DEFAULT '',
    remind_at TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
  );
  CREATE TABLE IF NOT EXISTS alarms (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 1,
    label TEXT NOT NULL,
    time TEXT NOT NULL,
    days TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
  );
  CREATE TABLE IF NOT EXISTS settings (
    user_id BIGINT NOT NULL DEFAULT 1,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  );
  CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions (token_hash, expires_at);
  CREATE INDEX IF NOT EXISTS sessions_user_order_idx ON sessions (user_id, day, start_time, id);
  CREATE INDEX IF NOT EXISTS tasks_user_order_idx ON tasks (user_id, done, due_date, id);
  CREATE INDEX IF NOT EXISTS alarms_user_order_idx ON alarms (user_id, time, id);
`;

function toPostgresPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function createPostgresAdapter(queryable) {
  return {
    dialect: 'postgres',
    prepare(sql) {
      const queryText = toPostgresPlaceholders(sql);
      const insertTable = /^\s*INSERT\s+INTO\s+([a-z_]+)/i.exec(sql)?.[1]?.toLowerCase();
      const returningId = insertTable && insertTable !== 'settings' && !/\bRETURNING\b/i.test(sql);
      const executableSql = returningId ? `${queryText} RETURNING id` : queryText;

      return {
        async get(...params) {
          const result = await queryable.query(queryText, params);
          return result.rows[0];
        },
        async all(...params) {
          const result = await queryable.query(queryText, params);
          return result.rows;
        },
        async run(...params) {
          const result = await queryable.query(executableSql, params);
          return {
            changes: result.rowCount,
            lastInsertRowid: result.rows[0]?.id ?? null,
          };
        },
      };
    },
  };
}

export async function createPostgresDatabase(pool) {
  await pool.query(POSTGRES_SCHEMA_SQL);
  const db = createPostgresAdapter(pool);
  return {
    ...db,
    async transaction(callback) {
      const client = await pool.connect();
      const transactionDb = createPostgresAdapter(client);
      try {
        await client.query('BEGIN');
        const result = await callback(transactionDb);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

/** Creates a shared PostgreSQL connection pool and initializes the persistent application schema. */
export async function openPostgresDatabase(connectionString) {
  if (!connectionString) throw new TypeError('DATABASE_URL harus diatur untuk PostgreSQL.');

  const { Pool, types } = await import('pg');
  types.setTypeParser(20, Number);
  const pool = new Pool({ connectionString, max: 5 });
  try {
    return await createPostgresDatabase(pool);
  } catch (error) {
    await pool.end();
    throw error;
  }
}
