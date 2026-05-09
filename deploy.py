import paramiko
import sys
import time

HOST = '101.132.128.217'
USER = 'root'
PASS = '9sK$7pG&2zR!5tQ#'

SERVER_JS = r'''const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'milk_card_jwt_2026';
const DB_PASS = process.env.DB_PASSWORD || 'MilkCard2026!';

const pool = mysql.createPool({
  host: 'localhost', user: 'root', password: DB_PASS,
  database: 'milk_card', waitForConnections: true, connectionLimit: 10,
});

async function initDB() {
  const c = await pool.getConnection();
  try {
    await c.execute("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    await c.execute("CREATE TABLE IF NOT EXISTS todos (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, week_id VARCHAR(20) NOT NULL, day_key ENUM('mon','tue','wed','thu','fri','sat','sun') NOT NULL, item_id VARCHAR(30) NOT NULL, text TEXT NOT NULL, done BOOLEAN DEFAULT FALSE, sort_order INT DEFAULT 0, UNIQUE KEY uk_todo (user_id, week_id, day_key, item_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    console.log('DB ready');
  } finally { c.release(); }
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'no auth' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch(e) { res.status(401).json({ error: 'expired' }); }
}

function getWeekId() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - jan1) / 86400000);
  return now.getFullYear() + '-W' + String(Math.ceil((days + jan1.getDay() + 1) / 7)).padStart(2, '0');
}

function getPrevWeekId() {
  const d = new Date(); d.setDate(d.getDate() - 7);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - jan1) / 86400000);
  return d.getFullYear() + '-W' + String(Math.ceil((days + jan1.getDay() + 1) / 7)).padStart(2, '0');
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'empty' });
  if (password.length < 6) return res.status(400).json({ error: 'short' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    const token = jwt.sign({ userId: r.insertId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch(e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'exists' });
    res.status(500).json({ error: 'fail' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'empty' });
  try {
    const [rows] = await pool.execute('SELECT id, password_hash FROM users WHERE username = ?', [username]);
    if (!rows.length) return res.status(401).json({ error: 'wrong' });
    if (!(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: 'wrong' });
    const token = jwt.sign({ userId: rows[0].id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch(e) { res.status(500).json({ error: 'fail' }); }
});

app.get('/api/todos', authMiddleware, async (req, res) => {
  const weekId = req.query.week || getWeekId();
  try {
    const [rows] = await pool.execute('SELECT day_key, item_id, text, done, sort_order FROM todos WHERE user_id = ? AND week_id = ? ORDER BY sort_order', [req.user.userId, weekId]);
    const days = {}; ['mon','tue','wed','thu','fri','sat','sun'].forEach(d => days[d] = []);
    rows.forEach(r => days[r.day_key].push({ id: r.item_id, text: r.text, done: !!r.done }));
    res.json({ weekId, days });
  } catch(e) { res.status(500).json({ error: 'fail' }); }
});

app.post('/api/todos/:dayKey', authMiddleware, async (req, res) => {
  const { dayKey } = req.params;
  const { weekId, todos } = req.body;
  if (!weekId || !todos) return res.status(400).json({ error: 'bad' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM todos WHERE user_id = ? AND week_id = ? AND day_key = ?', [req.user.userId, weekId, dayKey]);
    for (let i = 0; i < todos.length; i++) {
      const t = todos[i];
      await conn.execute('INSERT INTO todos (user_id, week_id, day_key, item_id, text, done, sort_order) VALUES (?,?,?,?,?,?,?)', [req.user.userId, weekId, dayKey, t.id, t.text||'', t.done?1:0, i]);
    }
    await conn.commit();
    res.json({ ok: true });
  } catch(e) { await conn.rollback(); res.status(500).json({ error: 'fail' }); }
  finally { conn.release(); }
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  const weekId = getWeekId(), prevWeekId = getPrevWeekId();
  async function countDays(wid) {
    const [rows] = await pool.execute('SELECT day_key FROM todos WHERE user_id = ? AND week_id = ? GROUP BY day_key HAVING COUNT(*)>0 AND SUM(done)=COUNT(*)', [req.user.userId, wid]);
    return rows.length;
  }
  async function todayInfo() {
    const jsDay = new Date().getDay();
    const dayKey = ['mon','tue','wed','thu','fri','sat','sun'][jsDay===0?6:jsDay-1];
    const [rows] = await pool.execute('SELECT done FROM todos WHERE user_id=? AND week_id=? AND day_key=?', [req.user.userId, weekId, dayKey]);
    return { done: rows.filter(r=>r.done).length, total: rows.length };
  }
  try {
    const [today, weekDays, lastWeekDays] = await Promise.all([todayInfo(), countDays(weekId), countDays(prevWeekId)]);
    res.json({ today, weekDays, lastWeekDays });
  } catch(e) { res.status(500).json({ error: 'fail' }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

initDB().then(() => {
  app.listen(3000, '0.0.0.0', () => console.log('Running on :3000'));
}).catch(e => { console.error(e); process.exit(1); });
'''

