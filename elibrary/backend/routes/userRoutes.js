import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  listUsers, getUser, toggleUserStatus, deleteUser,
} from '../controllers/userController.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/', listUsers);
router.get('/:id', getUser);
router.put('/:id/status', toggleUserStatus);
router.delete('/:id', deleteUser);

export default router;
