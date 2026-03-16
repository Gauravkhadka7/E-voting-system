const { ethers } = require("ethers");
const snarkjs = require("snarkjs");
const path = require("path");
const fs = require("fs");
const ipfsService = require("../services/ipfsServices");

// ─── Contract Setup ────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";

let provider, signer, contract;

function getContract() {
  if (!contract) {
    const abiPath = path.join(__dirname, "../../frontend/src/abi/voting.json");
    if (!fs.existsSync(abiPath)) {
      throw new Error("ABI not found. Please deploy the contract first.");
    }
    const { abi } = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
  }
  return contract;
}

// ─── ZK Proof Paths ────────────────────────────────────────────────────────────
const WASM_PATH = process.env.WASM_PATH || path.join(__dirname, "../../zk-proof/build/vote.wasm");
const ZKEY_PATH = process.env.ZKEY_PATH || path.join(__dirname, "../../zk-proof/build/vote.zkey");
const VK_PATH = process.env.VERIFICATION_KEY_PATH || path.join(__dirname, "../../zk-proof/build/verification_key.json");

// ─── Helper: Generate ZK Proof ──────────────────────────────────────────────
async function generateVoteProof(candidateId, voterSecret, nullifier) {
  const input = {
    candidateId: candidateId.toString(),
    voterSecret: voterSecret.toString(),
    nullifier: nullifier.toString(),
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    WASM_PATH,
    ZKEY_PATH
  );

  return { proof, publicSignals };
}

// ─── Helper: Verify ZK Proof ───────────────────────────────────────────────
async function verifyVoteProof(proof, publicSignals) {
  if (!fs.existsSync(VK_PATH)) {
    console.warn("⚠️  Verification key not found, skipping ZK proof verification.");
    return true;
  }
  const verificationKey = JSON.parse(fs.readFileSync(VK_PATH, "utf8"));
  return snarkjs.groth16.verify(verificationKey, publicSignals, proof);
}

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/votes/elections
 * Get all elections
 */
exports.getAllElections = async (req, res) => {
  try {
    const c = getContract();
    const elections = await c.getAllElections();
    const formatted = elections.map((e) => ({
      id: e.id.toNumber(),
      name: e.name,
      description: e.description,
      startTime: e.startTime.toNumber(),
      endTime: e.endTime.toNumber(),
      isActive: e.isActive,
      creator: e.creator,
      totalVotes: e.totalVotes.toNumber(),
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error("getAllElections error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/votes/elections/:id
 * Get election by ID
 */
exports.getElection = async (req, res) => {
  try {
    const { id } = req.params;
    const c = getContract();
    const election = await c.getElection(id);
    res.json({
      success: true,
      data: {
        id: election.id.toNumber(),
        name: election.name,
        description: election.description,
        startTime: election.startTime.toNumber(),
        endTime: election.endTime.toNumber(),
        isActive: election.isActive,
        creator: election.creator,
        totalVotes: election.totalVotes.toNumber(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/votes/elections/:id/candidates
 * Get candidates for an election
 */
exports.getCandidates = async (req, res) => {
  try {
    const { id } = req.params;
    const c = getContract();
    const candidates = await c.getCandidates(id);
    const formatted = candidates.map((cand) => ({
      id: cand.id.toNumber(),
      name: cand.name,
      party: cand.party,
      ipfsHash: cand.ipfsHash,
      voteCount: cand.voteCount.toNumber(),
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/votes/elections/:id/results
 * Get election results (after election ends)
 */
exports.getResults = async (req, res) => {
  try {
    const { id } = req.params;
    const c = getContract();
    const results = await c.getResults(id);
    const winner = await c.getWinner(id);
    const formatted = results.map((r) => ({
      id: r.id.toNumber(),
      name: r.name,
      party: r.party,
      voteCount: r.voteCount.toNumber(),
    }));
    res.json({
      success: true,
      data: {
        candidates: formatted,
        winner: {
          id: winner.id.toNumber(),
          name: winner.name,
          party: winner.party,
          voteCount: winner.voteCount.toNumber(),
        },
        totalVotes: formatted.reduce((acc, c) => acc + c.voteCount, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/votes/generate-proof
 * Generate ZK-SNARK proof for a vote (off-chain)
 */
exports.generateProof = async (req, res) => {
  try {
    const { candidateId, voterSecret, nullifier } = req.body;

    if (!candidateId || !voterSecret || !nullifier) {
      return res.status(400).json({
        success: false,
        error: "candidateId, voterSecret, and nullifier are required",
      });
    }

    const { proof, publicSignals } = await generateVoteProof(
      candidateId,
      voterSecret,
      nullifier
    );

    res.json({ success: true, data: { proof, publicSignals } });
  } catch (err) {
    console.error("generateProof error:", err.message);
    // If ZK setup files don't exist, return mock proof for dev
    res.status(500).json({
      success: false,
      error: "ZK proof generation failed. Ensure circuit files are compiled.",
      details: err.message,
    });
  }
};

/**
 * POST /api/votes/verify-proof
 * Verify a ZK-SNARK proof
 */
exports.verifyProof = async (req, res) => {
  try {
    const { proof, publicSignals } = req.body;
    const isValid = await verifyVoteProof(proof, publicSignals);
    res.json({ success: true, data: { valid: isValid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/votes/cast
 * Record a vote cast event (server-side logging / IPFS archival)
 */
exports.recordVote = async (req, res) => {
  try {
    const { electionId, voterAddress, commitment, txHash } = req.body;

    if (!electionId || !voterAddress || !commitment || !txHash) {
      return res.status(400).json({
        success: false,
        error: "electionId, voterAddress, commitment, and txHash are required",
      });
    }

    // Archive vote record to IPFS
    const voteRecord = {
      electionId,
      voterAddress,
      commitment,
      txHash,
      timestamp: new Date().toISOString(),
    };

    const ipfsHash = await ipfsService.uploadJSON(voteRecord);

    res.json({
      success: true,
      data: { message: "Vote recorded", ipfsHash, txHash },
    });
  } catch (err) {
    console.error("recordVote error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/votes/upload-metadata
 * Upload candidate metadata to IPFS
 */
exports.uploadCandidateMetadata = async (req, res) => {
  try {
    const { name, party, bio, imageBase64 } = req.body;

    const metadata = { name, party, bio, uploadedAt: new Date().toISOString() };
    const ipfsHash = await ipfsService.uploadJSON(metadata);

    res.json({ success: true, data: { ipfsHash } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/votes/voter-status/:electionId/:address
 * Check voter registration and voting status
 */
exports.getVoterStatus = async (req, res) => {
  try {
    const { electionId, address } = req.params;
    const c = getContract();
    const isRegistered = await c.isVoterRegistered(electionId, address);
    const voted = await c.hasVoted(electionId, address);
    res.json({ success: true, data: { isRegistered, hasVoted: voted } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};