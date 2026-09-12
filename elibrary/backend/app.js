import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { config } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
if (config.nodeEnv === 'development') app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rules: {
      loanPeriodDays: config.loanPeriodDays,
      finePerDay: config.finePerDay,
      maxBooksPerStudent: config.maxBooksPerStudent,
      maxRenewals: config.maxRenewals,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
