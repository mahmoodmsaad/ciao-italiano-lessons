import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';

/** Token verify karke req.user set karta hai. */
export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Login required. Token nahi mila.' });
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], config.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: 'User ab maujood nahi hai.' });
    if (!user.isActive) {
      return res.status(403).json({ message: 'Aapka account block hai. Admin se rabta karein.' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalid ya expire ho chuka hai.' });
  }
}

/** Sirf diye gaye roles ko aage jaane deta hai. Misal: adminOnly = allow('admin') */
export function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Is kaam ki ijazat nahi hai.' });
    }
    next();
  };
}

export const adminOnly = allow('admin');
