import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  listBooks, listCategories, getBook, createBook, updateBook, deleteBook,
} from '../controllers/bookController.js';

const router = Router();

const bookRules = [
  body('title').trim().notEmpty().withMessage('Book title is required.'),
  body('author').trim().notEmpty().withMessage('Author name is required.'),
  body('isbn').trim().notEmpty().withMessage('ISBN is required.'),
  body('category').trim().notEmpty().withMessage('Category is required.'),
  body('totalCopies').isInt({ min: 0 }).withMessage('Number of copies must be 0 or more.'),
  body('publishYear').optional({ values: 'falsy' }).isInt({ min: 1450, max: 2100 })
    .withMessage('Enter a valid publish year.'),
];

// Any signed-in user can browse the catalog
router.get('/', protect, listBooks);
router.get('/categories', protect, listCategories);
router.get('/:id', protect, getBook);

// Only admins can add, edit or delete
router.post('/', protect, adminOnly, bookRules, validate, createBook);
router.put('/:id', protect, adminOnly, updateBook);
router.delete('/:id', protect, adminOnly, deleteBook);

export default router;
