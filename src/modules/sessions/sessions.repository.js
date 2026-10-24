const toSession = (row) => ({ id: row.id, course: row.course, day: row.day, start: row.start_time, end: row.end_time, room: row.room });

/** Akses data sesi. Seluruh query memakai parameter terikat (?) sehingga aman dari SQL injection. */
export function createSessionRepository(db) {
  const selectAll = db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY day, start_time, id');
  const selectById = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?');
  const insert = db.prepare('INSERT INTO sessions (user_id, course, day, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?)');
  const deleteById = db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?');

  return {
    async findAll(userId = 1) {
      return (await selectAll.all(userId)).map(toSession);
    },
    async findById(id, userId = 1) {
      const row = await selectById.get(id, userId);
      return row ? toSession(row) : null;
    },
    async create(session, userId = 1) {
      const { lastInsertRowid } = await insert.run(userId, session.course, session.day, session.start, session.end, session.room);
      return toSession(await selectById.get(lastInsertRowid, userId));
    },
    async remove(id, userId = 1) {
      return (await deleteById.run(id, userId)).changes > 0;
    },
  };
}
