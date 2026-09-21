const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { verifyToken, requireAdmin, optionalAuth } = require("../middleware/auth");

router.post("/", optionalAuth, feedbackController.submitFeedback);
router.get("/mine", verifyToken, feedbackController.getMyFeedback);
router.get("/", requireAdmin, feedbackController.getAllFeedback);
router.patch("/:id/status", requireAdmin, feedbackController.updateFeedbackStatus);

module.exports = router;