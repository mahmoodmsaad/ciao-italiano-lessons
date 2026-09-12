import { config } from '../config/env.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Din ki ginti (time ignore karke) - due date se aaj tak kitne din late. */
export function daysOverdue(dueDate, asOf = new Date()) {
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  const now = new Date(asOf).setHours(0, 0, 0, 0);
  const diff = Math.floor((now - due) / MS_PER_DAY);
  return diff > 0 ? diff : 0;
}

/** Fine = late days x FINE_PER_DAY (default Rs 5/day). */
export function calculateFine(dueDate, asOf = new Date()) {
  return daysOverdue(dueDate, asOf) * config.finePerDay;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Issue record ko live fine + overdue status ke saath plain object banata hai.
 * Return ho chuki books ka fine record se hi liya jata hai.
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
