import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
  register, login, getMe, updateProfile, changePassword,
} from '../controllers/authController.js';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Naam likhna zaroori hai.'),
    body('email').isEmail().withMessage('Sahi email likhein.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password kam se kam 6 characters ka ho.'),
    body('rollNo').trim().notEmpty().withMessage('Roll number likhna zaroori hai.'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Sahi email likhein.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password likhein.'),
  ],
  validate,
  login
);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Purana password likhein.'),
    body('newPassword').isLength({ min: 6 }).withMessage('Naya password kam se kam 6 characters ka ho.'),
  ],
  validate,
  changePassword
);

export default router;
