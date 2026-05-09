const { pool } = require('./db');

function getWeekId() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getPrevWeekId() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// GET /api/todos?week=2026-W18
exports.getTodos = async (req, res) => {
  const weekId = req.query.week || getWeekId();
  try {
    const [rows] = await pool.execute(
      'SELECT day_key, item_id, text, done, sort_order FROM todos WHERE user_id = ? AND week_id = ? ORDER BY sort_order',
      [req.user.userId, weekId]
    );
    const days = {};
    ['mon','tue','wed','thu','fri','sat','sun'].forEach(d => { days[d] = []; });
    rows.forEach(r => {
      days[r.day_key].push({ id: r.item_id, text: r.text, done: !!r.done });
    });
    res.json({ weekId, days });
  } catch (e) {
    res.status(500).json({ error: '获取数据失败' });
  }
};

// POST /api/todos/:dayKey  body: { weekId, todos: [{id, text, done}] }
exports.saveDay = async (req, res) => {
  const { dayKey } = req.params;
  const { weekId, todos } = req.body;
  if (!weekId || !todos) return res.status(400).json({ error: '参数错误' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'DELETE FROM todos WHERE user_id = ? AND week_id = ? AND day_key = ?',
      [req.user.userId, weekId, dayKey]
    );
    for (let i = 0; i < todos.length; i++) {
      const t = todos[i];
      await conn.execute(
        'INSERT INTO todos (user_id, week_id, day_key, item_id, text, done, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.userId, weekId, dayKey, t.id, t.text || '', t.done ? 1 : 0, i]
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: '保存失败' });
  } finally {
    conn.release();
  }
};

// GET /api/stats
exports.getStats = async (req, res) => {
  const weekId = getWeekId();
  const prevWeekId = getPrevWeekId();

  async function countDays(wid) {
    const [rows] = await pool.execute(
      `SELECT day_key FROM todos WHERE user_id = ? AND week_id = ? GROUP BY day_key HAVING COUNT(*) > 0 AND SUM(done) = COUNT(*)`,
      [req.user.userId, wid]
    );
    return rows.length;
  }

  async function getTodayInfo() {
    const jsDay = new Date().getDay();
    const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
    const dayKey = dayKeys[jsDay === 0 ? 6 : jsDay - 1];
    const [rows] = await pool.execute(
      'SELECT done FROM todos WHERE user_id = ? AND week_id = ? AND day_key = ?',
      [req.user.userId, weekId, dayKey]
    );
    const total = rows.length;
    const done = rows.filter(r => r.done).length;
    return { done, total };
  }

  try {
    const [today, weekDays, lastWeekDays] = await Promise.all([
      getTodayInfo(),
      countDays(weekId),
      countDays(prevWeekId),
    ]);
    res.json({ today, weekDays, lastWeekDays });
  } catch (e) {
    res.status(500).json({ error: '获取统计失败' });
  }
};
