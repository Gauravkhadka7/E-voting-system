// services/electionService.js
"use strict";

const { v4: uuidv4 } = require("uuid");
const electionModel  = require("../models/electionModel");
const userModel      = require("../models/userModel");

// ─── elections ────────────────────────────────────────────────────────────────

async function createElection(data, createdBy) {
  const { title, description, startTime, endTime } = data;
  if (!title || !startTime || !endTime) {
    throw Object.assign(new Error("title, startTime and endTime are required."), { status: 400 });
  }
  if (new Date(startTime) >= new Date(endTime)) {
    throw Object.assign(new Error("startTime must be before endTime."), { status: 400 });
  }

  const election = await electionModel.createElection({
    id: uuidv4(), title, description, startTime, endTime, createdBy,
  });

  await electionModel.appendAuditLog({
    actorId: createdBy, action: "election.create",
    targetType: "election", targetId: election.id,
    meta: { title },
  });

  return election;
}

async function getElection(id, user) {
  const election = await electionModel.findElectionById(id);
  if (!election) throw Object.assign(new Error("Election not found."), { status: 404 });

  // Voters can only see their assigned elections
  if (user.role === "voter") {
    const assigned = await electionModel.isVoterAssigned(user.id, id);
    if (!assigned) throw Object.assign(new Error("Forbidden."), { status: 403 });
  }
  return election;
}

async function listElections(user, filters = {}) {
  if (user.role === "voter") {
    return electionModel.findElectionsForVoter(user.id);
  }
  if (user.role === "admin") {
    return electionModel.findElectionsForAdmin(user.id);
  }
  // superadmin sees all
  return electionModel.findAllElections(filters);
}

async function updateElection(id, data, actor) {
  const election = await electionModel.findElectionById(id);
  if (!election) throw Object.assign(new Error("Election not found."), { status: 404 });

  _checkAccess(actor, election);

  // Map camelCase to snake_case column names
  const fields = {};
  if (data.title)       fields.title        = data.title;
  if (data.description !== undefined) fields.description = data.description;
  if (data.startTime)   fields.start_time   = data.startTime;
  if (data.endTime)     fields.end_time     = data.endTime;
  if (data.status)      fields.status       = data.status;

  const updated = await electionModel.updateElection(id, fields);

  await electionModel.appendAuditLog({
    actorId: actor.id, action: "election.update",
    targetType: "election", targetId: id, meta: fields,
  });

  return updated;
}

async function deleteElection(id, actor) {
  const election = await electionModel.findElectionById(id);
  if (!election) throw Object.assign(new Error("Election not found."), { status: 404 });

  _checkAccess(actor, election);

  const ok = await electionModel.deleteElection(id);

  await electionModel.appendAuditLog({
    actorId: actor.id, action: "election.delete",
    targetType: "election", targetId: id,
  });

  return ok;
}

// ─── voter assignment ─────────────────────────────────────────────────────────

async function assignVoters(electionId, voterIds, actor) {
  const election = await electionModel.findElectionById(electionId);
  if (!election) throw Object.assign(new Error("Election not found."), { status: 404 });
  _checkAccess(actor, election);

  // Validate all voterIds are real voter-role users
  const valid = [];
  for (const vid of voterIds) {
    const user = await userModel.findById(vid);
    if (user && user.role === "voter") valid.push(vid);
  }

  await electionModel.assignVoters(electionId, valid);

  await electionModel.appendAuditLog({
    actorId: actor.id, action: "election.assignVoters",
    targetType: "election", targetId: electionId,
    meta: { count: valid.length },
  });

  return valid.length;
}

async function getVotersForElection(electionId, actor) {
  const election = await electionModel.findElectionById(electionId);
  if (!election) throw Object.assign(new Error("Election not found."), { status: 404 });
  _checkAccess(actor, election);
  return electionModel.findVotersForElection(electionId);
}

// ─── candidates ───────────────────────────────────────────────────────────────

async function addCandidate(electionId, data, actor) {
  const election = await electionModel.findElectionById(electionId);
  if (!election) throw Object.assign(new Error("Election not found."), { status: 404 });
  _checkAccess(actor, election);

  const { name, party, bio, photoPath } = data;
  if (!name) throw Object.assign(new Error("Candidate name is required."), { status: 400 });

  const candidate = await electionModel.createCandidate({
    id: uuidv4(), electionId, name, party, bio, photoPath,
  });

  await electionModel.appendAuditLog({
    actorId: actor.id, action: "candidate.add",
    targetType: "candidate", targetId: candidate.id,
    meta: { electionId, name },
  });

  return candidate;
}

async function getCandidatesForElection(electionId) {
  return electionModel.findCandidatesByElection(electionId);
}

async function updateCandidate(candidateId, data, actor) {
  const candidate = await electionModel.findCandidateById(candidateId);
  if (!candidate) throw Object.assign(new Error("Candidate not found."), { status: 404 });

  const election = await electionModel.findElectionById(candidate.election_id);
  _checkAccess(actor, election);

  const fields = {};
  if (data.name)      fields.name      = data.name;
  if (data.party !== undefined) fields.party = data.party;
  if (data.bio   !== undefined) fields.bio   = data.bio;
  if (data.photoPath) fields.photo_path = data.photoPath;

  return electionModel.updateCandidate(candidateId, fields);
}

async function deleteCandidate(candidateId, actor) {
  const candidate = await electionModel.findCandidateById(candidateId);
  if (!candidate) throw Object.assign(new Error("Candidate not found."), { status: 404 });

  const election = await electionModel.findElectionById(candidate.election_id);
  _checkAccess(actor, election);

  await electionModel.appendAuditLog({
    actorId: actor.id, action: "candidate.delete",
    targetType: "candidate", targetId: candidateId,
  });

  return electionModel.deleteCandidate(candidateId);
}

// ─── private ──────────────────────────────────────────────────────────────────

function _checkAccess(user, election) {
  if (user.role === "superadmin") return; // superadmin has universal access
  if (user.role === "voter") {
    throw Object.assign(new Error("Forbidden."), { status: 403 });
  }
  // admin must be the creator (fine-grained access is already handled in listElections)
  if (election.created_by !== user.id) {
    throw Object.assign(new Error("Forbidden."), { status: 403 });
  }
}

module.exports = {
  createElection, getElection, listElections, updateElection, deleteElection,
  assignVoters, getVotersForElection,
  addCandidate, getCandidatesForElection, updateCandidate, deleteCandidate,
};