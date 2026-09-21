const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { applyEligibilityFilters } = require("../services/eligibilityEngine");
const { sendEmail, templates } = require("../services/emailService");

function parseJSON(val, fb) {
  if (typeof val === "object" && val !== null) return val;
  try { return JSON.parse(val); } catch { return fb; }
}

function sanitizeUser(u) {
  const { password, reset_token, reset_token_expiry, verification_token, ...safe } = u;
  safe.user_roles = parseJSON(safe.user_roles, []);
  safe.custom_fields = parseJSON(safe.custom_fields, {});
  return safe;
}

// ─── GET ALL USERS (Admin) ────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const {
      primary_role, is_verified, search,
      district, municipality, province, batch, gender,
      page = 1, limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = "SELECT * FROM users WHERE is_active = TRUE";
    const params = [];

    if (primary_role) { query += " AND primary_role = ?"; params.push(primary_role); }
    if (is_verified !== undefined) { query += " AND is_verified = ?"; params.push(is_verified === "true" ? 1 : 0); }
    if (search) {
      query += " AND (name LIKE ? OR email LIKE ? OR institution_name LIKE ? OR company_name LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (district) { query += " AND district = ?"; params.push(district); }
    if (municipality) { query += " AND municipality = ?"; params.push(municipality); }
    if (province) { query += " AND province = ?"; params.push(province); }
    if (batch) { query += " AND batch = ?"; params.push(batch); }
    if (gender) { query += " AND gender = ?"; params.push(gender); }

    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
    const [countRows] = await pool.execute(countQuery, params);

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.execute(query, params);
    const users = rows.map(sanitizeUser);

    res.json({
      success: true,
      users,
      pagination: {
        total: countRows[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countRows[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ success: false, message: "Failed to get users" });
  }
};

// ─── GET USER BY ID ───────────────────────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: sanitizeUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get user" });
  }
};

// ─── UPDATE USER PROFILE ──────────────────────────────────────────────────────
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const isAdmin = req.user.isAdmin;

    // Non-admins can only update their own profile
    if (!isAdmin && userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const allowedFields = [
      "name", "gender", "district", "municipality", "province",
      "institution_name", "class", "section", "roll_number", "batch",
      "company_name", "branch", "job_role", "ward_number", "custom_fields",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(typeof req.body[field] === "object" ? JSON.stringify(req.body[field]) : req.body[field]);
      }
    }

    if (req.file) {
      updates.push("photo_url = ?");
      values.push(`/uploads/voter-docs/${req.file.filename}`);
    }

    if (!updates.length) return res.status(400).json({ success: false, message: "No fields to update" });

    values.push(userId);
    await pool.execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [userId]);
    res.json({ success: true, message: "Profile updated", user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error("updateUserProfile error:", err);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

// ─── VERIFY USER (Admin) ──────────────────────────────────────────────────────
exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified = true } = req.body;

    const [rows] = await pool.execute("SELECT name, email FROM users WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });

    await pool.execute("UPDATE users SET is_verified = ? WHERE id = ?", [verified ? 1 : 0, id]);

    if (verified) {
      const tmpl = templates.verified(rows[0].name);
      sendEmail({ to: rows[0].email, ...tmpl }).catch(() => {});
    }

    await pool.execute(
      "INSERT INTO audit_logs (id, event_type, actor_id, actor_type, metadata) VALUES (?, 'USER_VERIFIED', ?, 'ADMIN', ?)",
      [uuidv4(), req.user.id, JSON.stringify({ target_user: id, verified })]
    );

    res.json({ success: true, message: `User ${verified ? "verified" : "unverified"}` });
  } catch (err) {
    console.error("verifyUser error:", err);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

// ─── DELETE USER (Admin) ──────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute("UPDATE users SET is_active = FALSE WHERE id = ?", [id]);
    res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// ─── GET ELIGIBLE VOTERS FOR ELECTION ────────────────────────────────────────
exports.getEligibleVotersForElection = async (req, res) => {
  try {
    const { election_id } = req.params;
    const { position_index = 0 } = req.query;

    const [electionRows] = await pool.execute("SELECT * FROM elections WHERE id = ?", [election_id]);
    if (!electionRows.length) return res.status(404).json({ success: false, message: "Election not found" });

    const election = electionRows[0];
    const positions = parseJSON(election.positions, []);
    const position = positions[parseInt(position_index)];

    const [allUsers] = await pool.execute(
      "SELECT * FROM users WHERE is_verified = TRUE AND is_active = TRUE"
    );

    const eligible = applyEligibilityFilters(
      allUsers,
      position?.eligible_voters || {},
      { scopeType: election.scope_type, scopeId: election.scope_id }
    );

    res.json({
      success: true,
      total: eligible.length,
      voters: eligible.map(sanitizeUser),
    });
  } catch (err) {
    console.error("getEligibleVotersForElection error:", err);
    res.status(500).json({ success: false, message: "Failed to get eligible voters" });
  }
};

// ─── SUBMIT UPDATE REQUEST ────────────────────────────────────────────────────
exports.submitUpdateRequest = async (req, res) => {
  try {
    const id = uuidv4();
    await pool.execute(
      "INSERT INTO update_requests (id, user_id, requested_changes) VALUES (?, ?, ?)",
      [id, req.user.id, JSON.stringify(req.body)]
    );
    res.json({ success: true, message: "Update request submitted for admin review", request_id: id });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to submit request" });
  }
};

// ─── GET UPDATE REQUESTS (Admin) ──────────────────────────────────────────────
exports.getUpdateRequests = async (req, res) => {
  try {
    const { status = "PENDING" } = req.query;
    const [rows] = await pool.execute(
      `SELECT ur.*, u.name, u.email, u.primary_role
       FROM update_requests ur JOIN users u ON ur.user_id = u.id
       WHERE ur.status = ? ORDER BY ur.created_at DESC`,
      [status]
    );
    res.json({ success: true, requests: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get requests" });
  }
};

// ─── REVIEW UPDATE REQUEST (Admin) ───────────────────────────────────────────
exports.reviewUpdateRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { action, review_note } = req.body;

    const [rows] = await conn.execute(
      "SELECT * FROM update_requests WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Request not found" });

    const request = rows[0];
    await conn.beginTransaction();

    await conn.execute(
      "UPDATE update_requests SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE id = ?",
      [action === "approve" ? "APPROVED" : "REJECTED", req.user.id, review_note || null, id]
    );

    if (action === "approve") {
      const changes = parseJSON(request.requested_changes, {});
      const allowedFields = ["name", "gender", "district", "municipality", "province", "institution_name"];
      const updates = [];
      const values = [];

      for (const field of allowedFields) {
        if (changes[field]) {
          updates.push(`${field} = ?`);
          values.push(changes[field]);
        }
      }

      if (updates.length) {
        values.push(request.user_id);
        await conn.execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
      }
    }

    await conn.commit();
    res.json({ success: true, message: `Request ${action}d` });
  } catch (err) {
    await conn.rollback();
    console.error("reviewUpdateRequest error:", err);
    res.status(500).json({ success: false, message: "Failed to review request" });
  } finally {
    conn.release();
  }
};

// ─── GET NOTIFICATIONS ────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json({ success: true, notifications: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get notifications" });
  }
};

// ─── MARK NOTIFICATION READ ───────────────────────────────────────────────────
exports.markNotificationRead = async (req, res) => {
  try {
    await pool.execute(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
};