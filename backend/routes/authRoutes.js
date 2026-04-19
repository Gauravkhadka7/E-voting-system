"use strict";
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/authController");
const { adminOnly, requirePermission } = require("../middleware/auth");

// ── Admin ────────────────────────────────────────────────────
router.post("/admin/login",          ctrl.adminLogin);
router.post("/admin/register",       ctrl.adminRegister);  // create sub-admins
router.post("/admin/request-otp",    ctrl.requestAdminOTP);
router.post("/admin/verify-otp",     ctrl.verifyAdminOTP);

// ── User ─────────────────────────────────────────────────────
router.post("/user/register",        ctrl.userRegister);
router.post("/user/verify-email",    ctrl.verifyEmail);
router.post("/user/resend-otp",      ctrl.resendOTP);
router.post("/user/login",           ctrl.userLogin);

// ── Forgot / Reset password ──────────────────────────────────
router.post("/forgot-password",      ctrl.forgotPassword);
router.post("/reset-password",       ctrl.resetPassword);

module.exports = router;