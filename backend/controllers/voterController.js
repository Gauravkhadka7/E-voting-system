const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { uploadToIPFS } = require("../services/ipfsService");
const { castVoteOnChain, verifyVoteOnChain } = require("../services/blockchainService");
const { sendEmail, templates } = require("../services/emailService");

function parseJSON(val, fb = {}) {
  if (typeof val === "object" && val !== null) return val;
  try { return JSON.parse(val); } catch { return fb; }
}

function encryptVote(data, secret) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function generateVoteHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// ─── CAST VOTE ────────────────────────────────────────────────────────────────
exports.castVote = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id, votes, wallet_address } = req.body;
    // votes: [{ position_name, candidate_ids, weights?, ranking? }]

    if (!election_id || !votes?.length) {
      return res.status(400).json({ success: false, message: "election_id and votes are required" });
    }

    // 1. Validate session
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });

    // 2. Check user roles & verification
    if (!req.user.is_verified && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Account not verified" });
    }

    // 3. Get election
    const [electionRows] = await conn.execute(
      "SELECT * FROM elections WHERE id = ? AND status = 'ACTIVE'",
      [election_id]
    );
    if (!electionRows.length) {
      return res.status(404).json({ success: false, message: "Election not found or not active" });
    }

    const election = electionRows[0];
    const now = new Date();
    if (now < new Date(election.start_date) || now > new Date(election.end_date)) {
      return res.status(400).json({ success: false, message: "Election is not currently running" });
    }

    // 4. Validate scope & eligibility
    const [voterCheck] = await conn.execute(
      "SELECT id FROM election_voters WHERE election_id = ? AND user_id = ?",
      [election_id, req.user.id]
    );
    // If voters are explicitly assigned, check eligibility
    const [totalVoters] = await conn.execute(
      "SELECT COUNT(*) as count FROM election_voters WHERE election_id = ?",
      [election_id]
    );
    if (totalVoters[0].count > 0 && !voterCheck.length) {
      return res.status(403).json({ success: false, message: "You are not eligible for this election" });
    }

    // 5. Check duplicate votes per position
    const positions = parseJSON(election.positions, []);

    await conn.beginTransaction();

    const voteRecords = [];
    const voteHashes = [];

    for (const vote of votes) {
      const { position_name, candidate_ids, weights, ranking } = vote;

      // Check duplicate
      const [dupCheck] = await conn.execute(
        "SELECT id FROM votes WHERE user_id = ? AND election_id = ? AND position_name = ?",
        [req.user.id, election_id, position_name]
      );
      if (dupCheck.length) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Already voted for position: ${position_name}`,
        });
      }

      // Get position config
      const positionConfig = positions.find((p) => p.position_name === position_name);
      if (!positionConfig) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Position not found: ${position_name}` });
      }

      // Validate voting type constraints
      const votingType = positionConfig.voting_type || "SINGLE";
      if (votingType === "SINGLE" && candidate_ids.length > 1) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Single choice: only one candidate allowed" });
      }
      if (votingType === "TOP_N" && candidate_ids.length > positionConfig.number_of_winners) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Top ${positionConfig.number_of_winners}: too many candidates selected`,
        });
      }

      // 6. Encrypt vote
      const voteData = {
        user_id: req.user.id,
        election_id,
        position_name,
        candidate_ids,
        weights: weights || null,
        ranking: ranking || null,
        voting_type: votingType,
        timestamp: Date.now(),
      };

      const encrypted = encryptVote(voteData, process.env.JWT_SECRET || "vote-secret");

      // 7. Generate hash
      const voteHash = generateVoteHash(voteData);
      voteHashes.push(voteHash);

      const voteId = uuidv4();
      voteRecords.push({ voteId, position_name, encrypted, voteHash, votingType });

      // 8. Store vote in DB
      await conn.execute(
        `INSERT INTO votes (id, user_id, election_id, position_name, encrypted_vote, vote_hash, wallet_address, voting_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [voteId, req.user.id, election_id, position_name, encrypted, voteHash, wallet_address || null, votingType]
      );

      // Update candidate vote counts
      for (const candidateId of candidate_ids) {
        const weight = weights?.[candidateId] || 1;
        await conn.execute(
          "UPDATE candidates SET vote_count = vote_count + 1, weighted_score = weighted_score + ? WHERE id = ? AND election_id = ?",
          [weight, candidateId, election_id]
        );
      }
    }

    // 9. Upload to IPFS (combined vote hash)
    const combinedHash = generateVoteHash({ voteHashes, user_id: req.user.id, election_id });
    const ipfsCid = await uploadToIPFS({ combinedHash, election_id, timestamp: Date.now() });

    // Update IPFS CID for all votes
    for (const record of voteRecords) {
      await conn.execute("UPDATE votes SET ipfs_cid = ? WHERE id = ?", [ipfsCid, record.voteId]);
    }

    // 10. Commit DB transaction
    await conn.commit();

    // 11. Send hash to blockchain (non-blocking)
    castVoteOnChain(election_id, combinedHash)
      .then(async (result) => {
        if (result.success) {
          await pool.execute(
            "UPDATE votes SET blockchain_tx = ? WHERE user_id = ? AND election_id = ?",
            [result.txHash, req.user.id, election_id]
          );
        }
      })
      .catch(() => {});

    // 12. Log audit
    await pool.execute(
      `INSERT INTO audit_logs (id, event_type, actor_id, actor_type, election_id, metadata)
       VALUES (?, 'VOTE_CAST', ?, 'USER', ?, ?)`,
      [uuidv4(), req.user.id, election_id, JSON.stringify({ ipfs_cid: ipfsCid, positions: votes.map((v) => v.position_name) })]
    );

    // 13. Send email confirmation (non-blocking)
    const [userRows] = await pool.execute("SELECT name, email FROM users WHERE id = ?", [req.user.id]);
    if (userRows.length) {
      const tmpl = templates.voteConfirmation(userRows[0].name, election.name, combinedHash);
      sendEmail({ to: userRows[0].email, ...tmpl }).catch(() => {});
    }

    res.json({
      success: true,
      message: "Vote cast successfully",
      vote_hash: combinedHash,
      ipfs_cid: ipfsCid,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("castVote error:", err);
    res.status(500).json({ success: false, message: "Failed to cast vote" });
  } finally {
    conn.release();
  }
};

