import { config } from '../config/env.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days late, ignoring the time of day. */
export function daysOverdue(dueDate, asOf = new Date()) {
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  const now = new Date(asOf).setHours(0, 0, 0, 0);
  const diff = Math.floor((now - due) / MS_PER_DAY);
  return diff > 0 ? diff : 0;
}

/** Fine = days late x FINE_PER_DAY (Rs 5/day by default). */
export function calculateFine(dueDate, asOf = new Date()) {
  return daysOverdue(dueDate, asOf) * config.finePerDay;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns a plain object with the fine and overdue status recalculated for today.
 * Books that were already returned keep the fine stored on the record.
 */
export function withLiveFine(issue) {
  const plain = typeof issue.toObject === 'function' ? issue.toObject() : { ...issue };
  if (plain.status === 'issued') {
    plain.fine = calculateFine(plain.dueDate);
    plain.daysOverdue = daysOverdue(plain.dueDate);
    plain.isOverdue = plain.daysOverdue > 0;
  } else {
    plain.daysOverdue = daysOverdue(plain.dueDate, plain.returnDate || new Date());
    plain.isOverdue = false;
  }
  return plain;
}
