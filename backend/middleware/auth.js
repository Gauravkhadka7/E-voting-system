"use strict";
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "blockvote_secret_2024";

// ── Basic user auth ──────────────────────────────────────────
exports.protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ message: "Please sign in to continue." });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    return res.status(401).json({ message: "Invalid session. Please sign in again." });
  }
};

// ── Optional auth — never blocks, attaches user if present ───
exports.optionalAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); } catch { /* ignore */ }
  }
  next();
};

// ── Admin only ───────────────────────────────────────────────
exports.adminOnly = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ message: "Admin token required." });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "Admin access only." });
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Admin session expired. Please log in again." });
    return res.status(401).json({ message: "Invalid admin token." });
  }
};

// ── Permission-based middleware ──────────────────────────────
// Usage: router.post("/", adminOnly, requirePermission("create_election"), handler)
exports.requirePermission = (permission) => (req, res, next) => {
  const perms = req.user?.permissions || [];
  if (perms.includes(permission) || perms.includes("super_admin")) return next();
  return res.status(403).json({
    message: `Permission denied. Required: ${permission}`,
    yourPermissions: perms,
  });
};

// ── Super admin only ─────────────────────────────────────────
exports.superAdminOnly = (req, res, next) => {
  if (req.user?.adminRole !== "super_admin")
    return res.status(403).json({ message: "Super admin access only." });
  next();
};