// ─── CHECK IF USER HAS VOTED ──────────────────────────────────────────────────
exports.hasUserVoted = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [rows] = await pool.execute(
      "SELECT position_name, cast_at FROM votes WHERE user_id = ? AND election_id = ?",
      [req.user.id, election_id]
    );

    res.json({
      success: true,
      has_voted: rows.length > 0,
      voted_positions: rows.map((r) => r.position_name),
      voted_at: rows[0]?.cast_at || null,
    });
  } catch (err) {
    console.error("hasUserVoted error:", err);
    res.status(500).json({ success: false, message: "Failed to check vote status" });
  }
};

// ─── GET USER VOTE HISTORY ────────────────────────────────────────────────────
exports.getUserVoteHistory = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT v.election_id, v.position_name, v.vote_hash, v.ipfs_cid, v.blockchain_tx, v.cast_at,
              e.name as election_name, e.status as election_status
       FROM votes v
       JOIN elections e ON v.election_id = e.id
       WHERE v.user_id = ?
       ORDER BY v.cast_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, votes: rows });
  } catch (err) {
    console.error("getUserVoteHistory error:", err);
    res.status(500).json({ success: false, message: "Failed to get vote history" });
  }
};

// ─── VERIFY VOTE ──────────────────────────────────────────────────────────────
exports.verifyVote = async (req, res) => {
  try {
    const { vote_hash } = req.params;

    const [rows] = await pool.execute(
      `SELECT v.*, e.name as election_name
       FROM votes v JOIN elections e ON v.election_id = e.id
       WHERE v.vote_hash = ?`,
      [vote_hash]
    );

    if (!rows.length) {
      return res.json({ success: true, verified: false, message: "Vote hash not found in database" });
    }

    const vote = rows[0];
    let blockchainVerified = false;

    if (vote.wallet_address) {
      const result = await verifyVoteOnChain(vote.election_id, vote.wallet_address);
      blockchainVerified = result.hasVoted && result.voteHash === vote_hash;
    }

    res.json({
      success: true,
      verified: true,
      blockchain_verified: blockchainVerified,
      election_name: vote.election_name,
      position_name: vote.position_name,
      ipfs_cid: vote.ipfs_cid,
      cast_at: vote.cast_at,
    });
  } catch (err) {
    console.error("verifyVote error:", err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// ─── GET ELECTION VOTE STATS (Admin) ─────────────────────────────────────────
exports.getElectionVoteStats = async (req, res) => {
  try {
    const { election_id } = req.params;

    const [total] = await pool.execute(
      "SELECT COUNT(DISTINCT user_id) as voted FROM votes WHERE election_id = ?",
      [election_id]
    );
    const [totalEligible] = await pool.execute(
      "SELECT COUNT(*) as eligible FROM election_voters WHERE election_id = ?",
      [election_id]
    );
    const [byPosition] = await pool.execute(
      "SELECT position_name, COUNT(*) as vote_count FROM votes WHERE election_id = ? GROUP BY position_name",
      [election_id]
    );

    res.json({
      success: true,
      stats: {
        total_voted: total[0].voted,
        total_eligible: totalEligible[0].eligible,
        turnout: totalEligible[0].eligible > 0
          ? ((total[0].voted / totalEligible[0].eligible) * 100).toFixed(2)
          : 0,
        by_position: byPosition,
      },
    });
  } catch (err) {
    console.error("getElectionVoteStats error:", err);
    res.status(500).json({ success: false, message: "Failed to get vote stats" });
  }
};