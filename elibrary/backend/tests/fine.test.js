import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config/env.js';
import { addDays, daysOverdue, calculateFine, withLiveFine } from '../utils/fine.js';

const today = new Date();

test('no fine when the due date is today', () => {
  assert.equal(daysOverdue(today), 0);
  assert.equal(calculateFine(today), 0);
});

test('no fine when the due date is in the future', () => {
  assert.equal(calculateFine(addDays(today, 5)), 0);
});

test('3 days late = 3 x FINE_PER_DAY', () => {
  const due = addDays(today, -3);
  assert.equal(daysOverdue(due), 3);
  assert.equal(calculateFine(due), 3 * config.finePerDay);
});

test('the time of day does not affect the fine', () => {
  const due = addDays(today, -1);
  due.setHours(23, 59, 0, 0);
  assert.equal(daysOverdue(due), 1);
});

test('addDays crosses a month boundary correctly', () => {
  const result = addDays(new Date('2026-01-28T00:00:00Z'), 5);
  assert.equal(result.toISOString().slice(0, 10), '2026-02-02');
});

test('withLiveFine recalculates the fine on an open loan', () => {
  const record = { status: 'issued', dueDate: addDays(today, -4), fine: 0 };
  const result = withLiveFine(record);
  assert.equal(result.fine, 4 * config.finePerDay);
  assert.equal(result.daysOverdue, 4);
  assert.equal(result.isOverdue, true);
});

test('withLiveFine keeps the stored fine on a returned record', () => {
  const record = {
    status: 'returned',
    dueDate: addDays(today, -10),
    returnDate: addDays(today, -8),
    fine: 2 * config.finePerDay,
  };
  const result = withLiveFine(record);
  assert.equal(result.fine, 2 * config.finePerDay);
  assert.equal(result.isOverdue, false);
});
