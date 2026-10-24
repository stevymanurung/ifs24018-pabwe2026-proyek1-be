import { Router } from 'express';
import { createAlarmRoutes } from './modules/alarms/alarms.routes.js';
import { createDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { createSessionRoutes } from './modules/sessions/sessions.routes.js';
import { createSettingsRoutes } from './modules/settings/settings.routes.js';
import { createTaskRoutes } from './modules/tasks/tasks.routes.js';
import { createAuthRoutes, requireAuth } from './modules/auth/auth.js';
import { asyncHandler } from './middleware/asyncHandler.js';

/** Semua endpoint API dikumpulkan di sini dan dipasang di bawah /api. */
export function createApiRouter(controllers, db, authOptions) {
  const router = Router();
  router.get('/', (_req, res) => res.json({
    name: 'Study Planner API',
    status: 'ok',
    health: '/api/health',
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      dashboard: 'GET /api/dashboard',
    },
  }));
  router.get('/health', asyncHandler(async (_req, res) => {
    await db.prepare('SELECT 1').get();
    return res.json({ status: 'ok', database: 'connected', dialect: db.dialect });
  }));
  router.use('/auth', createAuthRoutes(db, authOptions));
  const auth = requireAuth(db, authOptions);
  router.use('/sessions', auth, createSessionRoutes(controllers.sessions));
  router.use('/tasks', auth, createTaskRoutes(controllers.tasks));
  router.use('/alarms', auth, createAlarmRoutes(controllers.alarms));
  router.use('/settings', auth, createSettingsRoutes(controllers.settings));
  router.use('/dashboard', auth, createDashboardRoutes(controllers.dashboard));
  return router;
}
