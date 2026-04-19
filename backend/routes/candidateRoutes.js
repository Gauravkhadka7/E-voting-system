"use strict";
const express = require("express");
const router  = express.Router();
const db      = require("../services/ipfsDB");
const { adminOnly, protect, optionalAuth, requirePermission } = require("../middleware/auth");
const upload  = require("../middleware/upload");
const { verifyAdminOTP } = require("../services/emailService");

// ── GET candidates — FILTERED by user permissions ────────────
// Users only see candidates they are assigned to
router.get("/", optionalAuth, async (req, res) => {
  try {
    const all = await db.find("candidates");
    const user = req.user;

    // Admin sees everything
    if (user?.role === "admin") {
      const enriched = await Promise.all(all.map(async c => {
        try { const el = await db.findById("elections", c.election); return { ...c, electionTitle: el?.title || "—" }; }
        catch { return c; }
      }));
      return res.json(enriched.sort((a,b) => new Date(b._created)-new Date(a._created)));
    }

    // Regular user — filter by assignedElections
    if (user?.userId) {
      const userRecord = await db.findById("users", user.userId);
      const assigned   = userRecord?.assignedElections || [];

      // If assignedElections is empty array, user sees ALL candidates (default)
      // If assignedElections has values, user only sees those elections' candidates
      const filtered = assigned.length > 0
        ? all.filter(c => assigned.includes(c.election))
        : all;

      return res.json(filtered);
    }

    // Public — return all
    res.json(all);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET public candidates (for home page before login)
router.get("/public", async (req, res) => {
  try {
    const all = await db.find("candidates");
    res.json(all.sort((a,b) => (b.voteCount||0)-(a.voteCount||0)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET candidates by election — also filtered
router.get("/election/:electionId", optionalAuth, async (req, res) => {
  try {
    const { electionId } = req.params;
    const all = await db.find("candidates", c => c.election === electionId);

    if (req.user?.role === "admin") return res.json(all);

    if (req.user?.userId) {
      const userRecord = await db.findById("users", req.user.userId);
      const assigned   = userRecord?.assignedElections || [];
      if (assigned.length > 0 && !assigned.includes(electionId)) {
        return res.status(403).json({ message: "You are not assigned to this election." });
      }
    }
    res.json(all);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create candidate (admin + OTP)
router.post("/", adminOnly, requirePermission("add_candidate"), upload.single("image"), async (req, res) => {
  try {
    const { name, party, age, qualification, bio, electionId, adminOTP } = req.body;
    if (!name || !party || !electionId) return res.status(400).json({ message: "Name, party and election required" });

    if (adminOTP) {
      const r = verifyAdminOTP(adminOTP);
      if (!r.valid) return res.status(400).json({ message: r.reason });
    }

    let imageUrl="", imageCid="", ipfsImageUrl="";
    if (req.file) {
      imageUrl = `/uploads/candidates/${req.file.filename}`;
      try { imageCid = await db.pinFile(req.file.path, req.file.originalname); ipfsImageUrl = db.ipfsUrl(imageCid); } catch {}
    }

    const candidate = await db.insert("candidates", {
      name, party, age: age||null, qualification: qualification||"",
      bio: bio||"", election: electionId,
      imageUrl, imageCid, ipfsImageUrl, voteCount: 0,
    });
    res.status(201).json(candidate);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update candidate
router.put("/:id", adminOnly, requirePermission("update_candidate"), upload.single("image"), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.adminOTP;
    if (req.file) {
      updates.imageUrl = `/uploads/candidates/${req.file.filename}`;
      try { updates.imageCid = await db.pinFile(req.file.path, req.file.originalname); updates.ipfsImageUrl = db.ipfsUrl(updates.imageCid); } catch {}
    }
    const updated = await db.update("candidates", req.params.id, updates);
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE candidate
router.delete("/:id", adminOnly, requirePermission("delete_candidate"), async (req, res) => {
  try {
    await db.remove("candidates", req.params.id);
    res.json({ message: "Candidate removed" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST assign elections to user (admin only — candidate visibility control)
router.post("/assign-user", adminOnly, requirePermission("manage_users"), async (req, res) => {
  try {
    const { userId, assignedElections } = req.body;
    if (!userId || !Array.isArray(assignedElections)) return res.status(400).json({ message: "userId and assignedElections[] required" });
    const updated = await db.update("users", userId, { assignedElections });
    res.json({ message: "User election assignment updated", userId, assignedElections, cid: updated._cid });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;