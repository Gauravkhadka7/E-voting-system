const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

let provider, signer, contract;

function getContractAddress() {
  try {
    const p = path.join(__dirname, "../contractAddress.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p)).contractAddress;
  } catch {}
  return null;
}

function getABI() {
  try {
    const p = path.join(__dirname, "../VotingABI.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p)).abi;
  } catch {}
  return null;
}

async function getContract() {
  if (contract) return contract;

  const contractAddress = getContractAddress();
  const abi = getABI();

  if (!contractAddress || !abi) {
    throw new Error("Contract not deployed. Run: npm run deploy");
  }

  provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_URL || "http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  signer = wallet;
  contract = new ethers.Contract(contractAddress, abi, signer);

  return contract;
}

/**
 * Create election on blockchain
 */
async function createElectionOnChain(electionId) {
  try {
    const c = await getContract();
    const tx = await c.createElection(electionId);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("Blockchain createElection error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cast vote on blockchain (stores hash only)
 */
async function castVoteOnChain(electionId, voteHash) {
  try {
    const c = await getContract();
    const tx = await c.castVote(electionId, voteHash);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("Blockchain castVote error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verify vote on blockchain
 */
async function verifyVoteOnChain(electionId, voterAddress) {
  try {
    const c = await getContract();
    const [hasVoted, voteHash, timestamp] = await c.verifyVote(electionId, voterAddress);
    return {
      success: true,
      hasVoted,
      voteHash,
      timestamp: timestamp.toString(),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get vote count from blockchain
 */
async function getVoteCountFromChain(electionId) {
  try {
    const c = await getContract();
    const count = await c.getVoteCount(electionId);
    return { success: true, count: Number(count) };
  } catch (err) {
    return { success: false, count: 0 };
  }
}

/**
 * Set election status on blockchain
 */
async function setElectionStatusOnChain(electionId, active) {
  try {
    const c = await getContract();
    const tx = await c.setElectionStatus(electionId, active);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  getContract,
  createElectionOnChain,
  castVoteOnChain,
  verifyVoteOnChain,
  getVoteCountFromChain,
  setElectionStatusOnChain,
};