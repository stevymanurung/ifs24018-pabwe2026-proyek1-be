import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { parseId, validate } from '../../middleware/validate.js';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from './tasks.schema.js';

export function createTaskRoutes(controller) {
  const router = Router();
  router.get('/', validate(listTasksQuerySchema, 'query'), asyncHandler(controller.list));
  router.post('/', validate(createTaskSchema), asyncHandler(controller.create));
  router.patch('/:id', parseId, validate(updateTaskSchema), asyncHandler(controller.update));
  router.delete('/:id', parseId, asyncHandler(controller.remove));
  return router;
}
