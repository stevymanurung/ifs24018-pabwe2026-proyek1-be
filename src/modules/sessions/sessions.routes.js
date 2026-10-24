import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { parseId, validate } from '../../middleware/validate.js';
import { createSessionSchema } from './sessions.schema.js';

export function createSessionRoutes(controller) {
  const router = Router();
  router.get('/', asyncHandler(controller.list));
  router.post('/', validate(createSessionSchema), asyncHandler(controller.create));
  router.delete('/:id', parseId, asyncHandler(controller.remove));
  return router;
}
