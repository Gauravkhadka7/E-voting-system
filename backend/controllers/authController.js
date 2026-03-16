const jwt   = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db    = require('../services/ipfsDB');
const { sendUserVerification, sendAdminOTP, verifyOTP, verifyAdminOTP: verifyAdminCode } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'blockvote_secret_2024';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

// ── Admin Login ──────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username !== ADMIN_USER || password !== ADMIN_PASS)
      return res.status(401).json({ message: 'Invalid admin credentials' });
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, admin: { username, role: 'admin' } });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Request admin OTP (before sensitive actions) ─────────────
exports.requestAdminOTP = async (req, res) => {
  try {
    const { action, details } = req.body;
    const code = await sendAdminOTP(action || 'Admin Action', details || '');
    const emailConfigured = !!process.env.EMAIL_USER;
    res.json({
      message: emailConfigured
        ? 'Confirmation code sent to admin email'
        : `Dev mode — use code: ${code}`,
      devMode: !emailConfigured,
      devCode: !emailConfigured ? code : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP: ' + err.message });
  }
};

// ── Verify admin OTP ─────────────────────────────────────────
exports.verifyAdminOTP = async (req, res) => {
  const { code } = req.body;
  const result = verifyAdminCode(code);
  if (!result.valid) return res.status(400).json({ message: result.reason });
  res.json({ valid: true });
};

// ── User Register — send email OTP ──────────────────────────
exports.userRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    const existing = await db.findOne('users', u => u.email === email.toLowerCase());
    if (existing && existing.verified)
      return res.status(409).json({ message: 'Email already registered. Please sign in.' });

    const hash = await bcrypt.hash(password, 12);
    let userId;

    if (existing && !existing.verified) {
      // Update existing unverified record
      await db.update('users', existing._id, { name, password: hash, phone: phone || '' });
      userId = existing._id;
    } else {
      const user = await db.insert('users', {
        name, email: email.toLowerCase(), password: hash, phone: phone || '',
        isRegistered: false, hasVoted: false, walletAddress: '', verified: false,
      });
      userId = user._id;
    }

    // Send verification email
    let emailSent = false;
    let devCode;
    try {
      const code = await sendUserVerification(email, name);
      emailSent = !!process.env.EMAIL_USER;
      if (!emailSent) devCode = code;
    } catch (e) {
      console.warn('Email send error:', e.message);
    }

    res.status(201).json({
      message: emailSent
        ? `Verification code sent to ${email}`
        : `Account created. Dev mode — verification code: ${devCode}`,
      userId,
      emailSent,
      devCode: !emailSent ? devCode : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed.' });
  }
};

// ── Verify email OTP ─────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = verifyOTP(email, code);
    if (!result.valid) return res.status(400).json({ message: result.reason });

    const user = await db.findOne('users', u => u.email === email.toLowerCase());
    if (!user) return res.status(404).json({ message: 'Account not found' });
    await db.update('users', user._id, { verified: true });
    res.json({ message: '✅ Email verified! You can now sign in.', verified: true });
  } catch { res.status(500).json({ message: 'Verification failed' }); }
};

// ── Resend OTP ───────────────────────────────────────────────
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.findOne('users', u => u.email === email.toLowerCase());
    if (!user) return res.status(404).json({ message: 'No account found' });
    if (user.verified) return res.json({ message: 'Email already verified' });
    const code = await sendUserVerification(email, user.name);
    res.json({
      message: process.env.EMAIL_USER ? `New code sent to ${email}` : `Dev code: ${code}`,
      devCode: !process.env.EMAIL_USER ? code : undefined,
    });
  } catch { res.status(500).json({ message: 'Resend failed' }); }
};

// ── User Login ───────────────────────────────────────────────
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });
    const user = await db.findOne('users', u => u.email === email.toLowerCase());
    if (!user)  return res.status(401).json({ message: 'No account found with this email' });
    if (!user.verified)
      return res.status(403).json({ message: 'Please verify your email first.', needsVerification: true, email });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid password' });
    const token = jwt.sign({ userId: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, isRegistered: user.isRegistered, hasVoted: user.hasVoted, walletAddress: user.walletAddress },
    });
  } catch { res.status(500).json({ message: 'Login failed' }); }
};