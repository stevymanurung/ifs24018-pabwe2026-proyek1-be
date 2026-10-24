import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { updateSettingsSchema } from './settings.schema.js';

export function createSettingsRoutes(controller) {
  const router = Router();
  router.get('/', asyncHandler(controller.get));
  router.put('/', validate(updateSettingsSchema), asyncHandler(controller.update));
  return router;
}
