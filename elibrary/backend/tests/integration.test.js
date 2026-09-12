/**
 * End-to-end test of the borrow/return flow. Needs a real MongoDB.
 *
 *   MONGO_URI=mongodb://127.0.0.1:27017/elibrary_test npm test
 *
 * Without MONGO_URI this file is skipped and the other tests still run.
 * Warning: it wipes the database it connects to, so use a separate test DB.
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

describe('Issue / return flow', { skip: uri ? false : 'MONGO_URI is not set' }, () => {
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

  test('a student can register and sign in', async () => {
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
    assert.equal(body.user.role, 'student', 'register always assigns the student role');
    assert.equal(body.user.password, undefined, 'the password must never appear in a response');

    studentToken = body.token;
    studentId = body.user._id;
  });

  test('a duplicate email is rejected', async () => {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Dusra', email: 'student@test.pk', password: 'student123', rollNo: 'BSCS-2' },
    });
    assert.equal(res.status, 409);
  });

  test('an admin can add a book, a student cannot', async () => {
    const bookBody = {
      title: 'Test Book',
      author: 'Test Author',
      isbn: '1112223334445',
      category: 'Computer Science',
      totalCopies: 1,
    };

    const denied = await api('/api/books', { method: 'POST', token: studentToken, body: bookBody });
    assert.equal(denied.status, 403, 'a student must not be allowed to add books');

    const res = await api('/api/books', { method: 'POST', token: adminToken, body: bookBody });
    assert.equal(res.status, 201);

    const { book } = await res.json();
    assert.equal(book.availableCopies, 1);
    bookId = book._id;
  });

  test('search finds the book', async () => {
    const res = await api('/api/books?search=Test%20Author', { token: studentToken });
    assert.equal(res.status, 200);

    const { books, total } = await res.json();
    assert.equal(total, 1);
    assert.equal(books[0].isbn, '1112223334445');
  });

  test('a student can borrow a book and the available count drops', async () => {
    const res = await api('/api/issues', { method: 'POST', token: studentToken, body: { bookId } });
    assert.equal(res.status, 201);

    const book = await Book.findById(bookId);
    assert.equal(book.availableCopies, 0);
  });

  test('borrowing is rejected when no copy is available', async () => {
    const admin = await User.findOne({ role: 'admin' });
    const other = await User.create({
      name: 'Second Student',
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

    assert.ok(admin, 'the admin should exist');
    await other.deleteOne();
  });

  test('the same book cannot be issued twice to one student', async () => {
    const res = await api('/api/issues', { method: 'POST', token: studentToken, body: { bookId } });
    assert.equal(res.status, 409);
  });

  test('the maximum-books limit is enforced', async () => {
    // Create and issue books up to the limit.
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

      // One book is already on loan, so the limit is reached sooner.
      if (res.status === 409) {
        const body = await res.json();
        assert.match(body.message, /Limit poori/);
        return;
      }
    }
    assert.fail('the maximum-books limit should have been reached');
  });

  test('an overdue loan accrues a fine and returning it frees the copy', async () => {
    const issue = await Issue.findOne({ book: bookId, status: 'issued' });
    issue.dueDate = addDays(new Date(), -3);
    await issue.save();

    const myRes = await api('/api/issues/my', { token: studentToken });
    const { issues } = await myRes.json();
    const mine = issues.find((i) => String(i._id) === String(issue._id));
    assert.equal(mine.fine, 3 * config.finePerDay, 'the live fine should cover three days');
    assert.equal(mine.isOverdue, true);

    const denied = await api(`/api/issues/${issue._id}/return`, {
      method: 'PUT',
      token: studentToken,
    });
    assert.equal(denied.status, 403, 'only an admin can process a return');

    const res = await api(`/api/issues/${issue._id}/return`, { method: 'PUT', token: adminToken });
    assert.equal(res.status, 200);

    const saved = await Issue.findById(issue._id);
    assert.equal(saved.status, 'returned');
    assert.equal(saved.fine, 3 * config.finePerDay);

    const book = await Book.findById(bookId);
    assert.equal(book.availableCopies, 1, 'the copy should be available again after the return');
  });

  test('a book that is on loan cannot be deleted', async () => {
    const active = await Issue.findOne({ status: 'issued' });
    const res = await api(`/api/books/${active.book}`, { method: 'DELETE', token: adminToken });
    assert.equal(res.status, 409);
  });

  test('the admin reports summary responds', async () => {
    const res = await api('/api/reports/summary', { token: adminToken });
    assert.equal(res.status, 200);

    const { stats } = await res.json();
    assert.equal(typeof stats.totalBooks, 'number');
    assert.ok(stats.totalBooks > 0);
    assert.equal(typeof stats.pendingFine, 'number');
    assert.ok(Number.isFinite(stats.pendingFine), 'pendingFine must not be NaN');
  });

  test('a blocked student cannot sign in', async () => {
    await User.updateOne({ _id: studentId }, { isActive: false });

    const res = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@test.pk', password: 'student123' },
    });
    assert.equal(res.status, 403);

    await User.updateOne({ _id: studentId }, { isActive: true });
  });
});
