const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"E-Voting System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log("✅ Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ Email error:", err.message);
    return { success: false, error: err.message };
  }
}

// Email templates
const templates = {
  welcome: (name) => ({
    subject: "Welcome to E-Voting System",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4f46e5">Welcome, ${name}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Please wait for admin verification before you can vote.</p>
      </div>
    `,
  }),

  verified: (name) => ({
    subject: "Account Verified — You Can Now Vote",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#10b981">Account Verified!</h2>
        <p>Hello ${name}, your account has been verified by the admin.</p>
        <p>You can now participate in eligible elections.</p>
      </div>
    `,
  }),

  passwordReset: (name, resetUrl) => ({
    subject: "Password Reset Request",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>Password Reset</h2>
        <p>Hello ${name},</p>
        <p>You requested a password reset. Click the button below:</p>
        <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  }),

  voteConfirmation: (name, electionName, voteHash) => ({
    subject: `Vote Confirmed — ${electionName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#10b981">Vote Recorded!</h2>
        <p>Hello ${name},</p>
        <p>Your vote in <strong>${electionName}</strong> has been recorded on the blockchain.</p>
        <p><strong>Vote Hash:</strong> <code>${voteHash}</code></p>
        <p>Use this hash to verify your vote on the blockchain.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, templates };