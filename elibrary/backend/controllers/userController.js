import User from '../models/User.js';
import Issue from '../models/Issue.js';
import { asyncHandler } from '../middleware/error.js';
import { publicUser } from '../utils/token.js';
import { calculateFine } from '../utils/fine.js';

// GET /api/users?search=&role=  (admin)
export const listUsers = asyncHandler(async (req, res) => {
  const { search = '', role = '' } = req.query;
  const filter = {};

  if (search.trim()) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { rollNo: rx }];
  }
  if (role === 'student' || role === 'admin') filter.role = role;

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(300);

  // Each student is returned with their current loan count and outstanding fine.
  const activeIssues = await Issue.find({ status: 'issued' }).select('student dueDate');
  const stats = new Map();
  activeIssues.forEach((i) => {
    const key = String(i.student);
    const row = stats.get(key) || { activeLoans: 0, pendingFine: 0 };
    row.activeLoans += 1;
    row.pendingFine += calculateFine(i.dueDate);
    stats.set(key, row);
  });

  res.json({
    users: users.map((u) => ({
      ...publicUser(u),
      ...(stats.get(String(u._id)) || { activeLoans: 0, pendingFine: 0 }),
    })),
  });
});

// GET /api/users/:id  (admin)
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const issues = await Issue.find({ student: user._id })
    .populate('book', 'title author isbn')
    .sort({ createdAt: -1 });

  res.json({ user: publicUser(user), issues });
});

// PUT /api/users/:id/status  (admin) - block / unblock
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot block your own account.' });
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json({
    user: publicUser(user),
    message: user.isActive ? 'Account activated.' : 'Account blocked.',
  });
});

// DELETE /api/users/:id  (admin)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  const active = await Issue.countDocuments({ student: user._id, status: 'issued' });
  if (active > 0) {
    return res.status(409).json({
      message: 'This student still has issued books - process the returns first.',
    });
  }

  await user.deleteOne();
  res.json({ message: 'User deleted.' });
});
