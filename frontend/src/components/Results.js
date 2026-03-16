import React, { useState, useEffect } from "react";
import { getReadOnlyContract, getResults, getWinner, getElection } from "../utils/contract";
import CandidateList from "./CandidateList";

const Results = ({ electionId }) => {
  const [candidates, setCandidates] = useState([]);
  const [winner, setWinner] = useState(null);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!electionId) return;
    fetchResults();
  }, [electionId]);

  const fetchResults = async () => {
    setLoading(true);
    setError("");
    try {
      const contract = getReadOnlyContract();
      const [electionData, resultsData, winnerData] = await Promise.all([
        getElection(contract, electionId),
        getResults(contract, electionId),
        getWinner(contract, electionId),
      ]);

      setElection(electionData);

      // Mark the winner
      const totalVotes = resultsData.reduce((sum, c) => sum + c.voteCount, 0);
      const enriched = resultsData
        .map((c) => ({
          ...c,
          isWinner: c.id === winnerData.id,
          percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : 0,
        }))
        .sort((a, b) => b.voteCount - a.voteCount);

      setCandidates(enriched);
      setWinner(winnerData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="results-loading">
        <div className="spinner" />
        <p>Loading election results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <p>⚠️ {error}</p>
        <button className="btn btn-sm" onClick={fetchResults}>Retry</button>
      </div>
    );
  }

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

  return (
    <div className="results-container">
      {/* Header */}
      <div className="results-header">
        <h2>{election?.name || "Election Results"}</h2>
        <div className="results-meta">
          <span className="meta-item">🗳️ Total Votes: <strong>{totalVotes}</strong></span>
          <span className="meta-item">📋 Candidates: <strong>{candidates.length}</strong></span>
          {election && (
            <span className="meta-item">
              🏁 Ended: <strong>{new Date(election.endTime).toLocaleDateString()}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Winner announcement */}
      {winner && (
        <div className="winner-announcement">
          <div className="winner-trophy">🏆</div>
          <div className="winner-info">
            <p className="winner-label">Winner</p>
            <h3 className="winner-name">{winner.name}</h3>
            <p className="winner-party">{winner.party}</p>
            <p className="winner-votes">
              {winner.voteCount} votes
              {totalVotes > 0 &&
                ` (${((winner.voteCount / totalVotes) * 100).toFixed(1)}%)`}
            </p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="results-chart">
        <h3>Vote Distribution</h3>
        {candidates.map((c) => (
          <div key={c.id} className="chart-row">
            <span className="chart-label">{c.name}</span>
            <div className="chart-bar-track">
              <div
                className={`chart-bar-fill ${c.isWinner ? "winner-fill" : ""}`}
                style={{ width: `${c.percentage}%` }}
              />
            </div>
            <span className="chart-value">
              {c.voteCount} ({c.percentage}%)
            </span>
          </div>
        ))}
      </div>

      {/* Candidate cards */}
      <h3 className="section-title">Detailed Results</h3>
      <CandidateList candidates={candidates} showVotes disabled />

      {/* Transparency note */}
      <div className="transparency-note">
        <span>🔍</span>
        <p>
          All votes are permanently recorded on the Ethereum blockchain and publicly
          verifiable. Vote commitments use ZK-SNARKs to protect voter privacy.
        </p>
      </div>
    </div>
  );
};

export default Results;