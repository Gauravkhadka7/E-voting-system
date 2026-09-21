// middleware/roleMiddleware.js
"use strict";

/**
 * Allow only users whose role is in the provided list.
 * Must be used AFTER protect().
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
}

/** Shorthand: admin or superadmin */
const adminOnly = requireRole("admin", "superadmin");

/** Shorthand: superadmin only */
const superAdminOnly = requireRole("superadmin");

/** Shorthand: voter only */
const voterOnly = requireRole("voter");

/**
 * Ensure the authenticated user owns the resource OR is an admin/superadmin.
 * The ownerIdFn receives req and should return the owner's user ID.
 *
 * Example:
 *   router.delete("/:id", protect, ownerOrAdmin(req => req.params.ownerId), handler);
 */
function ownerOrAdmin(ownerIdFn) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }
    const ownerId = ownerIdFn(req);
    if (
      req.user.id === ownerId ||
      req.user.role === "admin" ||
      req.user.role === "superadmin"
    ) {
      return next();
    }
    return res.status(403).json({ success: false, message: "Forbidden." });
  };
}

module.exports = { requireRole, adminOnly, superAdminOnly, voterOnly, ownerOrAdmin };