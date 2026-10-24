import assert from 'node:assert/strict';
import { apiTest } from '../helpers/testServer.js';

apiTest('GET /api/health menjawab ok', async ({ request }) => {
  const res = await request('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, {
    status: 'ok',
    database: 'connected',
    dialect: 'sqlite',
    revision: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
  });
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

apiTest('GET /api menampilkan petunjuk endpoint autentikasi', async ({ request }) => {
  const res = await request('GET', '/api');
  assert.equal(res.status, 200);
  assert.equal(res.json?.endpoints.login, 'POST /api/auth/login');
});

apiTest('GET / menampilkan informasi backend', async ({ request }) => {
  const res = await request('GET', '/');
  assert.equal(res.status, 200);
  assert.equal(res.json?.name, 'Study Planner API');
  assert.equal(res.json?.status, 'ok');
});

apiTest('endpoint /api yang tidak dikenal menghasilkan JSON 404, bukan HTML', async ({ request }) => {
  const res = await request('GET', '/api/tidak-ada');
  assert.equal(res.status, 404);
  assert.equal(res.json?.error.code, 'NOT_FOUND');
});

apiTest('rute non-API yang tidak dikenal menghasilkan JSON 404, bukan Cannot GET', async ({ request }) => {
  const res = await request('GET', '/rute-tidak-ada');
  assert.equal(res.status, 404);
  assert.equal(res.json?.error.code, 'NOT_FOUND');
});

apiTest('JSON rusak menghasilkan 400 JSON tanpa membocorkan stack trace', async ({ request }) => {
  const res = await request('POST', '/api/tasks', undefined, { rawBody: '{rusak' });
  assert.equal(res.status, 400);
  assert.equal(res.json?.error.code, 'INVALID_JSON');
  assert.ok(!/\bat .*\.js:\d+/.test(res.text), 'stack trace bocor ke klien');
});

apiTest('isi permintaan terlalu besar ditolak (413)', async ({ request }) => {
  const res = await request('POST', '/api/tasks', { title: 'x'.repeat(20000) });
  assert.equal(res.status, 413);
});

apiTest('header keamanan dasar dipasang dan x-powered-by dimatikan', async ({ request }) => {
  const res = await request('GET', '/api/health');
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
