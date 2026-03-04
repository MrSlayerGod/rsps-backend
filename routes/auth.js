const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const websiteDB = require("../db/website-db");
const { authenticate } = require("../middleware/auth");
const { sendVerificationEmail } = require("../lib/email");

const router = express.Router();

router.post("/register", async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });
    if (username.length < 3 || username.length > 12) return res.status(400).json({ error: "Username must be 3-12 characters" });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscores only" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email address" });

    const [existing] = await conn.query("SELECT id FROM website_users WHERE username = ? OR email = ?", [username, email]);
    if (existing.length > 0) return res.status(409).json({ error: "Username or email already exists" });

    const hash = bcrypt.hashSync(password, 12);
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await conn.query(
      "INSERT INTO website_users (username, email, password_hash, display_name, email_token, email_token_expires) VALUES (?, ?, ?, ?, ?, ?)",
      [username, email, hash, username, token, expires]
    );

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(email, username, token).catch(err =>
      console.error("Failed to send verification email:", err.message)
    );

    res.status(201).json({ message: "Account created! Check your email to verify your account before logging in." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

router.get("/verify-email", async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Missing token" });

    const [users] = await conn.query(
      "SELECT * FROM website_users WHERE email_token = ? AND email_token_expires > NOW()",
      [token]
    );
    if (users.length === 0) return res.status(400).json({ error: "Invalid or expired verification link" });

    const user = users[0];
    await conn.query(
      "UPDATE website_users SET email_verified = 1, email_token = NULL, email_token_expires = NULL WHERE id = ?",
      [user.id]
    );

    // Auto-login after verification
    const jwt_token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      message: "Email verified! You are now logged in.",
      token: jwt_token,
      user: {
        id: user.id, username: user.username, email: user.email,
        display_name: user.display_name, donor_rank: user.donor_rank,
        donor_total: parseFloat(user.donor_total), created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("Verify error:", err);
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

    if (!user.email_verified) {
      return res.status(403).json({ error: "Please verify your email before logging in. Check your inbox.", unverified: true });
    }

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

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const [users] = await conn.query("SELECT * FROM website_users WHERE email = ? AND email_verified = 0", [email]);
    if (users.length === 0) return res.json({ message: "If that email exists and is unverified, we sent a new link." });

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await conn.query("UPDATE website_users SET email_token = ?, email_token_expires = ? WHERE id = ?", [token, expires, user.id]);

    sendVerificationEmail(user.email, user.username, token).catch(err =>
      console.error("Failed to send verification email:", err.message)
    );

    res.json({ message: "If that email exists and is unverified, we sent a new link." });
  } catch (err) {
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
