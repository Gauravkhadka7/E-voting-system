const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db     = require('../services/ipfsDB');
const { sendUserVerification, sendAdminOTP, verifyOTP, verifyAdminOTP: verifyAdminCode } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'blockvote_secret_2024';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

// ── Admin Login ──────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const trimUser = username.trim();
    const trimPass = password.trim();

    console.log(`[ADMIN LOGIN] Attempt: "${trimUser}"`);
    console.log(`[ADMIN LOGIN] Expected: "${ADMIN_USER}" / "${ADMIN_PASS}"`);

    if (trimUser !== ADMIN_USER || trimPass !== ADMIN_PASS) {
      console.log(`[ADMIN LOGIN] ❌ Mismatch`);
      return res.status(401).json({
        message: `Invalid credentials. Admin username: ${ADMIN_USER}, password: ${ADMIN_PASS}`,
      });
    }

    const token = jwt.sign({ role: 'admin', username: trimUser }, JWT_SECRET, { expiresIn: '8h' });
    console.log(`[ADMIN LOGIN] ✅ Success`);
    res.json({ token, admin: { username: trimUser, role: 'admin' } });
  } catch (err) {
    console.error('[ADMIN LOGIN] error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ── Request admin OTP ────────────────────────────────────────
exports.requestAdminOTP = async (req, res) => {
  try {
    const code = await sendAdminOTP(req.body.action || 'Admin Action', req.body.details || '');
    res.json({
      message: process.env.EMAIL_USER ? 'Code sent to admin email' : `Dev mode code: ${code}`,
      devCode: !process.env.EMAIL_USER ? code : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP: ' + err.message });
  }
};

// ── Verify admin OTP ─────────────────────────────────────────
exports.verifyAdminOTP = async (req, res) => {
  const result = verifyAdminCode(req.body.code);
  if (!result.valid) return res.status(400).json({ message: result.reason });
  res.json({ valid: true });
};

// ── User Register ────────────────────────────────────────────
exports.userRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    console.log(`[REGISTER] name="${name}" email="${email}"`);

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: 'Please enter a valid email address' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await db.findOne('users', u => u.email === normalizedEmail);
    if (existing && existing.verified) {
      return res.status(409).json({ message: 'Email already registered. Please sign in.' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);
    console.log(`[REGISTER] Hashed password generated`);

    // Dev mode = auto-verify (no email configured)
    const autoVerify = !process.env.EMAIL_USER;

    let userId;
    if (existing && !existing.verified) {
      // Update existing unverified account
      const updated = await db.update('users', existing._id, {
        name: name.trim(),
        password: hash,
        phone: phone || '',
        verified: autoVerify,
      });
      userId = updated._id;
      console.log(`[REGISTER] Updated existing unverified user: ${userId}`);
    } else {
      // Create new user
      const user = await db.insert('users', {
        name:         name.trim(),
        email:        normalizedEmail,
        password:     hash,
        phone:        phone || '',
        isRegistered: false,
        hasVoted:     false,
        walletAddress:'',
        verified:     autoVerify,
      });
      userId = user._id;
      console.log(`[REGISTER] ✅ New user created: ${userId} | verified: ${autoVerify}`);
    }

    if (!autoVerify) {
      try { await sendUserVerification(email, name); } catch (e) { console.warn('OTP email failed:', e.message); }
      return res.status(201).json({
        message: `Verification code sent to ${email}. Check your inbox.`,
        userId, emailSent: true, requiresVerification: true,
      });
    } else {
      const code = await sendUserVerification(email, name);
      return res.status(201).json({
        message: 'Account created! You can now sign in.',
        userId, emailSent: false, requiresVerification: false,
        devCode: code,
      });
    }
  } catch (err) {
    console.error('[REGISTER] error:', err);
    res.status(500).json({ message: 'Registration failed: ' + err.message });
  }
};

// ── Verify email OTP ─────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = verifyOTP(email, code);
    if (!result.valid) return res.status(400).json({ message: result.reason });
    const user = await db.findOne('users', u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(404).json({ message: 'Account not found' });
    await db.update('users', user._id, { verified: true });
    res.json({ message: '✅ Email verified! You can now sign in.', verified: true });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed: ' + err.message });
  }
};

// ── Resend OTP ───────────────────────────────────────────────
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.findOne('users', u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(404).json({ message: 'No account found with this email' });
    if (user.verified) return res.json({ message: 'Email already verified. You can sign in.' });
    const code = await sendUserVerification(email, user.name);
    res.json({
      message: process.env.EMAIL_USER ? `New code sent to ${email}` : `Dev code: ${code}`,
      devCode: !process.env.EMAIL_USER ? code : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: 'Resend failed: ' + err.message });
  }
};

// ── User Login ───────────────────────────────────────────────
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[LOGIN] Attempt: ${normalizedEmail}`);

    // Find user — FULL record from local file (not preview)
    const user = await db.findOne('users', u => u.email === normalizedEmail);

    if (!user) {
      console.log(`[LOGIN] ❌ No user found for ${normalizedEmail}`);
      return res.status(401).json({ message: 'No account found with this email. Please sign up first.' });
    }

    console.log(`[LOGIN] Found user: ${user._id} | verified: ${user.verified} | hasPassword: ${!!user.password}`);

    // Email verification check (skip in dev mode)
    if (!user.verified && process.env.EMAIL_USER) {
      return res.status(403).json({
        message: 'Please verify your email. Check your inbox for the OTP code.',
        needsVerification: true,
        email,
      });
    }

    // Password check
    if (!user.password) {
      console.error(`[LOGIN] ❌ User ${user._id} has no password stored!`);
      return res.status(500).json({ message: 'Account error. Please register again.' });
    }

    const valid = await bcrypt.compare(password.trim(), user.password);
    console.log(`[LOGIN] Password match: ${valid}`);

    if (!valid) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign({ userId: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    console.log(`[LOGIN] ✅ Success for ${normalizedEmail}`);

    res.json({
      token,
      user: {
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        phone:        user.phone || '',
        isRegistered: user.isRegistered || false,
        hasVoted:     user.hasVoted     || false,
        walletAddress:user.walletAddress|| '',
      },
    });
  } catch (err) {
    console.error('[LOGIN] error:', err);
    res.status(500).json({ message: 'Login failed: ' + err.message });
  }
};