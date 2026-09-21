const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
const { requireAdmin, optionalAuth } = require("../middleware/auth");
const { candidateUpload } = require("../middleware/upload");

// Public
router.get("/election/:election_id", optionalAuth, candidateController.getCandidatesByElection);
router.get("/:id", optionalAuth, candidateController.getCandidateById);

// Admin only
router.post("/", requireAdmin, candidateUpload.single("photo"), candidateController.addCandidate);
router.put("/:id", requireAdmin, candidateUpload.single("photo"), candidateController.updateCandidate);
router.delete("/:id", requireAdmin, candidateController.deleteCandidate);

module.exports = router;