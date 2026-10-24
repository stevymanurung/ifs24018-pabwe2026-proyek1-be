import assert from 'node:assert/strict';
import test from 'node:test';
import { cors } from '../../src/middleware/cors.js';

function runCors(origins, { origin, method = 'GET' }) {
  const headers = {};
  let status;
  let nextCalled = false;
  const req = { method, get: (name) => (name === 'Origin' ? origin : undefined) };
  const res = {
    set: (name, value) => { headers[name] = value; return res; },
    vary: (name) => { headers.Vary = name; return res; },
    sendStatus: (code) => { status = code; return res; },
  };

  cors(origins)(req, res, () => { nextCalled = true; });
  return { headers, status, nextCalled };
}

test('CORS mengizinkan Authorization dan preflight untuk origin frontend yang diizinkan', () => {
  const result = runCors('https://planner.vercel.app', {
    origin: 'https://planner.vercel.app',
    method: 'OPTIONS',
  });

  assert.equal(result.status, 204);
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://planner.vercel.app');
  assert.equal(result.headers['Access-Control-Allow-Headers'], 'Content-Type, Authorization');
  assert.equal(result.headers.Vary, 'Origin');
});

test('CORS mendukung daftar origin dan menolak origin yang tidak diizinkan', () => {
  const allowed = runCors('https://planner.vercel.app, https://planner-preview.vercel.app', {
    origin: 'https://planner-preview.vercel.app',
  });
  const rejected = runCors('https://planner.vercel.app', { origin: 'https://attacker.example' });

  assert.equal(allowed.headers['Access-Control-Allow-Origin'], 'https://planner-preview.vercel.app');
  assert.equal(rejected.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(rejected.nextCalled, true);
});
