const express = require("express");
const router = express.Router();
const voteController = require("../controllers/voteController");
const { verifyToken, requireAdmin, requireVerified } = require("../middleware/auth");

// User voting
router.post("/cast", requireVerified, voteController.castVote);
router.get("/status/:election_id", verifyToken, voteController.hasUserVoted);
router.get("/history", verifyToken, voteController.getUserVoteHistory);

// Public verification
router.get("/verify/:vote_hash", voteController.verifyVote);

// Admin
router.get("/stats/:election_id", requireAdmin, voteController.getElectionVoteStats);

module.exports = router;