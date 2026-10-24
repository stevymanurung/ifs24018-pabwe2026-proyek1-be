import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseUrl } from '../../src/config/env.js';

test('database config uses DATABASE_URL first and supports Vercel POSTGRES_URL', () => {
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: 'postgres://primary', POSTGRES_URL: 'postgres://vercel' }), 'postgres://primary');
  assert.equal(resolveDatabaseUrl({ POSTGRES_URL: 'postgres://vercel' }), 'postgres://vercel');
  assert.equal(resolveDatabaseUrl({}), '');
});
