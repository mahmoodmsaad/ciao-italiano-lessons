/**
 * Route wiring tests. These run without a database and only check that the
 * routes exist and that auth and validation are applied.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../app.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const get = (path, opts) => fetch(`${baseUrl}${path}`, opts);

test('GET /api/health returns 200 with the library rules', async () => {
  const res = await get('/api/health');
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.rules.finePerDay, 'number');
  assert.equal(typeof body.rules.loanPeriodDays, 'number');
});

test('an unknown route returns 404', async () => {
  const res = await get('/api/no-such-thing');
  assert.equal(res.status, 404);
});

test('protected routes return 401 without a token', async () => {
  for (const path of ['/api/books', '/api/issues/my', '/api/users', '/api/reports/summary']) {
    const res = await get(path);
    assert.equal(res.status, 401, `${path} ko 401 dena chahiye tha`);
  }
});

test('an invalid token returns 401', async () => {
  const res = await get('/api/books', { headers: { Authorization: 'Bearer definitely-not-a-valid-token' } });
  assert.equal(res.status, 401);
});

test('register returns a validation error for an empty body', async () => {
  const res = await get('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);

  const body = await res.json();
  assert.ok(Array.isArray(body.errors) && body.errors.length > 0);
  assert.ok(body.errors.some((e) => e.field === 'email'));
});

test('register rejects a password that is too short', async () => {
  const res = await get('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test', email: 'test@uni.edu.pk', password: '123', rollNo: 'X-1',
    }),
  });
  assert.equal(res.status, 400);

  const body = await res.json();
  assert.ok(body.errors.some((e) => e.field === 'password'));
});

test('login without a password returns 400', async () => {
  const res = await get('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com' }),
  });
  assert.equal(res.status, 400);
});
