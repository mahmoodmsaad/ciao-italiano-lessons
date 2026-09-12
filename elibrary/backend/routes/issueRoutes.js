import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  issueBook, returnBook, renewBook, payFine, myIssues, listIssues,
} from '../controllers/issueController.js';

const router = Router();

router.get('/my', protect, myIssues);
router.get('/', protect, adminOnly, listIssues);

router.post(
  '/',
  protect,
  [body('bookId').isMongoId().withMessage('Book select karein.')],
  validate,
  issueBook
);

router.put('/:id/renew', protect, renewBook);
router.put('/:id/return', protect, adminOnly, returnBook);
router.put('/:id/pay-fine', protect, adminOnly, payFine);

export default router;
