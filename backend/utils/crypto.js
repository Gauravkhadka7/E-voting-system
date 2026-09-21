// utils/crypto.js
"use strict";


const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");

const SALT_ROUNDS       = 12;
const ACCESS_SECRET     = process.env.JWT_SECRET         || "change_me_access";
const REFRESH_SECRET    = process.env.JWT_REFRESH_SECRET || "change_me_refresh";
const ACCESS_EXPIRES    = process.env.JWT_EXPIRES        || "15m";
const REFRESH_EXPIRES   = process.env.JWT_REFRESH_EXPIRES || "7d";

// ─── password ────────────────────────────────────────────────────────────────

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);   // throws if invalid
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);  // throws if invalid
}

/** Build both tokens and return them together with expiry info. */
function issueTokenPair(user) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return {
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    expiresIn:    ACCESS_EXPIRES,
  };
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

/** Generate a 6-digit numeric OTP. */
function generateOtp() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

/** Returns a Date object <minutes> from now (UTC). */
function otpExpiry(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ─── misc ────────────────────────────────────────────────────────────────────

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  issueTokenPair,
  generateOtp,
  otpExpiry,
  generateSecureToken,
};