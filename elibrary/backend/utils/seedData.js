import User from '../models/User.js';
import Book from '../models/Book.js';
import Issue from '../models/Issue.js';
import { config } from '../config/env.js';
import { sampleUsers, sampleBooks } from './sampleData.js';
import { addDays, calculateFine } from './fine.js';

/**
 * Database ko demo data se bhar deta hai.
 * seed script bhi ye chalata hai aur in-memory demo mode bhi.
 */
export async function seedDatabase({ log = () => {} } = {}) {
  await Promise.all([Issue.deleteMany({}), Book.deleteMany({}), User.deleteMany({})]);
  log('Purana data saaf kar diya.');

  // create() use kar rahe hain taake pre-save hook password hash kare.
  const users = await User.create(sampleUsers);
  const books = await Book.create(
    sampleBooks.map((b) => ({ ...b, availableCopies: b.totalCopies }))
  );
  log(`${users.length} users aur ${books.length} books add ho gayin.`);

  const admin = users.find((u) => u.role === 'admin');
  const students = users.filter((u) => u.role === 'student');

  // Demo issue records - ek normal, ek overdue, ek returned.
  const plans = [
    { student: students[0], book: books[0], issuedDaysAgo: 3, returned: false },
    { student: students[1], book: books[2], issuedDaysAgo: 25, returned: false }, // overdue
    { student: students[1], book: books[4], issuedDaysAgo: 6, returned: false },
    { student: students[2], book: books[1], issuedDaysAgo: 40, returnedDaysAgo: 30 },
  ];

  for (const plan of plans) {
    const issueDate = addDays(new Date(), -plan.issuedDaysAgo);
    const dueDate = addDays(issueDate, config.loanPeriodDays);
    const returnDate = plan.returnedDaysAgo ? addDays(new Date(), -plan.returnedDaysAgo) : null;

    await Issue.create({
      book: plan.book._id,
      student: plan.student._id,
      issuedBy: admin._id,
      issueDate,
      dueDate,
      returnDate,
      status: returnDate ? 'returned' : 'issued',
      fine: returnDate ? calculateFine(dueDate, returnDate) : 0,
      finePaid: returnDate ? calculateFine(dueDate, returnDate) === 0 : false,
    });

    if (!returnDate) {
      await Book.updateOne({ _id: plan.book._id }, { $inc: { availableCopies: -1 } });
    }
  }

  log(`${plans.length} demo issue records ban gaye.`);

  return {
    users: users.length,
    books: books.length,
    issues: plans.length,
    adminEmail: admin.email,
  };
}
