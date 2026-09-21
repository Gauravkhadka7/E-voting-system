const express = require("express");
const router = express.Router();

const voterController = require("../controllers/voterController");
const { requireAdmin, verifyToken } = require("../middleware/auth");
const { voterDocUpload } = require("../middleware/upload");

// Debug
console.log("voterController:", voterController);

// Admin routes
router.get("/", requireAdmin, voterController.getAllUsers);
router.get("/update-requests", requireAdmin, voterController.getUpdateRequests);
router.get("/eligible/:election_id", requireAdmin, voterController.getEligibleVotersForElection);

router.patch("/update-requests/:id/review", requireAdmin, voterController.reviewUpdateRequest);
router.patch("/:id/verify", requireAdmin, voterController.verifyUser);
router.delete("/:id", requireAdmin, voterController.deleteUser);
router.get("/:id", requireAdmin, voterController.getUserById);
router.put("/:id", requireAdmin, voterDocUpload.single("photo"), voterController.updateUserProfile);

// User routes
router.put("/profile/me", verifyToken, voterDocUpload.single("photo"), voterController.updateUserProfile);
router.post("/profile/update-request", verifyToken, voterController.submitUpdateRequest);
router.get("/notifications/mine", verifyToken, voterController.getNotifications);
router.patch("/notifications/:id/read", verifyToken, voterController.markNotificationRead);

module.exports = router;