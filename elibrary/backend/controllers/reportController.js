import Book from '../models/Book.js';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';
import { calculateFine, withLiveFine } from '../utils/fine.js';

// GET /api/reports/summary  (admin dashboard)
export const summary = asyncHandler(async (req, res) => {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  const [
    totalBooks,
    copyTotals,
    totalStudents,
    blockedStudents,
    activeLoans,
    returnedCount,
    overdueIssues,
    finePaidAgg,
  ] = await Promise.all([
    Book.countDocuments(),
    Book.aggregate([
      { $group: { _id: null, total: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } },
    ]),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', isActive: false }),
    Issue.countDocuments({ status: 'issued' }),
    Issue.countDocuments({ status: 'returned' }),
    Issue.find({ status: 'issued', dueDate: { $lt: startOfToday } }).select('dueDate'),
    Issue.aggregate([
      { $match: { finePaid: true, fine: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$fine' } } },
    ]),
  ]);

  // Pending fine = live fine on overdue loans + unpaid fine on returned books
  const unpaidReturned = await Issue.aggregate([
    { $match: { status: 'returned', finePaid: false, fine: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$fine' } } },
  ]);
  const liveOverdueFine = overdueIssues.reduce((sum, i) => sum + calculateFine(i.dueDate), 0);
  const pendingFine = liveOverdueFine + (unpaidReturned[0]?.total || 0);

  res.json({
    stats: {
      totalBooks,
      totalCopies: copyTotals[0]?.total || 0,
      availableCopies: copyTotals[0]?.available || 0,
      issuedCopies: (copyTotals[0]?.total || 0) - (copyTotals[0]?.available || 0),
      totalStudents,
      blockedStudents,
      activeLoans,
      returnedCount,
      overdueCount: overdueIssues.length,
      fineCollected: finePaidAgg[0]?.total || 0,
      pendingFine,
    },
  });
});

// GET /api/reports/popular?limit=5  (admin) - most borrowed books
export const popularBooks = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));

  const rows = await Issue.aggregate([
    { $group: { _id: '$book', issueCount: { $sum: 1 } } },
    { $sort: { issueCount: -1 } },
    { $limit: limit },
    { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    {
      $project: {
        _id: '$book._id',
        title: '$book.title',
        author: '$book.author',
        category: '$book.category',
        issueCount: 1,
      },
    },
  ]);

  res.json({ books: rows });
});

// GET /api/reports/monthly?months=6  (admin) - issued and returned per month
export const monthlyActivity = asyncHandler(async (req, res) => {
  const months = Math.min(12, Math.max(1, Number(req.query.months) || 6));
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1), 1);
  from.setHours(0, 0, 0, 0);

  const rows = await Issue.aggregate([
    { $match: { issueDate: { $gte: from } } },
    {
      $group: {
        _id: { year: { $year: '$issueDate' }, month: { $month: '$issueDate' } },
        issued: { $sum: 1 },
        returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
      },
    },
  ]);

  const byKey = new Map(rows.map((r) => [`${r._id.year}-${r._id.month}`, r]));
  const series = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(from);
    d.setMonth(from.getMonth() + i);
    const row = byKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`);
    series.push({
      label: d.toLocaleString('en', { month: 'short', year: '2-digit' }),
      issued: row?.issued || 0,
      returned: row?.returned || 0,
    });
  }

  res.json({ series });
});

// GET /api/reports/categories  (admin) - books per category
export const categoryBreakdown = asyncHandler(async (req, res) => {
  const rows = await Book.aggregate([
    { $group: { _id: '$category', books: { $sum: 1 }, copies: { $sum: '$totalCopies' } } },
    { $sort: { books: -1 } },
    { $project: { _id: 0, category: '$_id', books: 1, copies: 1 } },
  ]);
  res.json({ categories: rows });
});

// GET /api/reports/overdue  (admin) - overdue list with fines
export const overdueReport = asyncHandler(async (req, res) => {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  const issues = await Issue.find({ status: 'issued', dueDate: { $lt: startOfToday } })
    .populate('book', 'title author isbn')
    .populate('student', 'name email rollNo department phone')
    .sort({ dueDate: 1 });

  res.json({ issues: issues.map(withLiveFine) });
});
