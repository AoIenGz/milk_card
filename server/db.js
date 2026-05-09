const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD || 'MilkCard2026!',
  database: 'milk_card',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        week_id VARCHAR(20) NOT NULL,
        day_key ENUM('mon','tue','wed','thu','fri','sat','sun') NOT NULL,
        item_id VARCHAR(30) NOT NULL,
        text TEXT NOT NULL,
        done BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        UNIQUE KEY uk_todo (user_id, week_id, day_key, item_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('Database initialized');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
