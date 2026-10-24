import { notFound } from '../../utils/httpError.js';

const FILTERS = {
  all: () => true,
  active: (task) => !task.done,
  done: (task) => task.done,
};

export function createTaskService({ taskRepository }) {
  return {
    async list(status = 'all', userId = 1) {
      return (await taskRepository.findAll(userId)).filter(FILTERS[status]);
    },
    create: (input, userId = 1) => taskRepository.create(input, userId),

    async setDone(id, done, userId = 1) {
      const task = await taskRepository.setDone(id, done, userId);
      if (!task) throw notFound('Tugas tidak ditemukan');
      return task;
    },

    async remove(id, userId = 1) {
      if (!await taskRepository.remove(id, userId)) throw notFound('Tugas tidak ditemukan');
    },
  };
}
