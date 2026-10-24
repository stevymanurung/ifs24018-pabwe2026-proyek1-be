import { notFound } from '../../utils/httpError.js';

export function createAlarmService({ alarmRepository }) {
  return {
    list: (userId = 1) => alarmRepository.findAll(userId),
    create: (input, userId = 1) => alarmRepository.create(input, userId),

    async setEnabled(id, enabled, userId = 1) {
      const alarm = await alarmRepository.setEnabled(id, enabled, userId);
      if (!alarm) throw notFound('Alarm tidak ditemukan');
      return alarm;
    },

    async remove(id, userId = 1) {
      if (!await alarmRepository.remove(id, userId)) throw notFound('Alarm tidak ditemukan');
    },
  };
}
