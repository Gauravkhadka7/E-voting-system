const { v4: uuidv4 } = require("uuid");
const pool = require("../db");

// ─── SUBMIT FEEDBACK ──────────────────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
  try {
    const { election_id, type = "GENERAL", subject, message, rating } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO feedback (id, user_id, election_id, type, subject, message, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user?.id || null, election_id || null, type, subject || null, message, rating || null]
    );

    res.status(201).json({ success: true, message: "Feedback submitted successfully", id });
  } catch (err) {
    console.error("submitFeedback error:", err);
    res.status(500).json({ success: false, message: "Failed to submit feedback" });
  }
};

// ─── GET ALL FEEDBACK (Admin) ─────────────────────────────────────────────────
exports.getAllFeedback = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT f.*, u.name as user_name, u.email as user_email, e.name as election_name
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN elections e ON f.election_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += " AND f.status = ?"; params.push(status); }
    if (type) { query += " AND f.type = ?"; params.push(type); }

    query += " ORDER BY f.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, feedback: rows });
  } catch (err) {
    console.error("getAllFeedback error:", err);
    res.status(500).json({ success: false, message: "Failed to get feedback" });
  }
};

// ─── UPDATE FEEDBACK STATUS (Admin) ──────────────────────────────────────────
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    await pool.execute("UPDATE feedback SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true, message: "Feedback status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update feedback" });
  }
};

// ─── GET MY FEEDBACK ──────────────────────────────────────────────────────────
exports.getMyFeedback = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ success: true, feedback: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get feedback" });
  }
};