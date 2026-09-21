const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");

/**
 * OAuth routes — stub implementations.
 * In production, integrate passport.js with Google/GitHub strategies.
 */

// POST /api/oauth/google — accept Google ID token from frontend
router.post("/google", async (req, res) => {
  try {
    const { token: googleToken, name, email, photo_url } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email required from OAuth provider" });
    }

    let [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
    let user;

    if (rows.length) {
      user = rows[0];
      // Update OAuth info if needed
      if (!user.oauth_provider) {
        await pool.execute(
          "UPDATE users SET oauth_provider = 'google', oauth_id = ?, photo_url = COALESCE(photo_url, ?) WHERE id = ?",
          [googleToken, photo_url || null, user.id]
        );
      }
    } else {
      const id = uuidv4();
      await pool.execute(
        `INSERT INTO users (id, name, email, user_roles, primary_role, photo_url, oauth_provider, oauth_id, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, 'google', ?, TRUE)`,
        [id, name || email.split("@")[0], email, JSON.stringify(["PUBLIC"]), "PUBLIC", photo_url || null, googleToken]
      );
      [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
      user = rows[0];
    }

    const jwtToken = jwt.sign({ id: user.id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const userRoles = typeof user.user_roles === "string" ? JSON.parse(user.user_roles) : user.user_roles;

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id, name: user.name, email: user.email,
        primary_role: user.primary_role, user_roles: userRoles,
        is_verified: user.is_verified, photo_url: user.photo_url,
      },
    });
  } catch (err) {
    console.error("OAuth Google error:", err);
    res.status(500).json({ success: false, message: "OAuth login failed" });
  }
});

// POST /api/oauth/github — accept GitHub user data from frontend
router.post("/github", async (req, res) => {
  try {
    const { github_id, name, email, photo_url } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    let [rows] = await pool.execute("SELECT * FROM users WHERE email = ? OR (oauth_provider = 'github' AND oauth_id = ?)", [email, github_id]);
    let user;

    if (rows.length) {
      user = rows[0];
    } else {
      const id = uuidv4();
      await pool.execute(
        `INSERT INTO users (id, name, email, user_roles, primary_role, photo_url, oauth_provider, oauth_id, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, 'github', ?, TRUE)`,
        [id, name || "GitHub User", email, JSON.stringify(["PUBLIC"]), "PUBLIC", photo_url || null, github_id]
      );
      [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
      user = rows[0];
    }

    const jwtToken = jwt.sign({ id: user.id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id, name: user.name, email: user.email,
        primary_role: user.primary_role,
        is_verified: user.is_verified,
      },
    });
  } catch (err) {
    console.error("OAuth GitHub error:", err);
    res.status(500).json({ success: false, message: "OAuth login failed" });
  }
});

module.exports = router;