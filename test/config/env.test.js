import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAuthTokenSecret, resolveDatabaseUrl } from '../../src/config/env.js';

test('database config uses DATABASE_URL first and supports Vercel POSTGRES_URL', () => {
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: 'postgres://primary', POSTGRES_URL: 'postgres://vercel' }), 'postgres://primary');
  assert.equal(resolveDatabaseUrl({ POSTGRES_URL: 'postgres://vercel' }), 'postgres://vercel');
  assert.equal(resolveDatabaseUrl({}), '');
});

test('auth secret prefers configured secret and derives a stable secret from database URL otherwise', () => {
  const databaseUrl = 'postgres://user:password@host/database';

  assert.equal(resolveAuthTokenSecret({ AUTH_TOKEN_SECRET: 'x'.repeat(32), DATABASE_URL: databaseUrl }), 'x'.repeat(32));
  assert.equal(resolveAuthTokenSecret({ DATABASE_URL: databaseUrl }), resolveAuthTokenSecret({ DATABASE_URL: databaseUrl }));
  assert.equal(resolveAuthTokenSecret({ DATABASE_URL: databaseUrl }).length, 64);
  assert.equal(resolveAuthTokenSecret({}), '');
});
