import { DEFAULT_REMINDER_LEAD } from './settings.schema.js';

export function createSettingsService({ settingsRepository }) {
  const read = async (userId = 1) => ({
    reminderLead: Number(await settingsRepository.get('reminderLead', userId) ?? DEFAULT_REMINDER_LEAD),
  });

  return {
    get: read,
    async update({ reminderLead }, userId = 1) {
      await settingsRepository.set('reminderLead', reminderLead, userId);
      return read(userId);
    },
  };
}
