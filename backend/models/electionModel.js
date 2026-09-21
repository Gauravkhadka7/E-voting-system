"use strict";

const { query, getConnection } = require("../config/db");

// ═══════════════════════════════════════════════
//  ELECTIONS
// ═══════════════════════════════════════════════

async function findElectionById(id) {
  const [rows] = await query(
    `SELECT e.*, u.name AS creator_name
     FROM elections e
     JOIN users u ON u.id = e.created_by
     WHERE e.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findAllElections({
  status = null,
  createdBy = null,
  limit = 100,
  offset = 0
} = {}) {

  limit = Number(limit);
  offset = Number(offset);

  if (isNaN(limit)) limit = 100;
  if (isNaN(offset)) offset = 0;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("e.status = ?");
    params.push(status);
  }

  if (createdBy) {
    conditions.push("e.created_by = ?");
    params.push(createdBy);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT e.*, u.name AS creator_name
    FROM elections e
    JOIN users u ON u.id = e.created_by
    ${where}
    ORDER BY e.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [rows] = await query(sql, params);
  return rows;
}

/** Elections that a specific voter has been assigned to. */
async function findElectionsForVoter(voterId) {
  const [rows] = await query(
    `SELECT e.*, u.name AS creator_name
     FROM elections e
     JOIN voter_elections ve ON ve.election_id = e.id
     JOIN users u ON u.id = e.created_by
     WHERE ve.voter_id = ?
     ORDER BY e.start_time DESC`,
    [voterId]
  );
  return rows;
}

/** Elections that an admin has been granted access to. */
async function findElectionsForAdmin(adminId) {
  const [rows] = await query(
    `SELECT e.*, u.name AS creator_name
     FROM elections e
     JOIN admin_elections ae ON ae.election_id = e.id
     JOIN users u ON u.id = e.created_by
     WHERE ae.admin_id = ?
     ORDER BY e.created_at DESC`,
    [adminId]
  );
  return rows;
}

async function createElection({ id, title, description, startTime, endTime, createdBy }) {
  await query(
    `INSERT INTO elections (id, title, description, start_time, end_time, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, description || null, startTime, endTime, createdBy]
  );

  return findElectionById(id);
}

async function updateElection(id, fields) {
  const allowed = ["title", "description", "start_time", "end_time", "status", "contract_election_id"];
  const sets = [];
  const values = [];

  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      sets.push(`\`${k}\` = ?`);
      values.push(v);
    }
  }

  if (!sets.length) return findElectionById(id);

  values.push(id);

  await query(
    `UPDATE elections SET ${sets.join(", ")} WHERE id = ?`,
    values
  );

  return findElectionById(id);
}

async function deleteElection(id) {
  const [result] = await query(
    `DELETE FROM elections WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

// ═══════════════════════════════════════════════
//  CANDIDATES
// ═══════════════════════════════════════════════

async function findCandidateById(id) {
  const [rows] = await query(
    `SELECT * FROM candidates WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findCandidatesByElection(electionId) {
  const [rows] = await query(
    `SELECT * FROM candidates WHERE election_id = ? ORDER BY name ASC`,
    [electionId]
  );
  return rows;
}

async function createCandidate({ id, electionId, name, party, bio, photoPath }) {
  await query(
    `INSERT INTO candidates (id, election_id, name, party, bio, photo_path)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, electionId, name, party || null, bio || null, photoPath || null]
  );

  return findCandidateById(id);
}

async function updateCandidate(id, fields) {
  const allowed = ["name", "party", "bio", "photo_path", "contract_candidate_id"];
  const sets = [];
  const values = [];

  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      sets.push(`\`${k}\` = ?`);
      values.push(v);
    }
  }

  if (!sets.length) return findCandidateById(id);

  values.push(id);

  await query(
    `UPDATE candidates SET ${sets.join(", ")} WHERE id = ?`,
    values
  );

  return findCandidateById(id);
}

