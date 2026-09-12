import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  summary, popularBooks, monthlyActivity, categoryBreakdown, overdueReport,
} from '../controllers/reportController.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/summary', summary);
router.get('/popular', popularBooks);
router.get('/monthly', monthlyActivity);
router.get('/categories', categoryBreakdown);
router.get('/overdue', overdueReport);

export default router;
