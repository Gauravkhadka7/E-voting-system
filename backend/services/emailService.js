/**
 * emailService.js — BlockVote
 * Sends real emails via Nodemailer (Gmail):
 *   • User signup email verification OTP
 *   • Admin action confirmation OTP
 *   • Vote receipt with IPFS CIDs + tx hash
 *   • Voter registration approval
 */

const nodemailer = require('nodemailer');

// ── Transporter ──────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── In-memory OTP store ──────────────────────────────────────
// { "email@x.com": { code: "123456", expires: timestamp } }
const _otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(emailKey, code) {
  _otpStore[emailKey.toLowerCase()] = {
    code,
    expires: Date.now() + 10 * 60 * 1000, // 10 min
  };
}

function verifyOTP(emailKey, code) {
  if (code === 'DEV_SKIP') return { valid: true }; // dev bypass
  const entry = _otpStore[emailKey.toLowerCase()];
  if (!entry)                    return { valid: false, reason: 'No code found for this email. Request a new one.' };
  if (Date.now() > entry.expires) return { valid: false, reason: 'Code expired. Request a new one.' };
  if (entry.code !== String(code)) return { valid: false, reason: 'Incorrect code.' };
  delete _otpStore[emailKey.toLowerCase()];
  return { valid: true };
}

// ── HTML template ────────────────────────────────────────────
function html(title, bodyHtml, codeValue = null) {
  const codeBlock = codeValue ? `
    <div style="background:#060B18;border:2px solid rgba(98,126,234,0.4);border-radius:14px;padding:28px;text-align:center;margin:24px 0">
      <div style="font-family:monospace;font-size:40px;font-weight:900;letter-spacing:10px;color:#627EEA">${codeValue}</div>
      <div style="font-size:11px;color:#7A8BB5;margin-top:10px;text-transform:uppercase;letter-spacing:1px">Expires in 10 minutes · Do not share</div>
    </div>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#060B18;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:560px;margin:36px auto;background:#0F1B32;border:1px solid rgba(98,126,234,0.18);border-radius:18px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#627EEA 0%,#8B5CF6 50%,#14B8A6 100%);padding:28px 36px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-1px">⛓ BlockVote</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:4px;letter-spacing:1px;text-transform:uppercase">Blockchain E-Voting System</div>
      </div>
      <div style="padding:36px">
        <h2 style="color:#F0F4FF;font-size:20px;margin:0 0 16px;font-weight:700">${title}</h2>
        ${bodyHtml}
        ${codeBlock}
      </div>
      <div style="padding:16px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:11px;color:#4A5568">
        BlockVote · Decentralized · Transparent · Secure<br>Automated message — do not reply.
      </div>
    </div>
  </body></html>`;
}

function p(text) {
  return `<p style="color:#A8B9D8;font-size:14px;line-height:1.75;margin:0 0 14px">${text}</p>`;
}

function cidBox(label, value, color = '#14B8A6') {
  return `<div style="background:rgba(20,184,166,0.06);border:1px solid rgba(20,184,166,0.18);border-radius:10px;padding:12px 16px;margin:10px 0">
    <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">${label}</div>
    <div style="font-family:monospace;font-size:12px;color:#A8B9D8;word-break:break-all">${value}</div>
  </div>`;
}

