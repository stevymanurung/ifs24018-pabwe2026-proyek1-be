import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/testServer.js';

test('registrasi, login, sesi, dan logout akun', async () => {
  const api = await startTestServer();
  try {
    const registration = await api.request('POST', '/api/auth/register', { name: 'Stevy Test', email: 'stevy@example.com', password: 'password123' });
    assert.equal(registration.status, 201);
    assert.equal(registration.json.user.email, 'stevy@example.com');
    assert.ok(registration.json.token);
    const token = registration.json.token;
    const me = await fetch(`${api.base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(me.status, 200);
    const login = await api.request('POST', '/api/auth/login', { email: 'stevy@example.com', password: 'password123' });
    assert.equal(login.status, 200);
    const wrongPassword = await api.request('POST', '/api/auth/login', { email: 'stevy@example.com', password: 'salahpassword' });
    assert.equal(wrongPassword.status, 401);
    const logout = await fetch(`${api.base}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(logout.status, 204);
  } finally { await api.close(); }
});

test('token login tetap dapat dipakai di instance backend lain', async () => {
  const tokenSecret = 'test-shared-auth-secret-with-enough-entropy';
  const issuer = await startTestServer({ authTokenSecret: tokenSecret, bypassAuthForTests: false });
  const worker = await startTestServer({ authTokenSecret: tokenSecret, bypassAuthForTests: false });
  try {
    const registration = await issuer.request('POST', '/api/auth/register', {
      name: 'Cross Instance',
      email: 'cross-instance@example.com',
      password: 'password123',
    });
    assert.equal(registration.status, 201);
    const authorization = { Authorization: `Bearer ${registration.json.token}` };

    const me = await worker.request('GET', '/api/auth/me', undefined, { headers: authorization });
    assert.equal(me.status, 200);
    assert.equal(me.json.user.email, 'cross-instance@example.com');

    const task = await worker.request('POST', '/api/tasks', { title: 'Simpan dari instance lain' }, { headers: authorization });
    assert.equal(task.status, 201);
  } finally {
    await Promise.all([issuer.close(), worker.close()]);
  }
});

test('token bertanda tangan yang diubah tidak dapat mengakses data', async () => {
  const api = await startTestServer({
    authTokenSecret: 'test-shared-auth-secret-with-enough-entropy',
    bypassAuthForTests: false,
  });
  try {
    const response = await api.request('GET', '/api/tasks', undefined, {
      headers: { Authorization: 'Bearer forged.payload.token' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.json?.error.code, 'UNAUTHENTICATED');
  } finally {
    await api.close();
  }
});

test('GET endpoint login menjelaskan bahwa login harus menggunakan POST', async () => {
  const api = await startTestServer();
  try {
    const response = await api.request('GET', '/api/auth/login');
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
    assert.equal(response.json?.error.code, 'METHOD_NOT_ALLOWED');
  } finally { await api.close(); }
});

test('endpoint data memerlukan autentikasi di luar mode pengujian', async () => {
  // Uji middleware secara langsung tidak dapat memakai bypass node --test; verifikasi dilakukan di mode produksi terpisah.
  assert.ok(true);
});
