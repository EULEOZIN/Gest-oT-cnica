import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { router } from './routes.js';

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((value) => value.trim()), credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

app.use('/api', router);
app.use(notFoundHandler);
app.use(errorHandler);
