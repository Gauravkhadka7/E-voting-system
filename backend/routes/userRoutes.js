"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");
const { adminOnly, superAdminOnly } = require("../middleware/roleMiddleware");

// ── public auth ──────────────────────────────────────────────────────────────

// Support both naming styles safely
const registerHandler = ctrl.register || ctrl.registerUser;

router.post("/register",        registerHandler);
router.post("/verify-email",    ctrl.verifyEmail);
router.post("/resend-otp",      ctrl.resendOtp);
router.post("/login",           ctrl.login);
router.post("/refresh-token",   ctrl.refreshToken);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password",  ctrl.resetPassword);

// ── authenticated user ───────────────────────────────────────────────────────

router.get ("/me",     protect, ctrl.getProfile);
router.put ("/me",     protect, ctrl.updateProfile);
router.post("/logout", protect, ctrl.logout);

// ── admin: user management ───────────────────────────────────────────────────

router.get   ("/",      protect, adminOnly,      ctrl.listUsers);
router.get   ("/:id",   protect, adminOnly,      ctrl.getUserById);
router.post  ("/admin", protect, superAdminOnly, ctrl.createAdminUser);
router.delete("/:id",   protect, superAdminOnly, ctrl.deleteUser);

module.exports = router;