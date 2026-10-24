const toTask = (row) => ({
  id: row.id,
  title: row.title,
  course: row.course,
  dueDate: row.due_date,
  remindAt: row.remind_at,
  done: row.done === 1 || row.done === true,
});

export function createTaskRepository(db) {
  const selectAll = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY done, CASE WHEN due_date = \'\' THEN 1 ELSE 0 END, due_date, id');
  const selectById = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
  const insert = db.prepare('INSERT INTO tasks (user_id, title, course, due_date, remind_at) VALUES (?, ?, ?, ?, ?)');
  const updateDone = db.prepare('UPDATE tasks SET done = ? WHERE id = ? AND user_id = ?');
  const deleteById = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');

  return {
    async findAll(userId = 1) {
      return (await selectAll.all(userId)).map(toTask);
    },
    async findById(id, userId = 1) {
      const row = await selectById.get(id, userId);
      return row ? toTask(row) : null;
    },
    async create(task, userId = 1) {
      const { lastInsertRowid } = await insert.run(userId, task.title, task.course, task.dueDate, task.remindAt);
      return toTask(await selectById.get(lastInsertRowid, userId));
    },
    async setDone(id, done, userId = 1) {
      if ((await updateDone.run(done ? 1 : 0, id, userId)).changes === 0) return null;
      return toTask(await selectById.get(id, userId));
    },
    async remove(id, userId = 1) {
      return (await deleteById.run(id, userId)).changes > 0;
    },
  };
}
