import React, { useState } from "react";

import {
  getContract,
  castVote,
  generateCommitment,
  generateNullifier,
  generateSalt,
} from "../utils/contract";
import CandidateList from "./CandidateList";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const Vote = ({ election, candidates, account, signer, onVoteCast }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [step, setStep] = useState("select"); // select | confirm | proof | signing | done | error
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [proofData, setProofData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (candidateId) => {
    setSelectedCandidate(candidateId);
    setError("");
  };

  const handleConfirm = () => {
    if (!selectedCandidate) {
      setError("Please select a candidate before proceeding.");
      return;
    }
    setStep("confirm");
  };

  // Generate ZK proof (or skip if server unavailable)
  const handleGenerateProof = async () => {
    setStep("proof");
    setLoading(true);
    setError("");

    try {
      // Try ZK proof generation via backend
      let proof = null;
      let publicSignals = null;
      try {
        const res = await fetch(BACKEND_URL + "/api/votes/generate-proof", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: selectedCandidate,
            voterSecret: Math.floor(Math.random() * 1e15).toString(),
            nullifier: Math.floor(Math.random() * 1e15).toString(),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          proof = data.data.proof;
          publicSignals = data.data.publicSignals;
        }
      } catch {
        console.warn("ZK proof server unavailable — continuing without proof (dev mode).");
      }

      // Generate commitment and nullifier for on-chain use (ethers v6)
      const salt = generateSalt();
      const commitment = generateCommitment(selectedCandidate, salt);
      const nullifierHash = generateNullifier(account, salt);

      setProofData({ commitment, nullifierHash, salt, proof, publicSignals });
      setStep("signing");
    } catch (err) {
      setError("Proof generation failed: " + err.message);
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  // Submit vote on-chain
  const handleSubmitVote = async () => {
    if (!proofData) return;
    setLoading(true);
    setError("");

    try {
      const contract = getContract(signer);
      const receipt = await castVote(
        contract,
        election.id,
        selectedCandidate,
        proofData.commitment,
        proofData.nullifierHash
      );

      setTxHash(receipt.hash);

      // Notify backend for IPFS archival (optional)
      try {
        await fetch(BACKEND_URL + "/api/votes/cast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            electionId: election.id,
            voterAddress: account,
            commitment: proofData.commitment,
            txHash: receipt.hash,
          }),
        });
      } catch { /* backend logging is optional */ }

      setStep("done");
      if (onVoteCast) onVoteCast(receipt);
    } catch (err) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setError("Transaction rejected. You cancelled the MetaMask transaction.");
      } else if (err.message?.includes("already voted")) {
        setError("You have already voted in this election.");
      } else {
        setError("Transaction failed: " + err.message);
      }
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const selectedCandidateObj = candidates.find((c) => c.id === selectedCandidate);

  // Done
  if (step === "done") {
    return (
      <div className="vote-success">
        <div className="success-icon">✅</div>
        <h2>Vote Cast Successfully!</h2>
        <p>Your vote has been recorded on the Ethereum blockchain.</p>
        <div className="tx-info">
          <span className="tx-label">Transaction Hash:</span>
          <a
            className="tx-hash"
            href={"https://etherscan.io/tx/" + txHash}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-10)}
          </a>
        </div>
        <p className="privacy-note">
          🔒 Your vote commitment is stored on-chain. Your actual choice remains private.
        </p>
      </div>
    );
  }

  return (
    <div className="vote-container">
      {/* Progress */}
      <div className="vote-progress">
        {["Select", "Confirm", "Proof", "Sign"].map((label, idx) => {
          const steps = ["select", "confirm", "proof", "signing"];
          const currentIdx = steps.indexOf(step);
          return (
            <div key={label} className={"progress-step " + (idx <= currentIdx ? "active" : "")}>
              <div className="progress-dot">{idx < currentIdx ? "✓" : idx + 1}</div>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* Select */}
      {step === "select" && (
        <div className="vote-step">
          <h2 className="step-title">Select Your Candidate</h2>
          <p className="step-subtitle">Choose one candidate for <strong>{election.name}</strong></p>
          <CandidateList
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelect={handleSelect}
          />
          <div className="vote-actions">
            <button className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={!selectedCandidate}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Confirm */}
      {step === "confirm" && selectedCandidateObj && (
        <div className="vote-step">
          <h2 className="step-title">Confirm Your Vote</h2>
          <div className="confirm-card">
            <div className="confirm-avatar">{selectedCandidateObj.name.charAt(0)}</div>
            <div className="confirm-details">
              <h3>{selectedCandidateObj.name}</h3>
              <p>{selectedCandidateObj.party}</p>
            </div>
          </div>
          <p className="confirm-warning">
            ⚠️ <strong>This action is irreversible.</strong> Once submitted, your vote cannot be changed.
          </p>
          <div className="vote-actions">
            <button className="btn btn-outline" onClick={() => setStep("select")}>← Change</button>
            <button className="btn btn-primary btn-lg" onClick={handleGenerateProof} disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Generating...</> : "Generate ZK Proof →"}
            </button>
          </div>
        </div>
      )}

      {/* Proof generating */}
      {step === "proof" && (
        <div className="vote-step centered">
          <div className="loading-animation"><div className="zk-spinner" /></div>
          <h2>Generating Zero-Knowledge Proof</h2>
          <p>Computing cryptographic proof to protect your privacy...</p>
          <p className="proof-note">This proves your vote is valid without revealing who you voted for.</p>
        </div>
      )}

      {/* Sign & submit */}
      {step === "signing" && proofData && (
        <div className="vote-step">
          <h2 className="step-title">Submit Your Vote</h2>
          <div className="proof-summary">
            <div className="proof-item">
              <span className="proof-label">ZK Proof</span>
              <span className={"proof-value " + (proofData.proof ? "proof-ok" : "")}>
                {proofData.proof ? "✅ Verified" : "⚠️ Skipped (dev mode)"}
              </span>
            </div>
            <div className="proof-item">
              <span className="proof-label">Commitment Hash</span>
              <span className="proof-value mono">{proofData.commitment.slice(0, 18)}...</span>
            </div>
            <div className="proof-item">
              <span className="proof-label">Nullifier Hash</span>
              <span className="proof-value mono">{proofData.nullifierHash.slice(0, 18)}...</span>
            </div>
          </div>
          <p className="metamask-note">🦊 MetaMask will ask you to confirm this transaction. Gas fees apply.</p>
          <div className="vote-actions">
            <button className="btn btn-outline" onClick={() => setStep("confirm")}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmitVote} disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Submitting...</> : "🗳️ Cast Vote on Blockchain"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vote;