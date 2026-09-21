const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { createElectionOnChain, setElectionStatusOnChain } = require("../services/blockchainService");

function parseJSON(val, fallback = {}) {
  if (typeof val === "object" && val !== null) return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ─── CREATE ELECTION ──────────────────────────────────────────────────────────
exports.createElection = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      name, description, scope_type = "CUSTOM", scope_id,
      visibility = "PUBLIC", allowed_user_roles = ["PUBLIC"],
      start_date, end_date, positions = [], settings = {},
    } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: "Name, start_date and end_date are required" });
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ success: false, message: "end_date must be after start_date" });
    }

    const id = uuidv4();

    await conn.execute(
      `INSERT INTO elections (
        id, name, description, scope_type, scope_id, visibility,
        allowed_user_roles, start_date, end_date, positions, settings, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, description || null, scope_type, scope_id || null,
        visibility, JSON.stringify(allowed_user_roles),
        start_date, end_date, JSON.stringify(positions),
        JSON.stringify(settings), req.user.id,
      ]
    );

    // Create on blockchain (non-blocking, store tx hash)
    createElectionOnChain(id)
      .then(async (result) => {
        if (result.success) {
          await pool.execute(
            "UPDATE elections SET contract_election_id = ?, blockchain_tx = ? WHERE id = ?",
            [id, result.txHash, id]
          );
        }
      })
      .catch(() => {});

    const [rows] = await conn.execute("SELECT * FROM elections WHERE id = ?", [id]);
    const election = rows[0];
    election.positions = parseJSON(election.positions, []);
    election.allowed_user_roles = parseJSON(election.allowed_user_roles, []);
    election.settings = parseJSON(election.settings, {});

    res.status(201).json({ success: true, message: "Election created", election });
  } catch (err) {
    console.error("createElection error:", err);
    res.status(500).json({ success: false, message: "Failed to create election" });
  } finally {
    conn.release();
  }
};

// ─── GET ALL ELECTIONS ────────────────────────────────────────────────────────
exports.getAllElections = async (req, res) => {
  try {
    const { status, scope_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = "SELECT * FROM elections WHERE 1=1";
    const params = [];

    if (status) { query += " AND status = ?"; params.push(status); }
    if (scope_type) { query += " AND scope_type = ?"; params.push(scope_type); }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.execute(query, params);
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM elections WHERE 1=1" +
        (status ? " AND status = ?" : "") +
        (scope_type ? " AND scope_type = ?" : ""),
      params.slice(0, -2)
    );

    const elections = rows.map((e) => ({
      ...e,
      positions: parseJSON(e.positions, []),
      allowed_user_roles: parseJSON(e.allowed_user_roles, []),
      settings: parseJSON(e.settings, {}),
    }));

    res.json({
      success: true,
      elections,
      pagination: {
        total: countRows[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countRows[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("getAllElections error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch elections" });
  }
};

// ─── GET ELECTION BY ID ───────────────────────────────────────────────────────
exports.getElectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM elections WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Election not found" });

    const election = rows[0];
    election.positions = parseJSON(election.positions, []);
    election.allowed_user_roles = parseJSON(election.allowed_user_roles, []);
    election.settings = parseJSON(election.settings, {});

    // Get candidates
    const [candidates] = await pool.execute(
      "SELECT * FROM candidates WHERE election_id = ? ORDER BY position_name, vote_count DESC",
      [id]
    );

    election.candidates = candidates;
    res.json({ success: true, election });
  } catch (err) {
    console.error("getElectionById error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch election" });
  }
};

// ─── UPDATE ELECTION ──────────────────────────────────────────────────────────
exports.updateElection = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [existing] = await pool.execute("SELECT id, status FROM elections WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: "Election not found" });

    const allowed = ["name", "description", "visibility", "allowed_user_roles", "positions", "settings", "banner_url"];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(typeof updates[key] === "object" ? JSON.stringify(updates[key]) : updates[key]);
      }
    }

    if (!setClauses.length) return res.status(400).json({ success: false, message: "No valid fields to update" });

    values.push(id);
    await pool.execute(`UPDATE elections SET ${setClauses.join(", ")} WHERE id = ?`, values);

    const [rows] = await pool.execute("SELECT * FROM elections WHERE id = ?", [id]);
    const election = rows[0];
    election.positions = parseJSON(election.positions, []);
    election.allowed_user_roles = parseJSON(election.allowed_user_roles, []);

    res.json({ success: true, message: "Election updated", election });
  } catch (err) {
    console.error("updateElection error:", err);
    res.status(500).json({ success: false, message: "Failed to update election" });
  }
};

// ─── UPDATE ELECTION STATUS ───────────────────────────────────────────────────
exports.updateElectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["DRAFT", "ACTIVE", "PAUSED", "ENDED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    await pool.execute("UPDATE elections SET status = ? WHERE id = ?", [status, id]);

    // Sync blockchain status
    if (status === "ACTIVE" || status === "ENDED" || status === "CANCELLED") {
      setElectionStatusOnChain(id, status === "ACTIVE").catch(() => {});
    }

    res.json({ success: true, message: `Election status updated to ${status}` });
  } catch (err) {
    console.error("updateElectionStatus error:", err);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

// ─── DELETE ELECTION ──────────────────────────────────────────────────────────
exports.deleteElection = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute("SELECT status FROM elections WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: "Election not found" });

    if (existing[0].status === "ACTIVE") {
      return res.status(400).json({ success: false, message: "Cannot delete an active election" });
    }

    await pool.execute("DELETE FROM elections WHERE id = ?", [id]);
    res.json({ success: true, message: "Election deleted" });
  } catch (err) {
    console.error("deleteElection error:", err);
    res.status(500).json({ success: false, message: "Failed to delete election" });
  }
};

// ─── GET ELECTION RESULTS ─────────────────────────────────────────────────────
exports.getElectionResults = async (req, res) => {
  try {
    const { id } = req.params;
    const [electionRows] = await pool.execute("SELECT * FROM elections WHERE id = ?", [id]);
    if (!electionRows.length) return res.status(404).json({ success: false, message: "Election not found" });

    const election = electionRows[0];
    const positions = parseJSON(election.positions, []);

    const [candidates] = await pool.execute(
      "SELECT * FROM candidates WHERE election_id = ? ORDER BY position_name, vote_count DESC",
      [id]
    );

    const [voteCount] = await pool.execute(
      "SELECT COUNT(DISTINCT user_id) as total FROM votes WHERE election_id = ?",
      [id]
    );

    // Group by position with winners
    const results = positions.map((pos) => {
      const positionCandidates = candidates.filter(
        (c) => c.position_name === pos.position_name
      );
      const numWinners = pos.number_of_winners || 1;
      const winners = positionCandidates.slice(0, numWinners);

      return {
        position_name: pos.position_name,
        voting_type: pos.voting_type || "SINGLE",
        number_of_winners: numWinners,
        candidates: positionCandidates,
        winners,
        total_votes: positionCandidates.reduce((s, c) => s + (c.vote_count || 0), 0),
      };
    });

    res.json({
      success: true,
      election: {
        id: election.id,
        name: election.name,
        status: election.status,
        start_date: election.start_date,
        end_date: election.end_date,
      },
      total_voters_voted: voteCount[0].total,
      results,
    });
  } catch (err) {
    console.error("getElectionResults error:", err);
    res.status(500).json({ success: false, message: "Failed to get results" });
  }
};

// ─── GET ACTIVE ELECTIONS FOR USER ───────────────────────────────────────────
exports.getActiveElectionsForUser = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, ev.user_id as is_eligible
       FROM elections e
       LEFT JOIN election_voters ev ON e.id = ev.election_id AND ev.user_id = ?
       WHERE e.status = 'ACTIVE' AND NOW() BETWEEN e.start_date AND e.end_date
       ORDER BY e.created_at DESC`,
      [req.user.id]
    );

    const elections = rows.map((e) => ({
      ...e,
      positions: parseJSON(e.positions, []),
      allowed_user_roles: parseJSON(e.allowed_user_roles, []),
      is_eligible: e.is_eligible !== null,
    }));

    res.json({ success: true, elections });
  } catch (err) {
    console.error("getActiveElectionsForUser error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch elections" });
  }
};

