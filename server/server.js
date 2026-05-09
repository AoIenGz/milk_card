const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const { register, login, authMiddleware } = require('./auth');
const { getTodos, saveDay, getStats } = require('./todos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://yourusername.github.io', 'http://localhost:8765'],
  credentials: true,
}));
app.use(express.json());

// Auth routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Protected routes
app.use('/api', authMiddleware);
app.get('/api/todos', getTodos);
app.post('/api/todos/:dayKey', saveDay);
app.get('/api/stats', getStats);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // 每天凌晨3点清理超过14天的待办数据
  const { pool } = require('./db');
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() === 0) {
      cleanOldTodos(pool);
    }
  }, 60000);
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

async function cleanOldTodos(pool) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const y = cutoff.getFullYear();
    const jan1 = new Date(y, 0, 1);
    const days = Math.floor((cutoff - jan1) / 86400000);
    const cutoffWeek = `${y}-W${String(Math.ceil((days + jan1.getDay() + 1) / 7)).padStart(2, '0')}`;
    const [result] = await pool.execute(
      'DELETE FROM todos WHERE week_id < ?',
      [cutoffWeek]
    );
    if (result.affectedRows > 0) {
      console.log(`Cleaned ${result.affectedRows} old todos (before ${cutoffWeek})`);
    }
  } catch (e) {
    console.error('Clean old todos error:', e.message);
  }
}
