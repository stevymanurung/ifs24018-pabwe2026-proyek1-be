import { hkdfSync } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const resolveDatabaseUrl = (env = process.env) => env.DATABASE_URL || env.POSTGRES_URL || '';
export const resolveAuthTokenSecret = (env = process.env) => {
  const configuredSecret = env.AUTH_TOKEN_SECRET || '';
  if (configuredSecret) return configuredSecret;

  const databaseUrl = resolveDatabaseUrl(env);
  if (!databaseUrl) return '';

  return Buffer.from(
    hkdfSync('sha256', Buffer.from(databaseUrl), Buffer.from('study-planner-auth-token'), Buffer.from('v1'), 32),
  ).toString('hex');
};
const authTokenSecret = resolveAuthTokenSecret();
const databaseUrl = resolveDatabaseUrl();

if (process.env.VERCEL && !databaseUrl) {
  throw new Error('DATABASE_URL atau POSTGRES_URL wajib diatur ke PostgreSQL persisten; SQLite di /tmp tidak persisten di Vercel.');
}
if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && authTokenSecret.length < 32) {
  throw new Error('AUTH_TOKEN_SECRET wajib diatur minimal 32 karakter, atau DATABASE_URL/POSTGRES_URL harus tersedia untuk membuatnya di production.');
}

/** Konfigurasi aplikasi dibaca satu kali dari environment variable. */
export const config = Object.freeze({
  port: Number(process.env.PORT) || 3001,
  dbFile: process.env.DB_FILE || (process.env.VERCEL ? '/tmp/planner.db' : path.join(serverRoot, 'data', 'planner.db')),
  databaseUrl,
  clientDist: process.env.CLIENT_DIST || path.resolve(serverRoot, '../client/dist'),
  corsOrigin: process.env.CORS_ORIGIN || '',
  authTokenSecret,
  seedDemo: process.env.SEED_DEMO === 'true',
  isTest: process.env.NODE_ENV === 'test',
});
