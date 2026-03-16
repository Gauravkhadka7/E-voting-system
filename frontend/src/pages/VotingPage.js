import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getReadOnlyContract,
  getElection,
  getCandidates,
  isVoterRegistered,
  hasVoted,
  getAllElections,
} from "../utils/contract";
import Vote from "../components/Vote";

const VotingPage = ({ account, signer }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const preselectedId = params.get("election");

  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(
    preselectedId ? parseInt(preselectedId) : null
  );
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [voterStatus, setVoterStatus] = useState({ isRegistered: false, hasVoted: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voteDone, setVoteDone] = useState(false);
  const [blockchainReady, setBlockchainReady] = useState(false);

  // Load all elections safely on mount
  useEffect(() => {
    const loadElections = async () => {
      try {
        const contract = getReadOnlyContract();
        const data = await getAllElections(contract);
        setElections(data);
        setBlockchainReady(true);
      } catch (err) {
        console.error("Could not load elections:", err.message);
        setBlockchainReady(false);
      }
    };
    loadElections();
  }, [account]);

  // Load selected election details
  useEffect(() => {
    if (!selectedElectionId) return;
    loadElectionDetails(selectedElectionId);
  }, [selectedElectionId, account]);

  const loadElectionDetails = async (id) => {
    setLoading(true);
    setError("");
    try {
      const contract = getReadOnlyContract();
      const [electionData, candidatesData] = await Promise.all([
        getElection(contract, id),
        getCandidates(contract, id),
      ]);
      setElection(electionData);
      setCandidates(candidatesData);

      if (account) {
        const [registered, voted] = await Promise.all([
          isVoterRegistered(contract, id, account),
          hasVoted(contract, id, account),
        ]);
        setVoterStatus({ isRegistered: registered, hasVoted: voted });
        if (voted) setVoteDone(true);
      }
    } catch (err) {
      setError("Failed to load election data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleElectionSelect = (id) => {
    setSelectedElectionId(parseInt(id));
    setVoteDone(false);
    setElection(null);
    setError("");
    navigate("/vote?election=" + id);
  };

  const now = Date.now();
  const isActive =
    election &&
    election.isActive &&
    election.startTime <= now &&
    election.endTime >= now;

  // No wallet connected
  if (!account) {
    return (
      <div className="voting-page">
        <div className="page-header">
          <h1 className="page-title">Cast Your Vote</h1>
        </div>
        <div className="empty-state centered">
          <span className="empty-icon">🦊</span>
          <h2>Connect Your Wallet</h2>
          <p>Click <strong>"Connect Wallet"</strong> in the top-right navbar to get started.</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            MetaMask must be installed in your browser.
          </p>
        </div>
      </div>
    );
  }

  // Wallet connected but blockchain not reachable
  if (!blockchainReady && !loading) {
    return (
      <div className="voting-page">
        <div className="page-header">
          <h1 className="page-title">Cast Your Vote</h1>
        </div>
        <div className="alert alert-warning" style={{ marginTop: "2rem" }}>
          <span>⚠️</span>
          <div>
            <strong>Blockchain not reachable.</strong>
            <p style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>Please check:</p>
            <ul style={{ marginTop: "0.4rem", paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: "2" }}>
              <li>Hardhat node is running: <code>npx hardhat node</code></li>
              <li>Contract is deployed: <code>npx hardhat run scripts/deploy.js --network localhost</code></li>
              <li>MetaMask is on <strong>Localhost 8545</strong> (Chain ID: 1337)</li>
              <li><code>REACT_APP_CONTRACT_ADDRESS</code> is set in <code>.env</code></li>
            </ul>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: "0.75rem" }}
              onClick={() => window.location.reload()}
            >
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-page">
      <div className="page-header">
        <h1 className="page-title">Cast Your Vote</h1>
        <p className="page-subtitle">
          Your vote is protected by zero-knowledge proofs and stored immutably on Ethereum.
        </p>
      </div>

      {elections.length > 0 && (
        <div className="election-selector">
          <label htmlFor="election-select" className="selector-label">
            Select Election
          </label>
          <select
            id="election-select"
            className="selector-input"
            value={selectedElectionId || ""}
            onChange={(e) => handleElectionSelect(e.target.value)}
          >
            <option value="">— Choose an election —</option>
            {elections.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {e.isActive ? "🟢" : "⚫"}
              </option>
            ))}
          </select>
        </div>
      )}

      {elections.length === 0 && blockchainReady && !loading && (
        <div className="alert alert-info">
          <span>ℹ️</span>
          <p>No elections created yet. Ask an admin to create one.</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      {loading && (
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading election data from blockchain...</p>
        </div>
      )}

      {!loading && selectedElectionId && election && (
        <>
          <div className="election-banner">
            <div className="election-banner-info">
              <h2>{election.name}</h2>
              <p>{election.description}</p>
              <div className="banner-meta">
                <span>📅 Start: {new Date(election.startTime).toLocaleString()}</span>
                <span>🏁 End: {new Date(election.endTime).toLocaleString()}</span>
                <span>🗳️ Votes cast: {election.totalVotes}</span>
              </div>
            </div>
            <div className={"election-status-tag " + (isActive ? "active" : "inactive")}>
              {isActive ? "🟢 Voting Open" : "⚫ Voting Closed"}
            </div>
          </div>

          {!voterStatus.isRegistered && (
            <div className="alert alert-warning">
              <span>⚠️</span>
              <p>You are not registered for this election. Contact the election administrator.</p>
            </div>
          )}

          {voterStatus.hasVoted || voteDone ? (
            <div className="vote-success">
              <div className="success-icon">✅</div>
              <h2>Vote Already Cast</h2>
              <p>You have successfully voted in this election.</p>
              <button
                className="btn btn-outline"
                onClick={() => navigate("/results?election=" + selectedElectionId)}
              >
                View Results →
              </button>
            </div>
          ) : !isActive ? (
            <div className="alert alert-info">
              <span>ℹ️</span>
              <div>
                <p>
                  {now < election.startTime
                    ? "Voting opens on " + new Date(election.startTime).toLocaleString()
                    : "This election has ended."}
                </p>
                {now > election.endTime && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => navigate("/results?election=" + selectedElectionId)}
                  >
                    View Results
                  </button>
                )}
              </div>
            </div>
          ) : voterStatus.isRegistered ? (
            <Vote
              election={election}
              candidates={candidates}
              account={account}
              signer={signer}
              onVoteCast={() => setVoteDone(true)}
            />
          ) : null}
        </>
      )}

      {!loading && !selectedElectionId && blockchainReady && (
        <div className="empty-state centered">
          <span className="empty-icon">📋</span>
          <h3>Select an Election Above</h3>
          <p>Choose an election from the dropdown to see candidates and cast your vote.</p>
        </div>
      )}
    </div>
  );
};

export default VotingPage;