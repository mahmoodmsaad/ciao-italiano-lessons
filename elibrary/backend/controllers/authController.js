import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';
import { signToken, publicUser } from '../utils/token.js';

// POST /api/auth/register - naya student account
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, rollNo, department, phone } = req.body;

  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(409).json({ message: 'This email is already registered.' });
  }

  // The role is always student - admins come from the seed script only.
  const user = await User.create({
    name,
    email,
    password,
    rollNo,
    department,
    phone,
    role: 'student',
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Your account is blocked. Please contact the library admin.' });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// PUT /api/auth/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, department, phone } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (department !== undefined) user.department = department;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  res.json({ user: publicUser(user) });
});

// PUT /api/auth/password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password updated.' });
});
