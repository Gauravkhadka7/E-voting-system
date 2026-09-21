const express = require("express");
const router = express.Router();
const electionController = require("../controllers/electionController");
const { requireAdmin, verifyToken, optionalAuth } = require("../middleware/auth");

// Public / user routes
router.get("/", optionalAuth, electionController.getAllElections);
router.get("/history", requireAdmin, electionController.getElectionHistory);
router.get("/active", verifyToken, electionController.getActiveElectionsForUser);
router.get("/stats", requireAdmin, electionController.getDashboardStats);
router.get("/:id", optionalAuth, electionController.getElectionById);
router.get("/:id/results", optionalAuth, electionController.getElectionResults);

// Admin-only routes
router.post("/", requireAdmin, electionController.createElection);
router.put("/:id", requireAdmin, electionController.updateElection);
router.patch("/:id/status", requireAdmin, electionController.updateElectionStatus);
router.delete("/:id", requireAdmin, electionController.deleteElection);
router.post("/:id/assign-voters", requireAdmin, electionController.assignVoters);

module.exports = router;