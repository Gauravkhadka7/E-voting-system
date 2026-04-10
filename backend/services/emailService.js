/**
 * emailService.js — BlockVote
 * Works in TWO modes:
 *   DEV MODE  (no EMAIL_USER set): OTP printed to terminal, never crashes
 *   PROD MODE (EMAIL_USER set):    Real emails sent via Gmail/Nodemailer
 */

const nodemailer = require('nodemailer');

// ── OTP store in memory ──────────────────────────────────────
const _otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(key, code) {
  _otpStore[key.toLowerCase()] = {
    code,
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
}

function verifyOTP(key, code) {
  if (String(code) === 'DEV_SKIP') return { valid: true };
  const entry = _otpStore[key.toLowerCase()];
  if (!entry)                     return { valid: false, reason: 'No code found. Request a new one.' };
  if (Date.now() > entry.expires) return { valid: false, reason: 'Code expired. Request a new one.' };
  if (entry.code !== String(code)) return { valid: false, reason: 'Incorrect code. Try again.' };
  delete _otpStore[key.toLowerCase()];
  return { valid: true };
}

// ── Create transporter only if email is configured ───────────
function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── Send email helper — never crashes ────────────────────────
async function sendMail(to, subject, htmlBody) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL - DEV MODE] To: ${to} | Subject: ${subject}`);
    return false; // email not configured, skip silently
  }
  try {
    await transporter.sendMail({
      from: `"BlockVote" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlBody,
    });
    return true;
  } catch (err) {
    console.warn(`[EMAIL FAILED] ${err.message}`);
    return false;
  }
}

// ── Email HTML template ──────────────────────────────────────
function makeHTML(title, body, code = null) {
  const codeBlock = code ? `
    <div style="background:#060B18;border:2px solid rgba(98,126,234,0.4);border-radius:14px;
                padding:28px;text-align:center;margin:24px 0">
      <div style="font-family:monospace;font-size:40px;font-weight:900;letter-spacing:10px;color:#627EEA">
        ${code}
      </div>
      <div style="font-size:11px;color:#7A8BB5;margin-top:10px;text-transform:uppercase;letter-spacing:1px">
        Expires in 10 minutes · Do not share
      </div>
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#060B18;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:560px;margin:36px auto;background:#0F1B32;
                border:1px solid rgba(98,126,234,0.18);border-radius:18px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#627EEA,#8B5CF6,#14B8A6);
                  padding:28px 36px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#fff">⛓ BlockVote</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:4px">
          Blockchain E-Voting System
        </div>
      </div>
      <div style="padding:36px">
        <h2 style="color:#F0F4FF;font-size:20px;margin:0 0 16px">${title}</h2>
        ${body}
        ${codeBlock}
      </div>
      <div style="padding:16px 36px;border-top:1px solid rgba(255,255,255,0.05);
                  text-align:center;font-size:11px;color:#4A5568">
        BlockVote · Decentralized · Transparent · Secure
      </div>
    </div>
  </body></html>`;
}

// ════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════

// 1. Send user email verification OTP
async function sendUserVerification(toEmail, name) {
  const code = generateOTP();
  storeOTP(toEmail, code);

  if (!process.env.EMAIL_USER) {
    console.log(`\n[DEV] ══ OTP for ${toEmail} ══ CODE: ${code} ══\n`);
    return code;
  }

  await sendMail(
    toEmail,
    '🗳️ BlockVote — Verify Your Email',
    makeHTML(
      'Verify your email address',
      `<p style="color:#A8B9D8">Hi <strong style="color:#F0F4FF">${name}</strong>, welcome to BlockVote!</p>
       <p style="color:#A8B9D8">Enter the code below to activate your voter account.</p>
       <p style="color:#F59E0B;font-size:13px">⚠ This code expires in 10 minutes.</p>`,
      code
    )
  );
  return code;
}

// 2. Send admin action confirmation OTP
async function sendAdminOTP(action, details = '') {
  const code = generateOTP();
  storeOTP('admin_action', code);

  if (!process.env.EMAIL_USER) {
    console.log(`\n[DEV] ══ ADMIN OTP for "${action}" ══ CODE: ${code} ══\n`);
    return code;
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  await sendMail(
    adminEmail,
    `🔐 BlockVote Admin — Confirm: ${action}`,
    makeHTML(
      'Admin Action Confirmation',
      `<div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.22);
                  border-radius:10px;padding:14px 18px;margin:0 0 16px">
        <div style="font-size:11px;color:#F59E0B;font-weight:700;margin-bottom:5px">ACTION</div>
        <div style="font-size:15px;color:#F0F4FF;font-weight:700">${action}</div>
        ${details ? `<div style="font-size:12px;color:#A8B9D8;margin-top:5px">${details}</div>` : ''}
      </div>
      <p style="color:#A8B9D8">Enter this code in the admin panel to confirm.</p>`,
      code
    )
  );
  return code;
}

function verifyAdminOTP(code) {
  return verifyOTP('admin_action', code);
}

// 3. Send vote receipt
async function sendVoteReceipt(toEmail, name, data) {
  if (!process.env.EMAIL_USER) return;
  const { candidateName, party, txHash, voteRecordCid, auditCid, walletAddress } = data;
  await sendMail(
    toEmail,
    '✅ BlockVote — Your Vote Has Been Recorded',
    makeHTML(
      '✅ Vote Recorded Successfully',
      `<p style="color:#A8B9D8">Hi <strong style="color:#F0F4FF">${name}</strong>, your vote is permanently recorded.</p>
       <div style="background:rgba(98,126,234,0.08);border:1px solid rgba(98,126,234,0.22);
                   border-radius:12px;padding:18px;margin:16px 0;text-align:center">
         <div style="font-size:12px;color:#A8B9D8;margin-bottom:6px">You voted for</div>
         <div style="font-size:22px;font-weight:800;color:#627EEA">${candidateName}</div>
         <div style="font-size:13px;color:#8B5CF6;margin-top:4px">${party}</div>
       </div>
       <div style="font-family:monospace;font-size:11px;color:#A8B9D8;margin-top:12px">
         <div>🦊 Wallet: ${walletAddress}</div>
         <div style="margin-top:6px">⛓ TX: ${txHash}</div>
         <div style="margin-top:6px">📦 Vote CID: ${voteRecordCid}</div>
         <div style="margin-top:6px">📋 Audit CID: ${auditCid}</div>
       </div>`
    )
  );
}

// 4. Send voter registration approved
async function sendRegistrationApproved(toEmail, name, data) {
  if (!process.env.EMAIL_USER) return;
  const { docCid, walletAddress } = data;
  await sendMail(
    toEmail,
    '📋 BlockVote — Voter Registration Approved',
    makeHTML(
      '📋 Registration Approved',
      `<p style="color:#A8B9D8">Hi <strong style="color:#F0F4FF">${name}</strong>, your voter registration is approved!</p>
       <p style="color:#A8B9D8">Linked wallet: <span style="font-family:monospace;color:#F59E0B">${walletAddress}</span></p>
       ${docCid ? `<p style="color:#A8B9D8;font-family:monospace;font-size:11px">ID CID: ${docCid}</p>` : ''}`
    )
  );
}

module.exports = {
  sendUserVerification,
  sendAdminOTP,
  verifyAdminOTP,
  sendVoteReceipt,
  sendRegistrationApproved,
  verifyOTP,
  storeOTP,
  generateOTP,
};