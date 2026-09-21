// models/userModel.js
"use strict";

const { query } = require("../config/db");

// ─── helpers ────────────────────────────────────────────────────────────────

const BASE_SELECT = `
  SELECT id, name, email, role, is_verified, wallet_address,
         doc_path, otp, otp_expires, refresh_token, created_at, updated_at
  FROM users
`;

// ─── reads ───────────────────────────────────────────────────────────────────

async function findById(id) {
  const [rows] = await query(`${BASE_SELECT} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await query(
    `SELECT * FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findByWallet(walletAddress) {
  const [rows] = await query(
    `${BASE_SELECT} WHERE LOWER(wallet_address) = LOWER(?) LIMIT 1`,
    [walletAddress]
  );
  return rows[0] || null;
}

async function findAll({ role = null, limit = 100, offset = 0 } = {}) {
  if (role) {
    const [rows] = await query(
      `${BASE_SELECT} WHERE role = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [role, limit, offset]
    );
    return rows;
  }
  const [rows] = await query(
    `${BASE_SELECT} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

async function countAll({ role = null } = {}) {
  const where = role ? "WHERE role = ?" : "";
  const params = role ? [role] : [];
  const [rows] = await query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
  return rows[0].total;
}

// ─── writes ──────────────────────────────────────────────────────────────────

async function create({ id, name, email, passwordHash, role = "voter" }) {
  await query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, email, passwordHash, role]
  );
  return findById(id);
}

async function update(id, fields) {
  const allowed = [
    "name", "email", "password_hash", "role", "is_verified",
    "wallet_address", "doc_path", "otp", "otp_expires", "refresh_token",
  ];
  const sets   = [];
  const values = [];

  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      sets.push(`\`${k}\` = ?`);
      values.push(v);
    }
  }
  if (!sets.length) return findById(id);

  values.push(id);
  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  const [result] = await query(`DELETE FROM users WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

// ─── OTP helpers ─────────────────────────────────────────────────────────────

async function setOtp(id, otp, expiresAt) {
  await query(
    `UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?`,
    [otp, expiresAt, id]
  );
}

async function clearOtp(id) {
  await query(
    `UPDATE users SET otp = NULL, otp_expires = NULL WHERE id = ?`,
    [id]
  );
}

// ─── refresh token ───────────────────────────────────────────────────────────

async function setRefreshToken(id, token) {
  await query(`UPDATE users SET refresh_token = ? WHERE id = ?`, [token, id]);
}

async function findByRefreshToken(token) {
  const [rows] = await query(
    `${BASE_SELECT} WHERE refresh_token = ? LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function clearRefreshToken(id) {
  await query(`UPDATE users SET refresh_token = NULL WHERE id = ?`, [id]);
}

module.exports = {
  findById,
  findByEmail,
  findByWallet,
  findAll,
  countAll,
  create,
  update,
  remove,
  setOtp,
  clearOtp,
  setRefreshToken,
  findByRefreshToken,
  clearRefreshToken,
};