// ─── GET ELECTION HISTORY ─────────────────────────────────────────────────────
exports.getElectionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await pool.execute(
      `SELECT e.*, COUNT(DISTINCT v.user_id) as total_votes
       FROM elections e
       LEFT JOIN votes v ON e.id = v.election_id
       WHERE e.status IN ('ENDED', 'CANCELLED')
       GROUP BY e.id
       ORDER BY e.end_date DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const elections = rows.map((e) => ({
      ...e,
      positions: parseJSON(e.positions, []),
    }));

    res.json({ success: true, elections });
  } catch (err) {
    console.error("getElectionHistory error:", err);
    res.status(500).json({ success: false, message: "Failed to get history" });
  }
};

// ─── GET DASHBOARD STATS ──────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [[totalElections]] = await pool.execute("SELECT COUNT(*) as count FROM elections");
    const [[activeElections]] = await pool.execute("SELECT COUNT(*) as count FROM elections WHERE status = 'ACTIVE'");
    const [[totalUsers]] = await pool.execute("SELECT COUNT(*) as count FROM users");
    const [[verifiedUsers]] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE is_verified = TRUE");
    const [[totalVotes]] = await pool.execute("SELECT COUNT(*) as count FROM votes");
    const [[totalCandidates]] = await pool.execute("SELECT COUNT(*) as count FROM candidates");

    const [recentElections] = await pool.execute(
      "SELECT id, name, status, start_date, end_date FROM elections ORDER BY created_at DESC LIMIT 5"
    );

    res.json({
      success: true,
      stats: {
        total_elections: totalElections.count,
        active_elections: activeElections.count,
        total_users: totalUsers.count,
        verified_users: verifiedUsers.count,
        total_votes: totalVotes.count,
        total_candidates: totalCandidates.count,
      },
      recent_elections: recentElections,
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ success: false, message: "Failed to get stats" });
  }
};

// ─── ASSIGN VOTERS TO ELECTION ────────────────────────────────────────────────
exports.assignVoters = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { user_ids, filters } = req.body;

    if (!user_ids?.length) {
      return res.status(400).json({ success: false, message: "user_ids array required" });
    }

    await conn.beginTransaction();

    let added = 0;
    for (const userId of user_ids) {
      try {
        await conn.execute(
          "INSERT IGNORE INTO election_voters (id, election_id, user_id, eligibility_filters) VALUES (?, ?, ?, ?)",
          [uuidv4(), id, userId, JSON.stringify(filters || {})]
        );
        added++;
      } catch {}
    }

    await conn.commit();
    res.json({ success: true, message: `${added} voters assigned`, added });
  } catch (err) {
    await conn.rollback();
    console.error("assignVoters error:", err);
    res.status(500).json({ success: false, message: "Failed to assign voters" });
  } finally {
    conn.release();
  }
};