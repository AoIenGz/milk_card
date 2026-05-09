const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'milk_card_secret_change_me';
const JWT_EXPIRES = '7d';

exports.register = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length > 50) return res.status(400).json({ error: '用户名太长' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );
    const token = jwt.sign({ userId: result.insertId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, username });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: '用户名已存在' });
    res.status(500).json({ error: '注册失败' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  try {
    const [rows] = await pool.execute('SELECT id, password_hash FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: '用户名或密码错误' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

    const token = jwt.sign({ userId: rows[0].id, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, username });
  } catch (e) {
    res.status(500).json({ error: '登录失败' });
  }
};

exports.authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: '登录已过期' });
  }
};
