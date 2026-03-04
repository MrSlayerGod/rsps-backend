const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const websiteDB = require("../db/website-db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });
    if (username.length < 3 || username.length > 12) return res.status(400).json({ error: "Username must be 3-12 characters" });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscores only" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const [existing] = await conn.query("SELECT id FROM website_users WHERE username = ? OR email = ?", [username, email]);
    if (existing.length > 0) return res.status(409).json({ error: "Username or email already exists" });

    const hash = bcrypt.hashSync(password, 12);
    const [result] = await conn.query(
      "INSERT INTO website_users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)",
      [username, email, hash, username]
    );

    const token = jwt.sign({ id: result.insertId, username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({
      token,
      user: { id: result.insertId, username, email, display_name: username, donor_rank: "None", donor_total: 0, created_at: new Date().toISOString() }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

router.post("/login", async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const [users] = await conn.query("SELECT * FROM website_users WHERE username = ?", [username]);
    if (users.length === 0 || !bcrypt.compareSync(password, users[0].password_hash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = users[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        display_name: user.display_name, donor_rank: user.donor_rank,
        donor_total: parseFloat(user.donor_total), created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

router.get("/me", authenticate, async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const [users] = await conn.query(
      "SELECT id, username, email, display_name, donor_rank, donor_total, created_at FROM website_users WHERE id = ?",
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: "User not found" });
    users[0].donor_total = parseFloat(users[0].donor_total);
    res.json({ user: users[0] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

module.exports = router;