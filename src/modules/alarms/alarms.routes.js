import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { parseId, validate } from '../../middleware/validate.js';
import { createAlarmSchema, updateAlarmSchema } from './alarms.schema.js';

export function createAlarmRoutes(controller) {
  const router = Router();
  router.get('/', asyncHandler(controller.list));
  router.post('/', validate(createAlarmSchema), asyncHandler(controller.create));
  router.patch('/:id', parseId, validate(updateAlarmSchema), asyncHandler(controller.update));
  router.delete('/:id', parseId, asyncHandler(controller.remove));
  return router;
}
