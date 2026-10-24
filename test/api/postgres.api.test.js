import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { createPostgresDatabase } from '../../src/db/connection.js';
import { startTestServer } from '../helpers/testServer.js';

test('PostgreSQL menyimpan akun dan seluruh data lintas instance backend', async () => {
  const memoryDatabase = newDb();
  const { Pool } = memoryDatabase.adapters.createPg();
  const pool = new Pool();
  const database = await createPostgresDatabase(pool);
  const options = {
    authTokenSecret: 'test-shared-auth-secret-with-enough-entropy',
    bypassAuthForTests: false,
    database,
  };
  const issuer = await startTestServer(options);
  const worker = await startTestServer(options);

  try {
    const registration = await issuer.request('POST', '/api/auth/register', {
      name: 'PostgreSQL Test',
      email: 'postgres@example.com',
      password: 'password123',
    });
    assert.equal(registration.status, 201);

    const login = await worker.request('POST', '/api/auth/login', {
      email: 'postgres@example.com',
      password: 'password123',
    });
    assert.equal(login.status, 200, login.text);
    assert.notEqual(login.json.token, registration.json.token);
    const authorization = { Authorization: `Bearer ${login.json.token}` };

    const me = await worker.request('GET', '/api/auth/me', undefined, { headers: authorization });
    assert.equal(me.status, 200, me.text);
    assert.equal(me.json.user.email, 'postgres@example.com');

    const session = await worker.request('POST', '/api/sessions', {
      course: 'Pemrograman Web', day: 0, start: '09:00', end: '10:00',
    }, { headers: authorization });
    assert.equal(session.status, 201, session.text);

    const task = await worker.request('POST', '/api/tasks', {
      title: 'Tugas PostgreSQL',
    }, { headers: authorization });
    assert.equal(task.status, 201, task.text);

    const alarm = await worker.request('POST', '/api/alarms', {
      label: 'Alarm PostgreSQL', time: '08:00', days: [0],
    }, { headers: authorization });
    assert.equal(alarm.status, 201, alarm.text);

    const settings = await worker.request('PUT', '/api/settings', {
      reminderLead: 15,
    }, { headers: authorization });
    assert.equal(settings.status, 200, settings.text);
    assert.equal(settings.json.reminderLead, 15);

    const dashboard = await worker.request('GET', '/api/dashboard', undefined, { headers: authorization });
    assert.equal(dashboard.status, 200, dashboard.text);
    assert.ok(dashboard.json);

    const health = await worker.request('GET', '/api/health');
    assert.deepEqual(health.json, {
      status: 'ok',
      database: 'connected',
      dialect: 'postgres',
      revision: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    });
  } finally {
    await Promise.all([issuer.close(), worker.close()]);
    await database.close();
  }
});
