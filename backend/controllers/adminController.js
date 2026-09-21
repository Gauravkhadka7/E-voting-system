const { v4: uuidv4 } = require("uuid");
const pool = require("../db");

// ─── GET ADMIN REPORTS / ANALYTICS ───────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    // Overall stats
    const [[totalUsers]] = await pool.execute("SELECT COUNT(*) as c FROM users WHERE is_active=TRUE");
    const [[verifiedUsers]] = await pool.execute("SELECT COUNT(*) as c FROM users WHERE is_verified=TRUE AND is_active=TRUE");
    const [[totalElections]] = await pool.execute("SELECT COUNT(*) as c FROM elections");
    const [[activeElections]] = await pool.execute("SELECT COUNT(*) as c FROM elections WHERE status='ACTIVE'");
    const [[totalVotes]] = await pool.execute("SELECT COUNT(*) as c FROM votes");
    const [[totalCandidates]] = await pool.execute("SELECT COUNT(*) as c FROM candidates");

    // Users by role
    const [usersByRole] = await pool.execute(
      "SELECT primary_role, COUNT(*) as count FROM users WHERE is_active=TRUE GROUP BY primary_role"
    );

    // Elections by status
    const [electionsByStatus] = await pool.execute(
      "SELECT status, COUNT(*) as count FROM elections GROUP BY status"
    );

    // Votes over time (last 30 days)
    const [votesOverTime] = await pool.execute(
      `SELECT DATE(cast_at) as date, COUNT(*) as count
       FROM votes WHERE cast_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(cast_at) ORDER BY date ASC`
    );

    // Top elections by participation
    const [topElections] = await pool.execute(
      `SELECT e.name, e.id, COUNT(DISTINCT v.user_id) as voter_count
       FROM elections e LEFT JOIN votes v ON e.id = v.election_id
       GROUP BY e.id ORDER BY voter_count DESC LIMIT 5`
    );

    // Recent audit logs
    const [recentLogs] = await pool.execute(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20"
    );

    res.json({
      success: true,
      stats: {
        total_users: totalUsers.c,
        verified_users: verifiedUsers.c,
        total_elections: totalElections.c,
        active_elections: activeElections.c,
        total_votes: totalVotes.c,
        total_candidates: totalCandidates.c,
      },
      users_by_role: usersByRole,
      elections_by_status: electionsByStatus,
      votes_over_time: votesOverTime,
      top_elections: topElections,
      recent_logs: recentLogs,
    });
  } catch (err) {
    console.error("getReports error:", err);
    res.status(500).json({ success: false, message: "Failed to get reports" });
  }
};

// ─── GET AUDIT LOGS ───────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const { event_type, election_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = "SELECT * FROM audit_logs WHERE 1=1";
    const params = [];

    if (event_type) { query += " AND event_type = ?"; params.push(event_type); }
    if (election_id) { query += " AND election_id = ?"; params.push(election_id); }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, logs: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get audit logs" });
  }
};

// ─── MANAGE ADMINS ────────────────────────────────────────────────────────────
exports.getAllAdmins = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, is_active, created_at FROM admins ORDER BY created_at DESC"
    );
    res.json({ success: true, admins: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get admins" });
  }
};

exports.updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot modify your own status" });
    }
    await pool.execute("UPDATE admins SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    res.json({ success: true, message: "Admin status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update admin" });
  }
};

// ─── BROADCAST NOTIFICATION ───────────────────────────────────────────────────
exports.broadcastNotification = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { title, message, type = "INFO", target_roles, election_id } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message required" });
    }

    let query = "SELECT id FROM users WHERE is_active = TRUE";
    const params = [];

    if (target_roles?.length) {
      // Filter by JSON roles — basic approach
      const rolePlaceholders = target_roles.map(() => "JSON_CONTAINS(user_roles, ?)").join(" OR ");
      query += ` AND (${rolePlaceholders})`;
      target_roles.forEach((r) => params.push(`"${r}"`));
    }

    const [users] = await conn.execute(query, params);

    await conn.beginTransaction();
    for (const user of users) {
      await conn.execute(
        "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), user.id, title, message, type]
      );
    }
    await conn.commit();

    res.json({ success: true, message: `Notification sent to ${users.length} users` });
  } catch (err) {
    await conn.rollback();
    console.error("broadcastNotification error:", err);
    res.status(500).json({ success: false, message: "Failed to broadcast" });
  } finally {
    conn.release();
  }
};