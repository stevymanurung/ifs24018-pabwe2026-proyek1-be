import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { dashboardQuerySchema } from './dashboard.schema.js';

export function createDashboardRoutes(controller) {
  const router = Router();
  router.get('/', validate(dashboardQuerySchema, 'query'), asyncHandler(controller.get));
  return router;
}
