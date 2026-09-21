const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

router.get("/reports", requireAdmin, adminController.getReports);
router.get("/audit-logs", requireAdmin, adminController.getAuditLogs);
router.get("/admins", requireAdmin, adminController.getAllAdmins);
router.patch("/admins/:id/status", requireAdmin, adminController.updateAdminStatus);
router.post("/notify", requireAdmin, adminController.broadcastNotification);

module.exports = router;