async function deleteCandidate(id) {
  const [result] = await query(
    `DELETE FROM candidates WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

// ═══════════════════════════════════════════════
//  VOTER ASSIGNMENTS
// ═══════════════════════════════════════════════

async function assignVoters(electionId, voterIds) {
  if (!voterIds.length) return;

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    for (const vid of voterIds) {
      const [exists] = await conn.execute(
        `SELECT id FROM voter_elections WHERE voter_id = ? AND election_id = ? LIMIT 1`,
        [vid, electionId]
      );

      if (!exists.length) {
        const { v4: uuidv4 } = require("uuid");

        await conn.execute(
          `INSERT INTO voter_elections (id, voter_id, election_id) VALUES (?, ?, ?)`,
          [uuidv4(), vid, electionId]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function unassignVoter(electionId, voterId) {
  const [result] = await query(
    `DELETE FROM voter_elections WHERE election_id = ? AND voter_id = ?`,
    [electionId, voterId]
  );
  return result.affectedRows > 0;
}

async function findVotersForElection(electionId) {
  const [rows] = await query(
    `SELECT u.id, u.name, u.email, u.wallet_address, u.is_verified
     FROM users u
     JOIN voter_elections ve ON ve.voter_id = u.id
     WHERE ve.election_id = ?
     ORDER BY u.name ASC`,
    [electionId]
  );
  return rows;
}

async function isVoterAssigned(voterId, electionId) {
  const [rows] = await query(
    `SELECT id FROM voter_elections WHERE voter_id = ? AND election_id = ? LIMIT 1`,
    [voterId, electionId]
  );
  return rows.length > 0;
}

// ═══════════════════════════════════════════════
//  ADMIN ACCESS
// ═══════════════════════════════════════════════

async function grantAdminAccess(adminId, electionId) {
  const { v4: uuidv4 } = require("uuid");

  await query(
    `INSERT IGNORE INTO admin_elections (id, admin_id, election_id) VALUES (?, ?, ?)`,
    [uuidv4(), adminId, electionId]
  );
}

async function revokeAdminAccess(adminId, electionId) {
  const [result] = await query(
    `DELETE FROM admin_elections WHERE admin_id = ? AND election_id = ?`,
    [adminId, electionId]
  );
  return result.affectedRows > 0;
}

// ═══════════════════════════════════════════════
//  VOTE RECEIPTS
// ═══════════════════════════════════════════════

async function findReceiptByVoterElection(voterId, electionId) {
  const [rows] = await query(
    `SELECT * FROM vote_receipts
     WHERE voter_id = ? AND election_id = ? LIMIT 1`,
    [voterId, electionId]
  );
  return rows[0] || null;
}

async function findReceiptsByElection(electionId) {
  const [rows] = await query(
    `SELECT vr.*, u.name AS voter_name, c.name AS candidate_name
     FROM vote_receipts vr
     JOIN users u ON u.id = vr.voter_id
     JOIN candidates c ON c.id = vr.candidate_id
     WHERE vr.election_id = ?
     ORDER BY vr.voted_at DESC`,
    [electionId]
  );
  return rows;
}

async function createReceipt({ id, voterId, electionId, candidateId, txHash, blockNumber }) {
  await query(
    `INSERT INTO vote_receipts (id, voter_id, election_id, candidate_id, tx_hash, block_number)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, voterId, electionId, candidateId, txHash, blockNumber || null]
  );

  const [rows] = await query(
    `SELECT * FROM vote_receipts WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows[0];
}

// ═══════════════════════════════════════════════
//  AUDIT LOG
// ═══════════════════════════════════════════════

async function appendAuditLog({ actorId, action, targetType, targetId, meta }) {
  await query(
    `INSERT INTO audit_log (actor_id, action, target_type, target_id, meta)
     VALUES (?, ?, ?, ?, ?)`,
    [
      actorId || null,
      action,
      targetType || null,
      targetId || null,
      meta ? JSON.stringify(meta) : null
    ]
  );
}

async function getAuditLog({ limit = 100, offset = 0, electionId = null } = {}) {
  const where = electionId ? "WHERE al.target_id = ?" : "";
  const params = electionId ? [electionId, limit, offset] : [limit, offset];

  const [rows] = await query(
    `SELECT al.*, u.name AS actor_name
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.actor_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );

  return rows;
}

// ═══════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════

module.exports = {
  // elections
  findElectionById,
  findAllElections,
  findElectionsForVoter,
  findElectionsForAdmin,
  createElection,
  updateElection,
  deleteElection,

  // candidates
  findCandidateById,
  findCandidatesByElection,
  createCandidate,
  updateCandidate,
  deleteCandidate,

  // voter assignments
  assignVoters,
  unassignVoter,
  findVotersForElection,
  isVoterAssigned,

  // admin access
  grantAdminAccess,
  revokeAdminAccess,

  // receipts
  findReceiptByVoterElection,
  findReceiptsByElection,
  createReceipt,

  // audit
  appendAuditLog,
  getAuditLog,
};