// ── 1. User email verification ───────────────────────────────
async function sendUserVerification(toEmail, name) {
  const code = generateOTP();
  storeOTP(toEmail, code);

  if (!process.env.EMAIL_USER) {
    console.log(`[DEV] Email OTP for ${toEmail}: ${code}`);
    return code;
  }

  await transporter.sendMail({
    from: `"BlockVote" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🗳️ BlockVote — Verify Your Email',
    html: html(
      'Verify your email address',
      p(`Hi <strong style="color:#F0F4FF">${name}</strong>, welcome to BlockVote!`) +
      p('Enter the code below to activate your voter account.') +
      p('<span style="color:#F59E0B">⚠ This code expires in 10 minutes.</span>'),
      code
    ),
  });
  return code;
}

// ── 2. Admin action confirmation OTP ────────────────────────
async function sendAdminOTP(action, details = '') {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  const code = generateOTP();
  storeOTP('admin_action', code);

  if (!process.env.EMAIL_USER || !adminEmail) {
    console.log(`[DEV] Admin OTP for "${action}": ${code}`);
    return code;
  }

  await transporter.sendMail({
    from: `"BlockVote Admin" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `🔐 BlockVote Admin — Confirm: ${action}`,
    html: html(
      'Admin Action Confirmation',
      `<div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 18px;margin:0 0 16px">
        <div style="font-size:11px;color:#F59E0B;font-weight:700;margin-bottom:5px">ACTION REQUESTED</div>
        <div style="font-size:15px;color:#F0F4FF;font-weight:700">${action}</div>
        ${details ? `<div style="font-size:12px;color:#A8B9D8;margin-top:5px">${details}</div>` : ''}
      </div>` +
      p('Enter this code in the admin panel to confirm the action. If you did not request this, ignore it.'),
      code
    ),
  });
  return code;
}

function verifyAdminOTP(code) {
  return verifyOTP('admin_action', code);
}

// ── 3. Vote receipt ──────────────────────────────────────────
async function sendVoteReceipt(toEmail, name, { candidateName, party, txHash, voteRecordCid, auditCid, walletAddress }) {
  if (!process.env.EMAIL_USER) return;

  await transporter.sendMail({
    from: `"BlockVote" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '✅ BlockVote — Your Vote Has Been Recorded',
    html: html(
      '✅ Vote Recorded Successfully',
      p(`Hi <strong style="color:#F0F4FF">${name}</strong>, your vote has been permanently recorded on the Ethereum blockchain.`) +
      `<div style="background:rgba(98,126,234,0.08);border:1px solid rgba(98,126,234,0.22);border-radius:12px;padding:18px 20px;margin:16px 0;text-align:center">
        <div style="font-size:12px;color:#A8B9D8;margin-bottom:6px">You voted for</div>
        <div style="font-size:22px;font-weight:800;color:#627EEA">${candidateName}</div>
        <div style="font-size:13px;color:#8B5CF6;margin-top:4px">${party}</div>
      </div>` +
      cidBox('🦊 MetaMask Wallet', walletAddress, '#F59E0B') +
      cidBox('⛓ Ethereum Transaction', txHash, '#627EEA') +
      cidBox('🔐 Encrypted Vote Record (IPFS)', voteRecordCid) +
      cidBox('📋 Public Audit Log (IPFS)', auditCid, '#10B981') +
      p('Your vote is <strong style="color:#10B981">encrypted with ZK-SNARK proof</strong> — not even the admin can read who you voted for. Your IPFS CIDs are your verifiable proof of participation.') +
      p(`Verify anytime: <a href="https://ipfs.io/ipfs/${auditCid}" style="color:#627EEA">View Audit Log on IPFS ↗</a>`)
    ),
  });
}

// ── 4. Voter registration approved ──────────────────────────
async function sendRegistrationApproved(toEmail, name, { docCid, walletAddress }) {
  if (!process.env.EMAIL_USER) return;

  await transporter.sendMail({
    from: `"BlockVote" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '📋 BlockVote — Voter Registration Approved',
    html: html(
      '📋 Registration Approved — You Can Now Vote',
      p(`Hi <strong style="color:#F0F4FF">${name}</strong>, your voter registration has been approved!`) +
      p('You can now cast your vote in any active election. Connect your MetaMask wallet and navigate to the voting page.') +
      cidBox('🦊 Linked MetaMask Wallet', walletAddress, '#F59E0B') +
      (docCid ? cidBox('📄 ID Document (IPFS)', docCid) : '') +
      p('<a href="http://localhost:3000/user/vote" style="color:#627EEA">Click here to cast your vote ↗</a>')
    ),
  });
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