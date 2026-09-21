const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const pool = require("../db");
const { sendEmail, templates } = require("../services/emailService");

function generateToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// ─── USER REGISTER ────────────────────────────────────────────────────────────
exports.userRegister = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      name, email, password, primary_role = "PUBLIC",
      user_roles, gender, district, municipality, province,
      // Student
      institution_name, class: cls, section, roll_number, batch, institution_id,
      // Employee
      company_name, company_id, branch, job_role,
      // Public
      citizenship_number, ward_number,
      custom_fields = {},
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    const [existing] = await conn.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const roles = user_roles
      ? (Array.isArray(user_roles) ? user_roles : [user_roles])
      : [primary_role];

    await conn.execute(
      `INSERT INTO users (
        id, name, email, password, user_roles, primary_role, gender,
        institution_name, class, section, roll_number, batch, institution_id,
        company_name, company_id, branch, job_role,
        citizenship_number, ward_number,
        district, municipality, province, custom_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, email, hashed,
        JSON.stringify(roles), primary_role, gender || null,
        institution_name || null, cls || null, section || null, roll_number || null, batch || null, institution_id || null,
        company_name || null, company_id || null, branch || null, job_role || null,
        citizenship_number || null, ward_number || null,
        district || null, municipality || null, province || null,
        JSON.stringify(custom_fields),
      ]
    );

    // Send welcome email (non-blocking)
    const tmpl = templates.welcome(name);
    sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html }).catch(() => {});

    const token = generateToken({ id, isAdmin: false });

    res.status(201).json({
      success: true,
      message: "Registration successful. Please wait for admin verification.",
      token,
      user: { id, name, email, primary_role, user_roles: roles, is_verified: false },
    });
  } catch (err) {
    console.error("userRegister error:", err);
    res.status(500).json({ success: false, message: "Registration failed" });
  } finally {
    conn.release();
  }
};

// ─── USER LOGIN ───────────────────────────────────────────────────────────────
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = rows[0];
    if (!user.password) {
      return res.status(401).json({ success: false, message: "Please use OAuth to login" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken({ id: user.id, isAdmin: false });
    const userRoles = typeof user.user_roles === "string" ? JSON.parse(user.user_roles) : user.user_roles;

    res.json({
      success: true,
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        primary_role: user.primary_role, user_roles: userRoles,
        is_verified: user.is_verified, wallet_address: user.wallet_address,
      },
    });
  } catch (err) {
    console.error("userLogin error:", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

// ─── ADMIN REGISTER ───────────────────────────────────────────────────────────
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, password, secret } = req.body;

    if (secret !== process.env.ADMIN_REGISTRATION_SECRET) {
      return res.status(403).json({ success: false, message: "Invalid registration secret" });
    }

    const [existing] = await pool.execute("SELECT id FROM admins WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Admin email already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.execute(
      "INSERT INTO admins (id, name, email, password) VALUES (?, ?, ?, ?)",
      [id, name, email, hashed]
    );

    const token = generateToken({ id, isAdmin: true });
    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      token,
      admin: { id, name, email, role: "ADMIN" },
    });
  } catch (err) {
    console.error("adminRegister error:", err);
    res.status(500).json({ success: false, message: "Admin registration failed" });
  }
};

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM admins WHERE email = ? AND is_active = TRUE",
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken({ id: admin.id, isAdmin: true });
    res.json({
      success: true,
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error("adminLogin error:", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const [rows] = await pool.execute(
        "SELECT id, name, email, role, is_active, created_at FROM admins WHERE id = ?",
        [req.user.id]
      );
      return res.json({ success: true, user: { ...rows[0], isAdmin: true } });
    }

    const [rows] = await pool.execute(
      `SELECT id, name, email, user_roles, primary_role, gender, photo_url, photo_cid,
       is_verified, wallet_address, institution_name, class, section, roll_number, batch,
       company_name, company_id, branch, job_role, citizenship_number, ward_number,
       district, municipality, province, custom_fields, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });

    const user = rows[0];
    user.user_roles = typeof user.user_roles === "string" ? JSON.parse(user.user_roles) : user.user_roles;
    user.custom_fields = typeof user.custom_fields === "string" ? JSON.parse(user.custom_fields) : user.custom_fields;

    res.json({ success: true, user });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ success: false, message: "Failed to get profile" });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email, isAdmin = false } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const table = isAdmin ? "admins" : "users";
    const [rows] = await pool.execute(`SELECT id, name FROM ${table} WHERE email = ?`, [email]);

    if (!rows.length) {
      // Don't reveal if email exists
      return res.json({ success: true, message: "If the email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await pool.execute(
      `UPDATE ${table} SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`,
      [token, expiry, rows[0].id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&type=${isAdmin ? "admin" : "user"}`;
    const tmpl = templates.passwordReset(rows[0].name, resetUrl);
    await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html });

    res.json({ success: true, message: "If the email exists, a reset link has been sent." });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ success: false, message: "Failed to process request" });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, type = "user" } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password required" });
    }

    const table = type === "admin" ? "admins" : "users";
    const [rows] = await pool.execute(
      `SELECT id FROM ${table} WHERE reset_token = ? AND reset_token_expiry > NOW()`,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(password, 12);
    await pool.execute(
      `UPDATE ${table} SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?`,
      [hashed, rows[0].id]
    );

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ success: false, message: "Password reset failed" });
  }
};

// ─── UPDATE WALLET ────────────────────────────────────────────────────────────
exports.updateWallet = async (req, res) => {
  try {
    const { wallet_address } = req.body;
    if (!wallet_address) {
      return res.status(400).json({ success: false, message: "Wallet address required" });
    }

    await pool.execute("UPDATE users SET wallet_address = ? WHERE id = ?", [
      wallet_address,
      req.user.id,
    ]);

    res.json({ success: true, message: "Wallet address updated" });
  } catch (err) {
    console.error("updateWallet error:", err);
    res.status(500).json({ success: false, message: "Failed to update wallet" });
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const table = req.user.isAdmin ? "admins" : "users";

    const [rows] = await pool.execute(`SELECT password FROM ${table} WHERE id = ?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });

    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) return res.status(400).json({ success: false, message: "Current password incorrect" });

    const hashed = await bcrypt.hash(new_password, 12);
    await pool.execute(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashed, req.user.id]);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ success: false, message: "Failed to change password" });
  }
};