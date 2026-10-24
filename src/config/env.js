import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const authTokenSecret = process.env.AUTH_TOKEN_SECRET || '';

if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && authTokenSecret.length < 32) {
  throw new Error('AUTH_TOKEN_SECRET wajib diatur minimal 32 karakter di production.');
}

/** Konfigurasi aplikasi dibaca satu kali dari environment variable. */
export const config = Object.freeze({
  port: Number(process.env.PORT) || 3001,
  dbFile: process.env.DB_FILE || (process.env.VERCEL ? '/tmp/planner.db' : path.join(serverRoot, 'data', 'planner.db')),
  clientDist: process.env.CLIENT_DIST || path.resolve(serverRoot, '../client/dist'),
  corsOrigin: process.env.CORS_ORIGIN || '',
  authTokenSecret,
  seedDemo: process.env.SEED_DEMO === 'true',
  isTest: process.env.NODE_ENV === 'test',
});
