require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require('pg');
const path = require("path");
const dbConfig = require('../config/db.config');

const app = express();
const PORT = process.env.PORT || 10000;

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || dbConfig.url,
  ssl: { rejectUnauthorized: false }
});

// Ensure messages table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        message TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp DESC);
    `);
    console.log('Connected to Postgres and ensured table exists');
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  }
})();

// Middleware
app.use(cors({
  origin: ['http://localhost:10000', 'http://127.0.0.1:10000'],
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API: Create message
app.post("/api/messages", async (req, res) => {
  try {
    const { name, type, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await pool.query(
      'INSERT INTO messages (name, type, message, timestamp) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), type || "general", message.trim(), Date.now()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to save message", details: err.message });
  }
});

// API: Get all messages
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi đọc dữ liệu", details: err.toString() });
  }
});

// API: Stats
app.get("/api/stats", async (req, res) => {
  try {
    const [totalResult, byTypeResult, latestResult, todayResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM messages'),
      pool.query('SELECT type, COUNT(*) FROM messages GROUP BY type'),
      pool.query('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 1'),
      pool.query('SELECT COUNT(*) FROM messages WHERE timestamp >= $1', [new Date().setHours(0, 0, 0, 0)])
    ]);
    res.json({
      total: parseInt(totalResult.rows[0].count),
      byType: Object.fromEntries(byTypeResult.rows.map(x => [x.type, parseInt(x.count)])),
      latest: latestResult.rows[0],
      today: parseInt(todayResult.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi thống kê", details: err.toString() });
  }
});

// API: Delete message (admin only)
app.delete("/api/messages/:id", async (req, res) => {
  const adminPass = req.headers['x-admin-password'];
  if (adminPass !== "nct") {
    return res.status(403).json({ error: "Sai mật khẩu admin hoặc không có quyền xóa" });
  }
  try {
    const result = await pool.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy tin nhắn để xóa" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Lỗi xóa tin nhắn", details: err.toString() });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
