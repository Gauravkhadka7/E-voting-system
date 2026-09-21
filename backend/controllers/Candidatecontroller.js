const { v4: uuidv4 } = require("uuid");
const pool = require("../db");

// ─── ADD CANDIDATE ────────────────────────────────────────────────────────────
exports.addCandidate = async (req, res) => {
  try {
    const {
      election_id, position_name, name, bio, manifesto, party, symbol,
      user_id, is_write_in = false,
    } = req.body;

    if (!election_id || !position_name || !name) {
      return res.status(400).json({ success: false, message: "election_id, position_name, and name are required" });
    }

    // Validate election exists
    const [electionRows] = await pool.execute("SELECT id FROM elections WHERE id = ?", [election_id]);
    if (!electionRows.length) return res.status(404).json({ success: false, message: "Election not found" });

    const id = uuidv4();
    const photo_url = req.file ? `/uploads/candidates/${req.file.filename}` : null;

    await pool.execute(
      `INSERT INTO candidates (id, election_id, position_name, user_id, name, bio, photo_url, manifesto, party, symbol, is_write_in)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, election_id, position_name, user_id || null, name, bio || null, photo_url, manifesto || null, party || null, symbol || null, is_write_in]
    );

    const [rows] = await pool.execute("SELECT * FROM candidates WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "Candidate added", candidate: rows[0] });
  } catch (err) {
    console.error("addCandidate error:", err);
    res.status(500).json({ success: false, message: "Failed to add candidate" });
  }
};

// ─── GET CANDIDATES BY ELECTION ───────────────────────────────────────────────
exports.getCandidatesByElection = async (req, res) => {
  try {
    const { election_id } = req.params;
    const { position_name } = req.query;

    let query = "SELECT * FROM candidates WHERE election_id = ?";
    const params = [election_id];

    if (position_name) {
      query += " AND position_name = ?";
      params.push(position_name);
    }

    query += " ORDER BY position_name, name";
    const [rows] = await pool.execute(query, params);

    // Group by position
    const grouped = {};
    for (const c of rows) {
      if (!grouped[c.position_name]) grouped[c.position_name] = [];
      grouped[c.position_name].push(c);
    }

    res.json({ success: true, candidates: rows, grouped_by_position: grouped });
  } catch (err) {
    console.error("getCandidatesByElection error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch candidates" });
  }
};

// ─── GET CANDIDATE BY ID ──────────────────────────────────────────────────────
exports.getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT c.*, e.name as election_name, e.status as election_status
       FROM candidates c JOIN elections e ON c.election_id = e.id
       WHERE c.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Candidate not found" });
    res.json({ success: true, candidate: rows[0] });
  } catch (err) {
    console.error("getCandidateById error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch candidate" });
  }
};

// ─── UPDATE CANDIDATE ─────────────────────────────────────────────────────────
exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio, manifesto, party, symbol, is_approved } = req.body;

    const [existing] = await pool.execute("SELECT id FROM candidates WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: "Candidate not found" });

    const photo_url = req.file ? `/uploads/candidates/${req.file.filename}` : undefined;

    const updates = [];
    const values = [];

    if (name) { updates.push("name = ?"); values.push(name); }
    if (bio !== undefined) { updates.push("bio = ?"); values.push(bio); }
    if (manifesto !== undefined) { updates.push("manifesto = ?"); values.push(manifesto); }
    if (party !== undefined) { updates.push("party = ?"); values.push(party); }
    if (symbol !== undefined) { updates.push("symbol = ?"); values.push(symbol); }
    if (photo_url) { updates.push("photo_url = ?"); values.push(photo_url); }
    if (is_approved !== undefined) { updates.push("is_approved = ?"); values.push(is_approved); }

    if (!updates.length) return res.status(400).json({ success: false, message: "No fields to update" });

    values.push(id);
    await pool.execute(`UPDATE candidates SET ${updates.join(", ")} WHERE id = ?`, values);

    const [rows] = await pool.execute("SELECT * FROM candidates WHERE id = ?", [id]);
    res.json({ success: true, message: "Candidate updated", candidate: rows[0] });
  } catch (err) {
    console.error("updateCandidate error:", err);
    res.status(500).json({ success: false, message: "Failed to update candidate" });
  }
};

// ─── DELETE CANDIDATE ─────────────────────────────────────────────────────────
exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute("SELECT id FROM candidates WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: "Candidate not found" });

    await pool.execute("DELETE FROM candidates WHERE id = ?", [id]);
    res.json({ success: true, message: "Candidate deleted" });
  } catch (err) {
    console.error("deleteCandidate error:", err);
    res.status(500).json({ success: false, message: "Failed to delete candidate" });
  }
};