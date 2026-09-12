import dotenv from 'dotenv';

dotenv.config();

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: num(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_insecure_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Library rules - inhe .env se badla ja sakta hai
  loanPeriodDays: num(process.env.LOAN_PERIOD_DAYS, 14),
  finePerDay: num(process.env.FINE_PER_DAY, 5),
  maxBooksPerStudent: num(process.env.MAX_BOOKS_PER_STUDENT, 3),
  maxRenewals: num(process.env.MAX_RENEWALS, 1),
};

if (config.jwtSecret === 'dev_only_insecure_secret') {
  console.warn('[warn] JWT_SECRET .env mein set nahi hai - development default use ho raha hai.');
}
