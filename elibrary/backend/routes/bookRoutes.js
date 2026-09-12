import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  listBooks, listCategories, getBook, createBook, updateBook, deleteBook,
} from '../controllers/bookController.js';

const router = Router();

const bookRules = [
  body('title').trim().notEmpty().withMessage('Book ka title likhein.'),
  body('author').trim().notEmpty().withMessage('Author ka naam likhein.'),
  body('isbn').trim().notEmpty().withMessage('ISBN likhein.'),
  body('category').trim().notEmpty().withMessage('Category select karein.'),
  body('totalCopies').isInt({ min: 0 }).withMessage('Copies ki tadaad 0 ya us se zyada ho.'),
  body('publishYear').optional({ values: 'falsy' }).isInt({ min: 1450, max: 2100 })
    .withMessage('Publish year sahi likhein.'),
];

// Catalog sab logged-in users dekh sakte hain
router.get('/', protect, listBooks);
router.get('/categories', protect, listCategories);
router.get('/:id', protect, getBook);

// Add / edit / delete sirf admin
router.post('/', protect, adminOnly, bookRules, validate, createBook);
router.put('/:id', protect, adminOnly, updateBook);
router.delete('/:id', protect, adminOnly, deleteBook);

export default router;
