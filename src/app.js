import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { createContainer } from './container.js';
import { cors } from './middleware/cors.js';
import { apiNotFound, errorHandler } from './middleware/errorHandler.js';
import { createApiRouter } from './routes.js';
import { logger as defaultLogger } from './utils/logger.js';

/** Membuat aplikasi Express. Database diinjeksikan sehingga pengujian dapat memakai SQLite in-memory. */
export function createApp({ db, logger = defaultLogger, clientDist = config.clientDist } = {}) {
  if (!db) throw new TypeError('createApp membutuhkan koneksi database melalui opsi db.');
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(config.corsOrigin));
  app.use(express.json({ limit: '10kb' }));

  // Root endpoint makes it clear the backend is online; the frontend remains a separate deployment.
  app.get('/', (_req, res) => res.json({
    name: 'Study Planner API',
    status: 'ok',
    health: '/api/health',
    endpoints: ['/api/auth', '/api/tasks', '/api/sessions', '/api/alarms', '/api/settings', '/api/dashboard'],
  }));

  app.use('/api', createApiRouter(createContainer(db), db));
  app.use('/api', apiNotFound);

  // Sajikan frontend hanya jika folder build tersedia.
  const distDir = clientDist ? path.resolve(clientDist) : '';
  if (distDir && fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.use(errorHandler(logger));
  return app;
}
