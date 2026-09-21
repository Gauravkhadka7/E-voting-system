const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

// User auth
router.post("/user/register", authController.userRegister);
router.post("/user/login", authController.userLogin);

// Admin auth
router.post("/admin/register", authController.adminRegister);
router.post("/admin/login", authController.adminLogin);

// Common
router.get("/me", verifyToken, authController.getMe);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.put("/wallet", verifyToken, authController.updateWallet);
router.put("/change-password", verifyToken, authController.changePassword);

module.exports = router;