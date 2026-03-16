# ⛓ BlockVote — Blockchain E-Voting System

> **Final Year Project** — Decentralized Electronic Voting on Ethereum with ZK-SNARKs, IPFS, and MetaMask

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://docs.soliditylang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB)](https://reactjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19-yellow)](https://hardhat.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Security Properties](#security-properties)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Deployment Guide](#deployment-guide)
- [ZK-SNARK Setup](#zk-snark-setup)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)

---

## 🎯 Overview

BlockVote is a secure, transparent, and privacy-preserving electronic voting system built on the Ethereum blockchain. It uses:

| Technology | Purpose |
|-----------|---------|
| **Ethereum / Solidity** | Immutable vote recording via smart contracts |
| **ZK-SNARKs (Circom)** | Anonymous voter verification |
| **IPFS** | Decentralized audit log storage |
| **MetaMask** | Voter authentication & transaction signing |
| **React.js** | Interactive frontend |
| **Node.js** | Backend API |
| **Hardhat + Ganache** | Local development blockchain |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│          (MetaMask Auth · Vote UI · Results)             │
└────────────────────────┬────────────────────────────────┘
                         │ Web3 / ethers.js
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌─────────┐    ┌──────────┐   ┌──────────┐
   │MetaMask │    │ Node.js  │   │   IPFS   │
   │ Wallet  │    │ Backend  │   │ Storage  │
   └────┬────┘    └─────┬────┘   └──────────┘
        │ Sign Tx        │ Audit Upload
        ▼                ▼
   ┌─────────────────────────────────┐
   │     Ethereum Blockchain (EVM)   │
   │         Voting.sol              │
   │  (castVote · nullifiers · ZK)   │
   └─────────────────────────────────┘
        ▲
   ┌────┴────────┐
   │  ZK-SNARK   │
   │  Circom     │
   │  vote.circom│
   └─────────────┘
```

---

## 🔐 Security Properties

| Property | Implementation |
|---------|---------------|
| **Integrity** | All votes hashed with keccak256 and stored immutably on-chain |
| **Anonymity** | ZK nullifiers prevent linking voter identity to vote |
| **Verifiability** | Anyone can audit results by reading the smart contract |
| **Authenticity** | MetaMask ECDSA signatures verify voter identity |
| **Anti-Double Vote** | Nullifier hash stored on-chain, prevents reuse |
| **Confidentiality** | Vote choices not publicly linked to voter address |

---

## 📁 Project Structure

```
blockchain-evoting/
├── blockchain/
│   ├── contracts/
│   │   └── Voting.sol              ← Main smart contract
│   ├── scripts/
│   │   └── deploy.js               ← Deployment script
│   └── test/
│       └── voting.test.js          ← Contract tests (Mocha/Chai)
│
├── backend/
│   ├── controllers/
│   │   └── voteController.js       ← API route handlers
│   ├── routes/
│   │   └── voteRoutes.js           ← Express routes
│   ├── services/
│   │   └── ipfsService.js          ← IPFS upload/fetch
│   └── server.js                   ← Express server
│
├── frontend/
│   └── src/
│       ├── abi/
│       │   └── voting.json         ← Contract ABI
│       ├── components/
│       │   ├── Navbar.js
│       │   ├── CandidateList.js
│       │   ├── Vote.js
│       │   └── Results.js
│       ├── pages/
│       │   ├── Home.js
│       │   ├── VotingPage.js
│       │   └── AdminPage.js
│       ├── utils/
│       │   ├── connectWallet.js    ← MetaMask integration
│       │   ├── contract.js         ← ethers.js contract calls
│       │   └── ipfs.js             ← IPFS frontend utilities
│       ├── App.js
│       ├── index.js
│       └── style.css
│
├── ipfs/
│   └── upload.js                   ← IPFS upload CLI utility
│
├── zkproof/
│   ├── circuits/
│   │   └── vote.circom             ← ZK circuit definition
│   └── build/
│       ├── vote.wasm               ← Compiled circuit
│       ├── vote.zkey               ← Proving key
│       └── verification_key.json   ← Verification key
│
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## ⚡ Quick Start

### Prerequisites

```bash
# Node.js 18+ required
node --version   # must be >= 18.0.0
npm --version

# Install global tools
npm install -g hardhat ganache nodemon
npm install -g snarkjs

# Install Rust (for Circom)
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source ~/.cargo/env

# Install Circom
cargo install --git https://github.com/iden3/circom
```

### Install Dependencies

```bash
# Root (hardhat + ethers)
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### Configure Environment

```bash
cp .env.example .env
# Edit .env — fill in your values
```

---

## 🚀 Deployment Guide

### Terminal 1 — Start Local Blockchain

```bash
npx ganache --port 8545 --deterministic --accounts 10 --networkId 1337
# Keep this running — DO NOT CLOSE
```

### Terminal 2 — Compile & Deploy Contract

```bash
npx hardhat compile
npx hardhat test                                                    # run all tests
npx hardhat run blockchain/scripts/deploy.js --network localhost
# Copy the contract address printed in the output
```

### Terminal 3 — Start Backend

```bash
cd backend
nodemon server.js
# API running at http://localhost:5000
```

### Terminal 4 — Start Frontend

```bash
cd frontend
npm start
# App running at http://localhost:3000
```

### MetaMask Configuration

1. Open MetaMask in Chrome
2. Click **Add Network** → **Custom RPC**
3. Enter:
   - Network Name: `Localhost 8545`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`
4. **Import Account**: Copy a private key from Ganache terminal output → MetaMask → Import Account

---

## 🔐 ZK-SNARK Setup

```bash
# Step 1: Compile the Circom circuit
circom zkproof/circuits/vote.circom --r1cs --wasm --sym -o zkproof/build/

# Step 2: Powers of Tau trusted setup (Phase 1)
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="Contributor 1"
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau

# Step 3: Groth16 setup (Phase 2)
snarkjs groth16 setup zkproof/build/voter.r1cs pot12_final.ptau zkproof/build/vote.zkey
snarkjs zkey contribute zkproof/build/vote.zkey zkproof/build/vote_final.zkey --name="Contributor 1"

# Step 4: Export verification key
snarkjs zkey export verificationkey zkproof/build/vote_final.zkey zkproof/build/verification_key.json

# Step 5: Generate and verify a test proof
snarkjs groth16 fullprove input.json zkproof/build/vote_js/vote.wasm zkproof/build/vote_final.zkey proof.json public.json
snarkjs groth16 verify zkproof/build/verification_key.json public.json proof.json
```

---

## 🧪 Running Tests

```bash
# All contract tests
npx hardhat test

# Specific test file
npx hardhat test blockchain/test/voting.test.js

# With gas reporter
REPORT_GAS=true npx hardhat test

# Code coverage
npx hardhat coverage
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/` | Health check & endpoints list |
| `POST` | `/api/vote` | Cast a vote (prepare + IPFS upload) |
| `GET` | `/api/results/:id` | Get election results |
| `GET` | `/api/candidates/:id` | Get all candidates |
| `GET` | `/api/elections` | List all elections |
| `GET` | `/api/voter/status/:addr` | Check voter registration & vote status |
| `POST` | `/api/voter/register` | Register a voter (admin) |
| `POST` | `/api/verify-proof` | Verify a ZK-SNARK proof off-chain |
| `POST` | `/api/ipfs/upload` | Upload data to IPFS |
| `GET` | `/api/ipfs/:cid` | Fetch data from IPFS |
| `GET` | `/api/audit/:id` | Get full vote audit log |
| `GET` | `/api/stats` | System statistics |

---

## 🛡️ Smart Contract Functions

| Function | Access | Description |
|---------|--------|-------------|
| `castVote(electionId, candidateId, nullifierHash, voteHash, ipfsCID)` | Registered Voter | Cast a vote |
| `getCandidates(electionId)` | Public | Get all candidates |
| `getResults(electionId)` | Public | Get vote counts |
| `getWinner(electionId)` | Public | Get leading candidate |
| `getVoteRecords(electionId)` | Public | Get audit trail |
| `registerVoter(address)` | Admin | Register a voter |
| `createElection(...)` | Admin | Create new election |
| `addCandidate(...)` | Admin | Add a candidate |
| `finalizeElection(id)` | Admin | Close and finalize |

---

## 👨‍💻 Authors

Final Year Project — Blockchain E-Voting System  
Department of Computer Science & Engineering

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
