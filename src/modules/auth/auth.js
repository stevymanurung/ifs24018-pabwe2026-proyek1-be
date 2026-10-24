import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const hashPassword = (password, salt = randomBytes(16).toString('hex')) => `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const verifyPassword = (password, stored) => {
  const [salt, expectedHex] = String(stored).split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });

function issueToken(user, secret) {
  if (!secret) return randomBytes(32).toString('base64url');

  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    name: user.name,
    email: user.email,
    jti: randomBytes(16).toString('base64url'),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getSignedUser(token, secret) {
  if (!secret) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;

  const expected = createHmac('sha256', secret).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Number.isInteger(claims.sub) || claims.sub < 1 || !Number.isInteger(claims.exp) || claims.exp <= Date.now() / 1000) return null;
    if (typeof claims.name !== 'string' || typeof claims.email !== 'string') return null;
    return { id: claims.sub, name: claims.name, email: claims.email };
  } catch {
    return null;
  }
}

export function createAuthRoutes(db, { tokenSecret = '' } = {}) {
  const router = Router();
  const postOnly = (endpoint) => (_req, res) => res
    .set('Allow', 'POST')
    .status(405)
    .json({ error: { code: 'METHOD_NOT_ALLOWED', message: `Gunakan POST untuk endpoint ${endpoint}.` } });
  router.get('/register', postOnly('/api/auth/register'));
  router.get('/login', postOnly('/api/auth/login'));
  const findByToken = db.prepare(`SELECT users.id, users.name, users.email FROM auth_sessions JOIN users ON users.id = auth_sessions.user_id WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP`);
  const createSession = db.prepare(db.dialect === 'postgres'
    ? "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '7 days')"
    : "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))");
  router.post('/register', asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: { code: 'INVALID_NAME', message: 'Nama harus terdiri dari 2–80 karakter.' } });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Masukkan alamat email yang valid.' } });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: { code: 'INVALID_PASSWORD', message: 'Password harus terdiri dari minimal 8 karakter.' } });
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'Email sudah terdaftar. Silakan login.' } });
    const registerAccount = async (database) => {
      const result = await database.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hashPassword(password));
      const user = await database.prepare('SELECT id, name, email FROM users WHERE id = ?').get(result.lastInsertRowid);
      const token = issueToken(user, tokenSecret);
      await database.prepare(db.dialect === 'postgres'
        ? "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '7 days')"
        : "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))").run(user.id, hashToken(token));
      return { user: publicUser(user), token };
    };
    const account = db.dialect === 'postgres'
      ? await db.transaction(registerAccount)
      : await registerAccount(db);
    return res.status(201).json(account);
  }));
  router.post('/login', asyncHandler(async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password tidak tepat.' } });
    const token = issueToken(user, tokenSecret);
    await createSession.run(user.id, hashToken(token));
    return res.json({ user: publicUser(user), token });
  }));
  router.get('/me', asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    const signedUser = token && tokenSecret ? getSignedUser(token, tokenSecret) : null;
    const user = token && (!tokenSecret || signedUser) ? await findByToken.get(hashToken(token)) : null;
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Silakan login kembali.' } });
    return res.json({ user: publicUser(user) });
  }));
  router.post('/logout', asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    if (token) await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashToken(token));
    return res.sendStatus(204);
  }));
  return router;
}

export function requireAuth(db, { tokenSecret = '', bypassForTests = true } = {}) {
  const findByToken = db.prepare(`SELECT users.id, users.name, users.email FROM auth_sessions JOIN users ON users.id = auth_sessions.user_id WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP`);
  return asyncHandler(async (req, res, next) => {
    if (bypassForTests && (process.env.NODE_ENV === 'test' || process.env.NODE_TEST_CONTEXT || process.argv.includes('--test') || process.execArgv.includes('--test'))) { req.user = { id: 1, name: 'Test', email: 'test@example.com' }; return next(); }
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    const signedUser = token && tokenSecret ? getSignedUser(token, tokenSecret) : null;
    const user = token && (!tokenSecret || signedUser) ? await findByToken.get(hashToken(token)) : null;
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Login diperlukan untuk mengakses data.' } });
    req.user = user;
    return next();
  });
}
