import { findConflict, sortSessions } from '../../domain/sessions.js';
import { conflict, notFound } from '../../utils/httpError.js';

/** Aturan bisnis sesi jadwal; tidak mengenal HTTP maupun SQL. */
export function createSessionService({ sessionRepository }) {
  return {
    async list(userId = 1) {
      return sortSessions(await sessionRepository.findAll(userId));
    },

    async create(input, userId = 1) {
      const clash = findConflict(await sessionRepository.findAll(userId), input);
      if (clash) {
        throw conflict('SESSION_CONFLICT', `Bentrok dengan "${clash.course}" (${clash.start} - ${clash.end})`);
      }
      return sessionRepository.create(input, userId);
    },

    async remove(id, userId = 1) {
      if (!await sessionRepository.remove(id, userId)) throw notFound('Sesi tidak ditemukan');
    },
  };
}
