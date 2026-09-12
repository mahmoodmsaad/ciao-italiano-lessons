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
// Student khud borrow kare ya admin kisi student ko issue kare.
export const issueBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;
  const isAdmin = req.user.role === 'admin';

  const studentId = isAdmin ? req.body.studentId : req.user._id;
  if (!studentId) return res.status(400).json({ message: 'Student select karein.' });
  if (!mongoose.isValidObjectId(studentId)) {
    return res.status(400).json({ message: 'Ghalat student ID.' });
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student nahi mila.' });
  }
  if (!student.isActive) {
    return res.status(403).json({ message: 'Ye student account block hai.' });
  }

  const activeLoans = await Issue.find({ student: studentId, status: 'issued' });

  if (activeLoans.length >= config.maxBooksPerStudent) {
    return res.status(409).json({
      message: `Limit poori ho gayi - ek waqt mein sirf ${config.maxBooksPerStudent} books issue ho sakti hain.`,
    });
  }
  if (activeLoans.some((loan) => String(loan.book) === String(bookId))) {
    return res.status(409).json({ message: 'Ye book pehle se aapke paas issued hai.' });
  }
  if (activeLoans.some((loan) => calculateFine(loan.dueDate) > 0)) {
    return res.status(409).json({
      message: 'Overdue book pending hai. Pehle wo return karein, phir nai book milegi.',
    });
  }

  // Atomic update - do requests ek saath aayen to bhi copies minus nahi hongi.
  const book = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { new: true }
  );
  if (!book) {
    const exists = await Book.exists({ _id: bookId });
    return res.status(exists ? 409 : 404).json({
      message: exists ? 'Is book ki koi copy available nahi hai.' : 'Book nahi mili.',
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
    // Record na bane to copy wapas available kar dein.
    await Book.updateOne({ _id: book._id }, { $inc: { availableCopies: 1 } });
    throw err;
  }
});

// PUT /api/issues/:id/return  (admin)
export const returnBook = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue record nahi mila.' });
  if (issue.status === 'returned') {
    return res.status(409).json({ message: 'Ye book pehle hi return ho chuki hai.' });
  }

  issue.returnDate = new Date();
  issue.status = 'returned';
  issue.fine = calculateFine(issue.dueDate, issue.returnDate);
  if (issue.fine === 0) issue.finePaid = true;
  await issue.save();

  await Book.updateOne({ _id: issue.book }, { $inc: { availableCopies: 1 } });

  res.json({
    issue: await issue.populate(POPULATE),
    message: issue.fine > 0 ? `Book return ho gayi. Fine: Rs ${issue.fine}` : 'Book return ho gayi.',
  });
});

// PUT /api/issues/:id/renew - due date aage barhana
export const renewBook = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue record nahi mila.' });

  const isOwner = String(issue.student) === String(req.user._id);
  if (req.user.role !== 'admin' && !isOwner) {
    return res.status(403).json({ message: 'Ye record aapka nahi hai.' });
  }
  if (issue.status === 'returned') {
    return res.status(409).json({ message: 'Return ho chuki book renew nahi hoti.' });
  }
  if (issue.renewCount >= config.maxRenewals) {
    return res.status(409).json({
      message: `Renew limit poori ho gayi (max ${config.maxRenewals} baar).`,
    });
  }
  if (calculateFine(issue.dueDate) > 0) {
    return res.status(409).json({ message: 'Overdue book renew nahi ho sakti - pehle return karein.' });
  }

  issue.dueDate = addDays(issue.dueDate, config.loanPeriodDays);
  issue.renewCount += 1;
  await issue.save();

  res.json({ issue: await issue.populate(POPULATE), message: 'Due date barha di gayi.' });
});

// PUT /api/issues/:id/pay-fine  (admin)
export const payFine = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue record nahi mila.' });

  issue.fine = issue.status === 'issued' ? calculateFine(issue.dueDate) : issue.fine;
  issue.finePaid = true;
  await issue.save();

  res.json({ issue: await issue.populate(POPULATE), message: 'Fine paid mark ho gaya.' });
});

// GET /api/issues/my - student ke apne records
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
