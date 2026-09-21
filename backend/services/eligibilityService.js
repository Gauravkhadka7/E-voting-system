// services/eligibilityService.js
"use strict";

const electionModel = require("../models/electionModel");
const userModel     = require("../models/userModel");

/**
 * Full eligibility check before allowing a vote:
 *  1. User is a verified voter
 *  2. User has a registered wallet address
 *  3. User is assigned to this election
 *  4. Election is currently active
 *  5. User has NOT already voted
 *
 * Returns { eligible: true } or throws an error with { status, message }.
 */
async function checkVoterEligibility(userId, electionId) {
  // 1. Fetch user
  const user = await userModel.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found."), { status: 404 });
  }

  if (user.role !== "voter") {
    throw Object.assign(
      new Error("Only registered voters can cast votes."),
      { status: 403 }
    );
  }

  // 2. Verified account
  if (!user.is_verified) {
    throw Object.assign(
      new Error("Your email address is not verified."),
      { status: 403 }
    );
  }

  // 3. Wallet registered
  if (!user.wallet_address) {
    throw Object.assign(
      new Error("You must register a wallet address before voting."),
      { status: 403 }
    );
  }

  // 4. Fetch election
  const election = await electionModel.findElectionById(electionId);
  if (!election) {
    throw Object.assign(new Error("Election not found."), { status: 404 });
  }

  // 5. Election status
  const now = new Date();
  if (election.status !== "active") {
    throw Object.assign(
      new Error(`Election is not active (status: ${election.status}).`),
      { status: 400 }
    );
  }
  if (now < new Date(election.start_time)) {
    throw Object.assign(new Error("Election has not started yet."), { status: 400 });
  }
  if (now > new Date(election.end_time)) {
    throw Object.assign(new Error("Election has already ended."), { status: 400 });
  }

  // 6. Assigned to this election
  const assigned = await electionModel.isVoterAssigned(userId, electionId);
  if (!assigned) {
    throw Object.assign(
      new Error("You are not assigned to this election."),
      { status: 403 }
    );
  }

  // 7. Already voted?
  const receipt = await electionModel.findReceiptByVoterElection(userId, electionId);
  if (receipt) {
    throw Object.assign(
      new Error("You have already cast your vote in this election."),
      { status: 409 }
    );
  }

  return { eligible: true, user, election };
}

/**
 * Check whether a voter has already voted in a given election.
 * Returns the receipt or null.
 */
async function getVoteStatus(userId, electionId) {
  const receipt = await electionModel.findReceiptByVoterElection(userId, electionId);
  return receipt || null;
}

module.exports = { checkVoterEligibility, getVoteStatus };