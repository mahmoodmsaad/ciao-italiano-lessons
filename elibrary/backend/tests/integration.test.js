/**
 * Poore issue/return flow ka test - ise chalane ke liye asli MongoDB chahiye.
 *
 *   MONGO_URI=mongodb://127.0.0.1:27017/elibrary_test npm test
 *
 * MONGO_URI na ho to ye file skip ho jati hai (baaki tests phir bhi chalte hain).
 * Warning: ye test database ka data delete karta hai - alag test DB use karein.
 */
import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import app from '../app.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Issue from '../models/Issue.js';
import { config } from '../config/env.js';
import { addDays } from '../utils/fine.js';

const uri = process.env.MONGO_URI;

describe('Issue / return flow', { skip: uri ? false : 'MONGO_URI set nahi hai' }, () => {
  let server;
  let baseUrl;
  let adminToken;
  let studentToken;
  let studentId;
  let bookId;

  const api = (path, { token, method = 'GET', body } = {}) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  before(async () => {
    await mongoose.connect(uri);
    await Promise.all([Issue.deleteMany({}), Book.deleteMany({}), User.deleteMany({})]);

    await User.create({
      name: 'Test Admin',
      email: 'admin@test.pk',
      password: 'admin123',
      role: 'admin',
      rollNo: 'ADM-1',
    });

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const adminLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@test.pk', password: 'admin123' },
    });
    adminToken = (await adminLogin.json()).token;
  });

  after(async () => {
    server?.close();
    await Promise.all([Issue.deleteMany({}), Book.deleteMany({}), User.deleteMany({})]);
    await mongoose.disconnect();
  });

  test('student register aur login kar sakta hai', async () => {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Student',
        email: 'student@test.pk',
        password: 'student123',
        rollNo: 'BSCS-1',
        department: 'CS',
      },
    });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.role, 'student', 'register hamesha student role de');
    assert.equal(body.user.password, undefined, 'password kabhi response mein na jaye');

    studentToken = body.token;
    studentId = body.user._id;
  });

  test('duplicate email register nahi hota', async () => {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Dusra', email: 'student@test.pk', password: 'student123', rollNo: 'BSCS-2' },
    });
    assert.equal(res.status, 409);
  });

  test('admin book add kar sakta hai, student nahi', async () => {
    const bookBody = {
      title: 'Test Book',
      author: 'Test Author',
      isbn: '1112223334445',
      category: 'Computer Science',
      totalCopies: 1,
    };

    const denied = await api('/api/books', { method: 'POST', token: studentToken, body: bookBody });
    assert.equal(denied.status, 403, 'student ko book add karne ki ijazat nahi honi chahiye');

    const res = await api('/api/books', { method: 'POST', token: adminToken, body: bookBody });
    assert.equal(res.status, 201);

    const { book } = await res.json();
    assert.equal(book.availableCopies, 1);
    bookId = book._id;
  });

  test('search se book milti hai', async () => {
    const res = await api('/api/books?search=Test%20Author', { token: studentToken });
    assert.equal(res.status, 200);

    const { books, total } = await res.json();
    assert.equal(total, 1);
    assert.equal(books[0].isbn, '1112223334445');
  });

  test('student book borrow kar sakta hai aur copy kam ho jati hai', async () => {
    const res = await api('/api/issues', { method: 'POST', token: studentToken, body: { bookId } });
    assert.equal(res.status, 201);

    const book = await Book.findById(bookId);
    assert.equal(book.availableCopies, 0);
  });

  test('copy available na ho to borrow reject hota hai', async () => {
    const admin = await User.findOne({ role: 'admin' });
    const other = await User.create({
      name: 'Doosra Student',
      email: 'other@test.pk',
      password: 'student123',
      rollNo: 'BSCS-9',
    });

    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'other@test.pk', password: 'student123' },
    });
    const otherToken = (await login.json()).token;

    const res = await api('/api/issues', { method: 'POST', token: otherToken, body: { bookId } });
    assert.equal(res.status, 409);

    assert.ok(admin, 'admin mojood hona chahiye');
    await other.deleteOne();
  });

  test('wohi book dobara issue nahi hoti', async () => {
    const res = await api('/api/issues', { method: 'POST', token: studentToken, body: { bookId } });
    assert.equal(res.status, 409);
  });

  test('max books limit lagti hai', async () => {
    // Limit tak books banakar issue karte hain.
    for (let i = 0; i < config.maxBooksPerStudent; i += 1) {
      const created = await Book.create({
        title: `Filler ${i}`,
        author: 'Filler',
        isbn: `filler-${i}`,
        category: 'Misc',
        totalCopies: 1,
        availableCopies: 1,
      });

      const res = await api('/api/issues', {
        method: 'POST',
        token: studentToken,
        body: { bookId: created._id },
      });

      // Pehli book pehle hi issued hai, is liye limit jaldi lag jayegi.
      if (res.status === 409) {
        const body = await res.json();
        assert.match(body.message, /Limit poori/);
        return;
      }
    }
    assert.fail('max books limit lagni chahiye thi');
  });

  test('overdue book par fine banta hai aur return par copy wapas aati hai', async () => {
    const issue = await Issue.findOne({ book: bookId, status: 'issued' });
    issue.dueDate = addDays(new Date(), -3);
    await issue.save();

    const myRes = await api('/api/issues/my', { token: studentToken });
    const { issues } = await myRes.json();
    const mine = issues.find((i) => String(i._id) === String(issue._id));
    assert.equal(mine.fine, 3 * config.finePerDay, 'live fine 3 din ka hona chahiye');
    assert.equal(mine.isOverdue, true);

    const denied = await api(`/api/issues/${issue._id}/return`, {
      method: 'PUT',
      token: studentToken,
    });
    assert.equal(denied.status, 403, 'return sirf admin kar sakta hai');

    const res = await api(`/api/issues/${issue._id}/return`, { method: 'PUT', token: adminToken });
    assert.equal(res.status, 200);

    const saved = await Issue.findById(issue._id);
    assert.equal(saved.status, 'returned');
    assert.equal(saved.fine, 3 * config.finePerDay);

    const book = await Book.findById(bookId);
    assert.equal(book.availableCopies, 1, 'return ke baad copy wapas available honi chahiye');
  });

  test('issued book delete nahi hoti', async () => {
    const active = await Issue.findOne({ status: 'issued' });
    const res = await api(`/api/books/${active.book}`, { method: 'DELETE', token: adminToken });
    assert.equal(res.status, 409);
  });

  test('admin reports summary deta hai', async () => {
    const res = await api('/api/reports/summary', { token: adminToken });
    assert.equal(res.status, 200);

    const { stats } = await res.json();
    assert.equal(typeof stats.totalBooks, 'number');
    assert.ok(stats.totalBooks > 0);
    assert.equal(typeof stats.pendingFine, 'number');
    assert.ok(Number.isFinite(stats.pendingFine), 'pendingFine NaN nahi hona chahiye');
  });

  test('blocked student login nahi kar sakta', async () => {
    await User.updateOne({ _id: studentId }, { isActive: false });

    const res = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@test.pk', password: 'student123' },
    });
    assert.equal(res.status, 403);

    await User.updateOne({ _id: studentId }, { isActive: true });
  });
});
