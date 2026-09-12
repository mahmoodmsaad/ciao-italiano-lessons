import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../middleware/error.js';
import { addDays, calculateFine, withLiveFine } from '../utils/fine.js';

const POPULATE = [
  { path: 'book', select: 'title author isbn category coverUrl' },
  { path: 'student', select: 'name email rollNo department' },
];

// POST /api/issues  { bookId, studentId? }
// A student borrows for themselves, or an admin lends to a student.
export const issueBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;
  const isAdmin = req.user.role === 'admin';

  const studentId = isAdmin ? req.body.studentId : req.user._id;
  if (!studentId) return res.status(400).json({ message: 'Please select a student.' });
  if (!mongoose.isValidObjectId(studentId)) {
    return res.status(400).json({ message: 'Invalid student ID.' });
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found.' });
  }
  if (!student.isActive) {
    return res.status(403).json({ message: 'This student account is blocked.' });
  }

  const activeLoans = await Issue.find({ student: studentId, status: 'issued' });

  if (activeLoans.length >= config.maxBooksPerStudent) {
    return res.status(409).json({
      message: `Borrowing limit reached - a student may hold only ${config.maxBooksPerStudent} books at a time.`,
    });
  }
  if (activeLoans.some((loan) => String(loan.book) === String(bookId))) {
    return res.status(409).json({ message: 'This book is already issued to you.' });
  }
  if (activeLoans.some((loan) => calculateFine(loan.dueDate) > 0)) {
    return res.status(409).json({
      message: 'You have an overdue book. Please return it before borrowing another.',
    });
  }

  // Atomic update, so two simultaneous requests can never push copies below zero.
  const book = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { new: true }
  );
  if (!book) {
    const exists = await Book.exists({ _id: bookId });
    return res.status(exists ? 409 : 404).json({
      message: exists ? 'No copies of this book are available.' : 'Book not found.',
    });
  }

  try {
    const issue = await Issue.create({
      book: book._id,
      student: studentId,
      issuedBy: req.user._id,
      issueDate: new Date(),
      dueDate: addDays(new Date(), config.loanPeriodDays),
    });

    res.status(201).json({ issue: await issue.populate(POPULATE) });
  } catch (err) {
    // If the record could not be created, put the copy back.
    await Book.updateOne({ _id: book._id }, { $inc: { availableCopies: 1 } });
    throw err;
  }
});

// PUT /api/issues/:id/return  (admin)
export const returnBook = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue record not found.' });
  if (issue.status === 'returned') {
    return res.status(409).json({ message: 'This book has already been returned.' });
  }

  issue.returnDate = new Date();
  issue.status = 'returned';
  issue.fine = calculateFine(issue.dueDate, issue.returnDate);
  if (issue.fine === 0) issue.finePaid = true;
  await issue.save();

  await Book.updateOne({ _id: issue.book }, { $inc: { availableCopies: 1 } });

  res.json({
    issue: await issue.populate(POPULATE),
    message: issue.fine > 0 ? `Book returned. Fine: Rs ${issue.fine}` : 'Book returned.',
  });
});

// PUT /api/issues/:id/renew - extend the due date
export const renewBook = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue record not found.' });

  const isOwner = String(issue.student) === String(req.user._id);
  if (req.user.role !== 'admin' && !isOwner) {
    return res.status(403).json({ message: 'This record does not belong to you.' });
  }
  if (issue.status === 'returned') {
    return res.status(409).json({ message: 'A returned book cannot be renewed.' });
  }
  if (issue.renewCount >= config.maxRenewals) {
    return res.status(409).json({
      message: `Renewal limit reached (max ${config.maxRenewals}).`,
    });
  }
  if (calculateFine(issue.dueDate) > 0) {
    return res.status(409).json({ message: 'An overdue book cannot be renewed - please return it first.' });
  }

  issue.dueDate = addDays(issue.dueDate, config.loanPeriodDays);
  issue.renewCount += 1;
  await issue.save();

  res.json({ issue: await issue.populate(POPULATE), message: 'Due date extended.' });
});

// PUT /api/issues/:id/pay-fine  (admin)
export const payFine = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue record not found.' });

  issue.fine = issue.status === 'issued' ? calculateFine(issue.dueDate) : issue.fine;
  issue.finePaid = true;
  await issue.save();

  res.json({ issue: await issue.populate(POPULATE), message: 'Fine marked as paid.' });
});

// GET /api/issues/my - a student's own records
export const myIssues = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { student: req.user._id };
  if (status === 'issued' || status === 'returned') filter.status = status;

  const issues = await Issue.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  res.json({ issues: issues.map(withLiveFine) });
});

// GET /api/issues?status=&overdue=&search=  (admin)
export const listIssues = asyncHandler(async (req, res) => {
  const { status, overdue, student } = req.query;
  const filter = {};
  if (status === 'issued' || status === 'returned') filter.status = status;
  if (student && mongoose.isValidObjectId(student)) filter.student = student;
  if (overdue === 'true') {
    filter.status = 'issued';
    filter.dueDate = { $lt: new Date(new Date().setHours(0, 0, 0, 0)) };
  }

  const issues = await Issue.find(filter).populate(POPULATE).sort({ createdAt: -1 }).limit(300);
  res.json({ issues: issues.map(withLiveFine) });
});
