const toAlarm = (row) => ({
  id: row.id,
  label: row.label,
  time: row.time,
  days: row.days.split(',').map(Number),
  enabled: row.enabled === 1 || row.enabled === true,
});

export function createAlarmRepository(db) {
  const selectAll = db.prepare('SELECT * FROM alarms WHERE user_id = ? ORDER BY time, id');
  const selectById = db.prepare('SELECT * FROM alarms WHERE id = ? AND user_id = ?');
  const insert = db.prepare('INSERT INTO alarms (user_id, label, time, days) VALUES (?, ?, ?, ?)');
  const updateEnabled = db.prepare('UPDATE alarms SET enabled = ? WHERE id = ? AND user_id = ?');
  const deleteById = db.prepare('DELETE FROM alarms WHERE id = ? AND user_id = ?');

  return {
    async findAll(userId = 1) {
      return (await selectAll.all(userId)).map(toAlarm);
    },
    async create({ label, time, days }, userId = 1) {
      const { lastInsertRowid } = await insert.run(userId, label, time, days.join(','));
      return toAlarm(await selectById.get(lastInsertRowid, userId));
    },
    async setEnabled(id, enabled, userId = 1) {
      if ((await updateEnabled.run(enabled ? 1 : 0, id, userId)).changes === 0) return null;
      return toAlarm(await selectById.get(id, userId));
    },
    async remove(id, userId = 1) {
      return (await deleteById.run(id, userId)).changes > 0;
    },
  };
}