SERVICE_FILE = r'''[Unit]
Description=Milk Card API
After=network.target mysql.service

[Service]
WorkingDirectory=/opt/milk-card/server
ExecStart=/usr/bin/node server.js
Restart=always
Environment=DB_PASSWORD=MilkCard2026!
Environment=JWT_SECRET=milk_card_jwt_prod_2026

[Install]
WantedBy=multi-user.target
'''

def run(ssh, cmd, check=True):
    print(f'>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    if out.strip(): print(out.strip()[-500:])
    if err.strip() and code != 0: print(f'STDERR: {err.strip()[-500:]}')
    if check and code != 0:
        print(f'FAILED (exit {code})')
        sys.exit(1)
    return out, err, code

def main():
    print(f'Connecting to {HOST}...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=15)
    print('Connected!')

    # 1. Check/Install MySQL
    print('\n=== Step 1: MySQL ===')
    out, _, _ = run(ssh, 'which mysql', check=False)
    if not out.strip():
        print('Installing MySQL...')
        run(ssh, 'export DEBIAN_FRONTEND=noninteractive && apt-get update -qq && apt-get install -y -qq mysql-server')
    else:
        print('MySQL already installed')

    # 2. Start MySQL
    print('\n=== Step 2: Start MySQL ===')
    run(ssh, 'systemctl start mysql || service mysql start', check=False)
    run(ssh, 'systemctl enable mysql || true', check=False)

    # 3. Set root password and create DB
    print('\n=== Step 3: Setup DB ===')
    run(ssh, "mysql -e \"ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'MilkCard2026!'; FLUSH PRIVILEGES;\" 2>/dev/null || mysql -e \"CREATE USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'MilkCard2026!'; FLUSH PRIVILEGES;\" 2>/dev/null || true", check=False)
    run(ssh, "mysql -uroot -p'MilkCard2026!' -e \"CREATE DATABASE IF NOT EXISTS milk_card CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"")

    # 4. Check/Install Node.js
    print('\n=== Step 4: Node.js ===')
    out, _, _ = run(ssh, 'node -v', check=False)
    if 'v20' not in out:
        print('Installing Node.js 20...')
        run(ssh, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -', check=False)
        run(ssh, 'apt-get install -y -qq nodejs')
    else:
        print(f'Node.js {out.strip()} already installed')

    # 5. Create project dir and install deps
    print('\n=== Step 5: Install deps ===')
    run(ssh, 'mkdir -p /opt/milk-card/server')
    run(ssh, 'cd /opt/milk-card/server && npm init -y 2>/dev/null; npm install express mysql2 bcryptjs jsonwebtoken cors')

    # 6. Upload server.js via SFTP
    print('\n=== Step 6: Upload server.js ===')
    sftp = ssh.open_sftp()
    with sftp.open('/opt/milk-card/server/server.js', 'w') as f:
        f.write(SERVER_JS)
    sftp.close()
    print('server.js uploaded')

    # 7. Upload systemd service via SSH command
    print('\n=== Step 7: Setup systemd ===')
    svc = SERVICE_FILE.replace("'", "'\\''")
    run(ssh, f"echo '{svc}' > /etc/systemd/system/milk-card.service")
    print('Service file written')

    # 8. Start service
    print('\n=== Step 8: Start service ===')
    run(ssh, 'systemctl daemon-reload')
    run(ssh, 'systemctl enable milk-card')
    run(ssh, 'systemctl restart milk-card')

    # 9. Verify
    print('\n=== Step 9: Verify ===')
    time.sleep(3)
    run(ssh, 'curl -s http://localhost:3000/api/health')

    # 10. Open firewall
    print('\n=== Step 10: Firewall ===')
    run(ssh, 'ufw allow 3000 2>/dev/null || iptables -I INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true', check=False)

    print('\n=== DONE! ===')
    ssh.close()

if __name__ == '__main__':
    main()
