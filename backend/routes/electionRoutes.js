"use strict";
const express = require("express");
const router  = express.Router();
const db      = require("../services/ipfsDB");
const { adminOnly, protect, optionalAuth, requirePermission } = require("../middleware/auth");

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const computeStatus = (s,e) => {
  const now = new Date();
  if (!s||!e) return "draft";
  if (now < new Date(s)) return "upcoming";
  if (now > new Date(e)) return "completed";
  return "active";
};

const sanitizeElection = (e) => ({
  _id:        e._id,
  title:      e.title,
  startDate:  e.startDate,
  endDate:    e.endDate,
  totalVotes: e.totalVotes || 0,
  status:     computeStatus(e.startDate, e.endDate),
  type:       e.type || "single-choice",
});


// ────────────────────────────────────────────────────────────
// GET /api/elections — filtered by user assignment
// ────────────────────────────────────────────────────────────
router.get("/", optionalAuth, async (req, res) => {
  try {
    const all = await db.find("elections");
    let filtered = all;

    if (req.user?.role === "user" && req.user?.userId) {
      const userRecord = await db.findById("users", req.user.userId);
      const assigned   = userRecord?.assignedElections || [];

      if (assigned.length > 0) {
        filtered = all.filter(e => assigned.includes(e._id));
      }
    }

    res.json(
      filtered
        .map(sanitizeElection)
        .sort((a,b)=>new Date(b.startDate||0)-new Date(a.startDate||0))
    );
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// GET active elections
// ────────────────────────────────────────────────────────────
router.get("/active", optionalAuth, async (req, res) => {
  try {
    const all = await db.find("elections");
    let filtered = all;

    if (req.user?.role === "user" && req.user?.userId) {
      const userRecord = await db.findById("users", req.user.userId);
      const assigned   = userRecord?.assignedElections || [];
      if (assigned.length > 0) {
        filtered = all.filter(e => assigned.includes(e._id));
      }
    }

    res.json(
      filtered
        .filter(e => computeStatus(e.startDate,e.endDate) === "active")
        .map(sanitizeElection)
    );
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// ADMIN: get all elections
// ────────────────────────────────────────────────────────────
router.get("/all-public", adminOnly, async (req, res) => {
  try {
    const all = await db.find("elections");
    res.json(
      all
        .map(sanitizeElection)
        .sort((a,b)=>new Date(b.startDate||0)-new Date(a.startDate||0))
    );
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// GET election by ID
// ────────────────────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const el = await db.findById("elections", req.params.id);
    if (!el) return res.status(404).json({ message: "Election not found" });

    if (req.user?.role === "user") {
      const userRecord = await db.findById("users", req.user.userId);
      const assigned   = userRecord?.assignedElections || [];

      if (assigned.length > 0 && !assigned.includes(req.params.id)) {
        return res.status(403).json({
          message: "Access denied. You are not assigned to this election."
        });
      }
    }

    res.json(sanitizeElection(el));
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// CREATE election
// ────────────────────────────────────────────────────────────
router.post("/", adminOnly, requirePermission("create_election"), async (req, res) => {
  try {
    const { title, startDate, endDate, type } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: "Title, start and end date required" });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const el = await db.insert("elections", {
      title,
      startDate,
      endDate,
      type: type || "single-choice",
      totalVotes: 0,
      assignedUsers: []
    });

    res.status(201).json(sanitizeElection(el));
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// UPDATE election
// ────────────────────────────────────────────────────────────
router.put("/:id", adminOnly, requirePermission("update_election"), async (req, res) => {
  try {
    const el = await db.findById("elections", req.params.id);
    if (!el) return res.status(404).json({ message: "Election not found" });

    const updated = await db.update("elections", req.params.id, { ...req.body });

    res.json(sanitizeElection(updated));
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// DELETE election
// ────────────────────────────────────────────────────────────
router.delete("/:id", adminOnly, requirePermission("delete_election"), async (req, res) => {
  try {
    await db.remove("elections", req.params.id);
    res.json({ message: "Election removed" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// ASSIGN USERS
// ────────────────────────────────────────────────────────────
router.post("/:id/assign-users", adminOnly, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: "userIds[] required" });
    }

    const el = await db.findById("elections", req.params.id);
    if (!el) return res.status(404).json({ message: "Election not found" });

    await db.update("elections", req.params.id, { assignedUsers: userIds });

    for (const uid of userIds) {
      const user = await db.findById("users", uid);
      if (user) {
        const current = user.assignedElections || [];
        if (!current.includes(req.params.id)) {
          await db.update("users", uid, {
            assignedElections: [...current, req.params.id]
          });
        }
      }
    }

    res.json({ message: "Users assigned", electionId: req.params.id });

  } catch (err) { res.status(500).json({ message: err.message }); }
});


// ────────────────────────────────────────────────────────────
// 🔥 NEW: GET candidates for election
// ────────────────────────────────────────────────────────────
router.get("/:id/candidates", protect, async (req, res) => {
  try {
    const election = await db.findById("elections", req.params.id);
    if (!election) return res.status(404).json({ message: "Election not found" });

    if (req.user.role === "user") {
      const user = await db.findById("users", req.user.userId);
      const assigned = user?.assignedElections || [];

      if (assigned.length > 0 && !assigned.includes(req.params.id)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const candidates = await db.find("candidates");

    const filtered = candidates.filter(
      c => c.electionId === req.params.id
    );

    res.json(filtered);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ────────────────────────────────────────────────────────────
// 🔥 NEW: USER DASHBOARD DATA
// ────────────────────────────────────────────────────────────
router.get("/my/assigned", protect, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only users allowed" });
    }

    const user = await db.findById("users", req.user.userId);
    const assigned = user?.assignedElections || [];

    if (assigned.length === 0) {
      return res.json({ election: null, candidates: [] });
    }

    const elections = await db.find("elections");

    const activeElection = elections.find(
      e =>
        assigned.includes(e._id) &&
        computeStatus(e.startDate, e.endDate) === "active"
    );

    if (!activeElection) {
      return res.json({ election: null, candidates: [] });
    }

    const candidates = await db.find("candidates");

    const filteredCandidates = candidates.filter(
      c => c.electionId === activeElection._id
    );

    res.json({
      election: sanitizeElection(activeElection),
      candidates: filteredCandidates
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;