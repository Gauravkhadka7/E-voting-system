"use strict";

const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db     = require("../services/ipfsDB");
const { sendUserVerification, sendAdminOTP, sendPasswordReset, verifyOTP, verifyAdminOTP: verifyAdminCode } = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "blockvote_secret_2024";
const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";

// ── ADMIN ROLES ──────────────────────────────────────────────
// Super admin can do everything
// election_manager: create/update elections
// candidate_manager: add/update candidates
// viewer: read only
const ADMIN_PERMISSIONS = {
  super_admin:       ["create_election","update_election","delete_election","add_candidate","delete_candidate","view_all","manage_users","manage_roles"],
  election_manager:  ["create_election","update_election","view_all"],
  candidate_manager: ["add_candidate","update_candidate","delete_candidate","view_all"],
  viewer:            ["view_all"],
};

// ── Admin Login ──────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });

    const u = username.trim(), p = password.trim();
    console.log(`[ADMIN LOGIN] attempt: "${u}"`);

    // Check environment super-admin
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      const token = jwt.sign({ role: "admin", adminRole: "super_admin", username: u, permissions: ADMIN_PERMISSIONS.super_admin }, JWT_SECRET, { expiresIn: "8h" });
      console.log("[ADMIN LOGIN] ✅ super-admin");
      return res.json({ token, admin: { username: u, role: "admin", adminRole: "super_admin", permissions: ADMIN_PERMISSIONS.super_admin } });
    }

    // Check registered admins in DB
    const adminUser = await db.findOne("admins", a => a.username === u || a.email === u);
    if (adminUser) {
      const valid = await bcrypt.compare(p, adminUser.password);
      if (!valid) return res.status(401).json({ message: "Invalid password" });
      const token = jwt.sign({
        role: "admin", adminRole: adminUser.adminRole || "viewer",
        username: adminUser.username, adminId: adminUser._id,
        permissions: ADMIN_PERMISSIONS[adminUser.adminRole] || ADMIN_PERMISSIONS.viewer,
      }, JWT_SECRET, { expiresIn: "8h" });
      return res.json({ token, admin: { username: adminUser.username, adminRole: adminUser.adminRole, permissions: ADMIN_PERMISSIONS[adminUser.adminRole] || [] } });
    }

    console.log(`[ADMIN LOGIN] ❌ not found. Use "${ADMIN_USER}" / "${ADMIN_PASS}"`);
    return res.status(401).json({ message: `Invalid credentials. Default admin: ${ADMIN_USER} / ${ADMIN_PASS}` });
  } catch (err) {
    console.error("[ADMIN LOGIN] error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ── Admin Register (create sub-admins) ──────────────────────
exports.adminRegister = async (req, res) => {
  try {
    const { username, email, password, adminRole } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "Username, email and password required" });

    const validRoles = Object.keys(ADMIN_PERMISSIONS);
    const role = validRoles.includes(adminRole) ? adminRole : "viewer";

    const existing = await db.findOne("admins", a => a.email === email.toLowerCase());
    if (existing) return res.status(409).json({ message: "Admin email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const admin = await db.insert("admins", {
      username: username.trim(),
      email:    email.toLowerCase(),
      password: hash,
      adminRole: role,
      permissions: ADMIN_PERMISSIONS[role],
    });
    res.status(201).json({ message: "Admin created", adminId: admin._id, adminRole: role, permissions: ADMIN_PERMISSIONS[role] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Request admin OTP ────────────────────────────────────────
exports.requestAdminOTP = async (req, res) => {
  try {
    const code = await sendAdminOTP(req.body.action || "Admin Action", req.body.details || "");
    res.json({ message: process.env.EMAIL_USER ? "Code sent to admin email" : `Dev code: ${code}`, devCode: !process.env.EMAIL_USER ? code : undefined });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.verifyAdminOTP = async (req, res) => {
  const result = verifyAdminCode(req.body.code);
  if (!result.valid) return res.status(400).json({ message: result.reason });
  res.json({ valid: true });
};

// ── User Register ────────────────────────────────────────────
exports.userRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) return res.status(400).json({ message: "Invalid email format" });
    if (password.length < 6)  return res.status(400).json({ message: "Password must be at least 6 characters" });

    const normEmail = email.toLowerCase().trim();
    const existing  = await db.findOne("users", u => u.email === normEmail);
    if (existing && existing.verified) return res.status(409).json({ message: "Email already registered. Please sign in." });

    const hash = await bcrypt.hash(password, 10);
    const autoVerify = !process.env.EMAIL_USER;

    let userId;
    if (existing && !existing.verified) {
      const upd = await db.update("users", existing._id, { name: name.trim(), password: hash, phone: phone||"", verified: autoVerify });
      userId = upd._id;
    } else {
      const user = await db.insert("users", {
        name: name.trim(), email: normEmail, password: hash, phone: phone||"",
        isRegistered: false, hasVoted: false, walletAddress: "", verified: autoVerify,
        userRole: "voter",
        assignedElections: [], // which elections this user can vote in
        permissions: ["view_elections","vote"],
      });
      userId = user._id;
    }

    if (!autoVerify) {
      try { await sendUserVerification(email, name); } catch (e) { console.warn("OTP email:", e.message); }
      return res.status(201).json({ message: `Verification code sent to ${email}`, userId, requiresVerification: true });
    }
    const code = await sendUserVerification(email, name);
    return res.status(201).json({ message: "Account created! You can now sign in.", userId, requiresVerification: false, devCode: code });
  } catch (err) {
    console.error("[REGISTER]", err);
    res.status(500).json({ message: "Registration failed: " + err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = verifyOTP(email, code);
    if (!result.valid) return res.status(400).json({ message: result.reason });
    const user = await db.findOne("users", u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(404).json({ message: "Account not found" });
    await db.update("users", user._id, { verified: true });
    res.json({ message: "✅ Email verified! You can now sign in.", verified: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.findOne("users", u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(404).json({ message: "No account found" });
    if (user.verified) return res.json({ message: "Already verified. Please sign in." });
    const code = await sendUserVerification(email, user.name);
    res.json({ message: process.env.EMAIL_USER ? `Code sent to ${email}` : `Dev code: ${code}`, devCode: !process.env.EMAIL_USER ? code : undefined });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── User Login ───────────────────────────────────────────────
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const normEmail = email.toLowerCase().trim();
    console.log(`[LOGIN] ${normEmail}`);

    const user = await db.findOne("users", u => u.email === normEmail);
    if (!user) return res.status(401).json({ message: "No account found. Please sign up first." });

    console.log(`[LOGIN] found user ${user._id} | verified:${user.verified} | hasPwd:${!!user.password}`);

    if (!user.verified && process.env.EMAIL_USER) {
      return res.status(403).json({ message: "Please verify your email first.", needsVerification: true, email });
    }
    if (!user.password) return res.status(500).json({ message: "Account error. Please register again." });

    const valid = await bcrypt.compare(password.trim(), user.password);
    console.log(`[LOGIN] password match: ${valid}`);
    if (!valid) return res.status(401).json({ message: "Incorrect password." });

    const token = jwt.sign({ userId: user._id, role: "user", userRole: user.userRole||"voter", permissions: user.permissions||[] }, JWT_SECRET, { expiresIn: "24h" });
    console.log(`[LOGIN] ✅ success`);
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone||"", isRegistered: user.isRegistered||false, hasVoted: user.hasVoted||false, walletAddress: user.walletAddress||"", userRole: user.userRole||"voter", permissions: user.permissions||[] },
    });
  } catch (err) {
    console.error("[LOGIN]", err);
    res.status(500).json({ message: "Login failed: " + err.message });
  }
};

// ── Forgot Password — Step 1: request reset ─────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body; // userType: "user" | "admin"
    if (!email) return res.status(400).json({ message: "Email required" });

    const normEmail = email.toLowerCase().trim();
    const collection = userType === "admin" ? "admins" : "users";
    const record = await db.findOne(collection, r => r.email === normEmail);

    // Always respond success to prevent email enumeration
    const successMsg = `If an account exists for ${email}, a reset link has been sent.`;

    if (!record) return res.json({ message: successMsg });

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = Date.now() + 30 * 60 * 1000; // 30 min

    await db.update(collection, record._id, { resetToken, resetExpiry });

    try {
      await sendPasswordReset(normEmail, record.name || record.username, resetToken, userType || "user");
    } catch (e) {
      console.warn("Password reset email failed:", e.message);
      // In dev mode, return token directly
      if (!process.env.EMAIL_USER) return res.json({ message: successMsg, devToken: resetToken });
    }

    res.json({ message: successMsg });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Forgot Password — Step 2: reset with token ──────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, userType } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and new password required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const collection = userType === "admin" ? "admins" : "users";
    const record = await db.findOne(collection, r => r.resetToken === token);

    if (!record) return res.status(400).json({ message: "Invalid or expired reset token" });
    if (Date.now() > record.resetExpiry) return res.status(400).json({ message: "Reset token expired. Request a new one." });

    const hash = await bcrypt.hash(password, 10);
    await db.update(collection, record._id, { password: hash, resetToken: null, resetExpiry: null, verified: true });

    res.json({ message: "✅ Password reset successful! You can now sign in." });
  } catch (err) { res.status(500).json({ message: err.message }); }
};