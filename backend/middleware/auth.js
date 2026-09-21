const jwt = require("jsonwebtoken");
const pool = require("../db");

// ─── VERIFY USER TOKEN ────────────────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Determine if admin or user token
    if (decoded.isAdmin) {
      const [rows] = await pool.execute(
        "SELECT id, name, email, role, is_active FROM admins WHERE id = ?",
        [decoded.id]
      );
      if (!rows.length || !rows[0].is_active) {
        return res.status(401).json({ success: false, message: "Admin not found or inactive" });
      }
      req.user = { ...rows[0], isAdmin: true };
    } else {
      const [rows] = await pool.execute(
        "SELECT id, name, email, user_roles, primary_role, is_verified, is_active, wallet_address FROM users WHERE id = ?",
        [decoded.id]
      );
      if (!rows.length || !rows[0].is_active) {
        return res.status(401).json({ success: false, message: "User not found or inactive" });
      }
      req.user = { ...rows[0], isAdmin: false };
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ─── REQUIRE ADMIN ────────────────────────────────────────────────────────────
const requireAdmin = async (req, res, next) => {
  await verifyToken(req, res, async () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    next();
  });
};

// ─── REQUIRE VERIFIED USER ────────────────────────────────────────────────────
const requireVerified = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user?.isAdmin) return next();
    if (!req.user?.is_verified) {
      return res.status(403).json({
        success: false,
        message: "Account not verified. Please contact admin.",
      });
    }
    next();
  });
};

// ─── OPTIONAL AUTH (for public routes that benefit from user context) ─────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }
    await verifyToken(req, res, next);
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { verifyToken, requireAdmin, requireVerified, optionalAuth };