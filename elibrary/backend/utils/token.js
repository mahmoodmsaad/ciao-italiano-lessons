import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    rollNo: user.rollNo,
    department: user.department,
    phone: user.phone,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
