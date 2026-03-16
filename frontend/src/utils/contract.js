import { ethers, BrowserProvider, JsonRpcProvider, Contract, keccak256, solidityPacked, randomBytes } from "ethers";
import votingABI from "../abi/voting.json";

const CONTRACT_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

// ─── Get Read-Only Contract ───────────────────────────────────────────────────
export function getReadOnlyContract() {
  try {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      return new Contract(CONTRACT_ADDRESS, votingABI.abi, provider);
    }
    const rpcUrl = process.env.REACT_APP_RPC_URL || "http://127.0.0.1:8545";
    const provider = new JsonRpcProvider(rpcUrl);
    return new Contract(CONTRACT_ADDRESS, votingABI.abi, provider);
  } catch (err) {
    throw new Error("Could not connect to blockchain: " + err.message);
  }
}

// ─── Get Writable Contract (needs signer) ────────────────────────────────────
export function getContract(signerOrProvider) {
  if (!signerOrProvider) throw new Error("A signer or provider is required.");
  return new Contract(CONTRACT_ADDRESS, votingABI.abi, signerOrProvider);
}

// ─── Election Functions ───────────────────────────────────────────────────────
export async function getAllElections(contract) {
  const raw = await contract.getAllElections();
  return raw.map(formatElection);
}

export async function getElection(contract, electionId) {
  const raw = await contract.getElection(electionId);
  return formatElection(raw);
}

export async function getCandidates(contract, electionId) {
  const raw = await contract.getCandidates(electionId);
  return raw.map(formatCandidate);
}

export async function getResults(contract, electionId) {
  const raw = await contract.getResults(electionId);
  return raw.map(formatCandidate);
}

export async function getWinner(contract, electionId) {
  const raw = await contract.getWinner(electionId);
  return formatCandidate(raw);
}

// ─── Voter Functions ──────────────────────────────────────────────────────────
export async function isVoterRegistered(contract, electionId, address) {
  return contract.isVoterRegistered(electionId, address);
}

export async function hasVoted(contract, electionId, address) {
  return contract.hasVoted(electionId, address);
}

// ─── Admin Functions ──────────────────────────────────────────────────────────
export async function createElection(contract, name, description, startTime, endTime) {
  const tx = await contract.createElection(name, description, startTime, endTime);
  return tx.wait();
}

export async function addCandidate(contract, electionId, name, party, ipfsHash) {
  const tx = await contract.addCandidate(electionId, name, party, ipfsHash);
  return tx.wait();
}

export async function registerVoters(contract, electionId, addresses) {
  const tx = await contract.registerVoters(electionId, addresses);
  return tx.wait();
}

export async function setElectionStatus(contract, electionId, isActive) {
  const tx = await contract.setElectionStatus(electionId, isActive);
  return tx.wait();
}

// ─── Voting ───────────────────────────────────────────────────────────────────
export async function castVote(contract, electionId, candidateId, commitment, nullifierHash) {
  const tx = await contract.castVote(electionId, candidateId, commitment, nullifierHash);
  return tx.wait();
}

// ─── Commitment & Nullifier helpers (ethers v6) ───────────────────────────────
export function generateCommitment(candidateId, salt) {
  return keccak256(solidityPacked(["uint256", "bytes32"], [candidateId, salt]));
}

export function generateNullifier(voterAddress, salt) {
  return keccak256(solidityPacked(["address", "bytes32"], [voterAddress, salt]));
}

export function generateSalt() {
  return randomBytes(32);
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatElection(e) {
  return {
    id: Number(e.id),
    name: e.name,
    description: e.description,
    startTime: Number(e.startTime) * 1000,
    endTime: Number(e.endTime) * 1000,
    isActive: e.isActive,
    creator: e.creator,
    totalVotes: Number(e.totalVotes),
  };
}

function formatCandidate(c) {
  return {
    id: Number(c.id),
    name: c.name,
    party: c.party,
    ipfsHash: c.ipfsHash,
    voteCount: Number(c.voteCount),
  };
}

export { CONTRACT_ADDRESS };