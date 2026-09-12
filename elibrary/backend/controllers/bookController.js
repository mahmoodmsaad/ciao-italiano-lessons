import Book from '../models/Book.js';
import Issue from '../models/Issue.js';
import { asyncHandler } from '../middleware/error.js';

const SORTS = {
  newest: { createdAt: -1 },
  title: { title: 1 },
  author: { author: 1 },
  year: { publishYear: -1 },
};

// GET /api/books?search=&category=&available=&sort=&page=&limit=
export const listBooks = asyncHandler(async (req, res) => {
  const { search = '', category = '', available = '', sort = 'newest' } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));

  const filter = {};

  if (search.trim()) {
    // A regex is used so partial words match too, which a text index does not do.
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { author: rx }, { isbn: rx }, { publisher: rx }];
  }
  if (category.trim()) filter.category = category.trim();
  if (available === 'true') filter.availableCopies = { $gt: 0 };

  const [books, total] = await Promise.all([
    Book.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  res.json({
    books,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /api/books/categories - populates the filter dropdown
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Book.distinct('category');
  res.json({ categories: categories.filter(Boolean).sort() });
});

// GET /api/books/:id
export const getBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  res.json({ book });
});

// POST /api/books  (admin)
export const createBook = asyncHandler(async (req, res) => {
  const total = Number(req.body.totalCopies) || 1;
  const book = await Book.create({
    ...req.body,
    totalCopies: total,
    availableCopies: total,
  });
  res.status(201).json({ book });
});

// PUT /api/books/:id  (admin)
export const updateBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found.' });

  const issuedCount = book.totalCopies - book.availableCopies;

  const fields = [
    'title', 'author', 'isbn', 'category', 'publisher', 'publishYear',
    'edition', 'description', 'coverUrl', 'shelfLocation',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) book[f] = req.body[f];
  });

  if (req.body.totalCopies !== undefined) {
    const newTotal = Number(req.body.totalCopies);
    if (newTotal < issuedCount) {
      return res.status(400).json({
        message: `Total copies cannot be less than ${issuedCount} - that many copies are currently issued.`,
      });
    }
    book.totalCopies = newTotal;
    book.availableCopies = newTotal - issuedCount;
  }

  await book.save();
  res.json({ book });
});

// DELETE /api/books/:id  (admin)
export const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found.' });

  const active = await Issue.countDocuments({ book: book._id, status: 'issued' });
  if (active > 0) {
    return res.status(409).json({
      message: 'This book is currently issued - process the return before deleting it.',
    });
  }

  await book.deleteOne();
  res.json({ message: 'Book deleted.' });
});
