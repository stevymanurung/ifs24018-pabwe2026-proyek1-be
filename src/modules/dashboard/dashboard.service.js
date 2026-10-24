import { buildDashboard } from '../../domain/dashboard.js';
import { parseLocalNow } from '../../domain/time.js';
export function createDashboardService({ sessionRepository, taskRepository }) {
  return {
    async build(nowText, userId = 1) {
      const now = nowText ? parseLocalNow(nowText) : new Date();
      const [sessions, tasks] = await Promise.all([
        sessionRepository.findAll(userId),
        taskRepository.findAll(userId),
      ]);
      return buildDashboard({ sessions, tasks, now });
    },
  };
}
