import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';

/** Verifies the token and puts the user on req.user. */
export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Login required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], config.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: 'This user no longer exists.' });
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is blocked. Please contact the library admin.' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/** Lets only the listed roles through. For example: adminOnly = allow('admin') */
export function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You are not allowed to perform this action.' });
    }
    next();
  };
}

export const adminOnly = allow('admin');
