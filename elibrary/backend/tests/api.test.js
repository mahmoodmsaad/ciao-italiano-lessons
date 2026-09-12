/**
 * Route wiring ke tests - ye database ke baghair chalte hain.
 * Sirf ye check karte hain ke routes mojood hain aur auth/validation kaam kar rahi hai.
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

test('GET /api/health library rules ke saath 200 deta hai', async () => {
  const res = await get('/api/health');
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.rules.finePerDay, 'number');
  assert.equal(typeof body.rules.loanPeriodDays, 'number');
});

test('unknown route par 404 aata hai', async () => {
  const res = await get('/api/koi-aisi-cheez-nahi');
  assert.equal(res.status, 404);
});

test('protected routes bina token 401 dete hain', async () => {
  for (const path of ['/api/books', '/api/issues/my', '/api/users', '/api/reports/summary']) {
    const res = await get(path);
    assert.equal(res.status, 401, `${path} ko 401 dena chahiye tha`);
  }
});

test('ghalat token par 401 aata hai', async () => {
  const res = await get('/api/books', { headers: { Authorization: 'Bearer bilkul-ghalat-token' } });
  assert.equal(res.status, 401);
});

test('register khaali body par validation error deta hai', async () => {
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

test('register chhote password ko reject karta hai', async () => {
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

test('login bina password 400 deta hai', async () => {
  const res = await get('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com' }),
  });
  assert.equal(res.status, 400);
});
