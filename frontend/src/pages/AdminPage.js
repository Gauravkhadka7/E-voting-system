import React, { useState, useEffect } from "react";
import {
  getReadOnlyContract,
  getContract,
  getAllElections,
  createElection,
  addCandidate,
  registerVoters,
  setElectionStatus,
} from "../utils/contract";
import { uploadJSONToIPFS } from "../utils/ipfs";

const ADMIN_ADDRESS = process.env.REACT_APP_ADMIN_ADDRESS || "";

const AdminPage = ({ account, signer }) => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });
  const [activeTab, setActiveTab] = useState("elections");

  // New Election form
  const [electionForm, setElectionForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  // Add Candidate form
  const [candidateForm, setCandidateForm] = useState({
    electionId: "",
    name: "",
    party: "",
    bio: "",
  });

  // Register Voters form
  const [voterForm, setVoterForm] = useState({ electionId: "", addresses: "" });

  const isAdmin =
    !ADMIN_ADDRESS ||
    (account && account.toLowerCase() === ADMIN_ADDRESS.toLowerCase());

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      const c = getReadOnlyContract();
      const data = await getAllElections(c);
      setElections(data);
    } catch (err) {
      console.error("Failed to load elections:", err.message);
    }
  };

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback({ type: "", msg: "" }), 5000);
  };

  // ─── Create Election ──────────────────────────────────────────────────────
  const handleCreateElection = async (e) => {
    e.preventDefault();
    if (!signer) return showFeedback("error", "Please connect your wallet.");

    setLoading(true);
    try {
      const startTs = Math.floor(new Date(electionForm.startDate).getTime() / 1000);
      const endTs = Math.floor(new Date(electionForm.endDate).getTime() / 1000);
      const c = getContract(signer);
      await createElection(c, electionForm.name, electionForm.description, startTs, endTs);
      showFeedback("success", `Election "${electionForm.name}" created successfully!`);
      setElectionForm({ name: "", description: "", startDate: "", endDate: "" });
      await loadElections();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Add Candidate ────────────────────────────────────────────────────────
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!signer) return showFeedback("error", "Please connect your wallet.");

    setLoading(true);
    try {
      // Upload metadata to IPFS
      let ipfsHash = "";
      try {
        ipfsHash = await uploadJSONToIPFS({
          name: candidateForm.name,
          party: candidateForm.party,
          bio: candidateForm.bio,
        });
      } catch {
        ipfsHash = "QmPlaceholder";
      }

      const c = getContract(signer);
      await addCandidate(c, candidateForm.electionId, candidateForm.name, candidateForm.party, ipfsHash);
      showFeedback("success", `Candidate "${candidateForm.name}" added!`);
      setCandidateForm({ electionId: "", name: "", party: "", bio: "" });
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Register Voters ──────────────────────────────────────────────────────
  const handleRegisterVoters = async (e) => {
    e.preventDefault();
    if (!signer) return showFeedback("error", "Please connect your wallet.");

    setLoading(true);
    try {
      const addresses = voterForm.addresses
        .split(/[\n,]+/)
        .map((a) => a.trim())
        .filter((a) => a.startsWith("0x") && a.length === 42);

      if (addresses.length === 0) {
        return showFeedback("error", "No valid Ethereum addresses found.");
      }

      const c = getContract(signer);
      await registerVoters(c, voterForm.electionId, addresses);
      showFeedback("success", `${addresses.length} voter(s) registered successfully!`);
      setVoterForm({ electionId: "", addresses: "" });
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Toggle Election Status ───────────────────────────────────────────────
  const handleToggleStatus = async (election) => {
    if (!signer) return showFeedback("error", "Please connect your wallet.");
    setLoading(true);
    try {
      const c = getContract(signer);
      await setElectionStatus(c, election.id, !election.isActive);
      showFeedback("success", `Election "${election.name}" ${!election.isActive ? "activated" : "deactivated"}.`);
      await loadElections();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="admin-page">
        <div className="empty-state centered">
          <span className="empty-icon">🔒</span>
          <h2>Admin Access Required</h2>
          <p>Connect your admin wallet to access this panel.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="alert alert-error centered">
          <span>🚫</span>
          <h2>Access Denied</h2>
          <p>Your wallet address does not have admin privileges.</p>
          <p className="mono">{account}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle mono">{account}</p>
      </div>

      {feedback.msg && (
        <div className={`alert alert-${feedback.type}`}>
          {feedback.type === "success" ? "✅" : "⚠️"} {feedback.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        {["elections", "candidates", "voters", "manage"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "elections" && "🗳️ New Election"}
            {tab === "candidates" && "👤 Add Candidate"}
            {tab === "voters" && "📋 Register Voters"}
            {tab === "manage" && "⚙️ Manage Elections"}
          </button>
        ))}
      </div>

      {/* ── Create Election ─────────────────────────────────────────────────── */}
      {activeTab === "elections" && (
        <div className="admin-form-panel">
          <h2>Create New Election</h2>
          <form className="admin-form" onSubmit={handleCreateElection}>
            <div className="form-group">
              <label>Election Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Presidential Election 2025"
                value={electionForm.name}
                onChange={(e) => setElectionForm({ ...electionForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Brief description of the election..."
                value={electionForm.description}
                onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={electionForm.startDate}
                  onChange={(e) => setElectionForm({ ...electionForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={electionForm.endDate}
                  onChange={(e) => setElectionForm({ ...electionForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Creating...</> : "Create Election"}
            </button>
          </form>
        </div>
      )}

      {/* ── Add Candidate ───────────────────────────────────────────────────── */}
      {activeTab === "candidates" && (
        <div className="admin-form-panel">
          <h2>Add Candidate</h2>
          <form className="admin-form" onSubmit={handleAddCandidate}>
            <div className="form-group">
              <label>Election *</label>
              <select
                className="form-input"
                value={candidateForm.electionId}
                onChange={(e) => setCandidateForm({ ...candidateForm, electionId: e.target.value })}
                required
              >
                <option value="">— Select election —</option>
                {elections.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Candidate Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Full name"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Party / Affiliation *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Political party or affiliation"
                value={candidateForm.party}
                onChange={(e) => setCandidateForm({ ...candidateForm, party: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Bio (stored on IPFS)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Short biography..."
                value={candidateForm.bio}
                onChange={(e) => setCandidateForm({ ...candidateForm, bio: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Adding...</> : "Add Candidate"}
            </button>
          </form>
        </div>
      )}

      {/* ── Register Voters ─────────────────────────────────────────────────── */}
      {activeTab === "voters" && (
        <div className="admin-form-panel">
          <h2>Register Voters</h2>
          <form className="admin-form" onSubmit={handleRegisterVoters}>
            <div className="form-group">
              <label>Election *</label>
              <select
                className="form-input"
                value={voterForm.electionId}
                onChange={(e) => setVoterForm({ ...voterForm, electionId: e.target.value })}
                required
              >
                <option value="">— Select election —</option>
                {elections.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Voter Addresses *</label>
              <textarea
                className="form-input mono"
                rows={6}
                placeholder={"0xAbc123...\n0xDef456...\n(one per line or comma-separated)"}
                value={voterForm.addresses}
                onChange={(e) => setVoterForm({ ...voterForm, addresses: e.target.value })}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Registering...</> : "Register Voters"}
            </button>
          </form>
        </div>
      )}

      {/* ── Manage Elections ────────────────────────────────────────────────── */}
      {activeTab === "manage" && (
        <div className="admin-form-panel">
          <h2>Manage Elections</h2>
          {elections.length === 0 ? (
            <div className="empty-state">
              <p>No elections created yet.</p>
            </div>
          ) : (
            <div className="manage-list">
              {elections.map((e) => (
                <div key={e.id} className="manage-row">
                  <div className="manage-info">
                    <span className={`status-dot ${e.isActive ? "active" : "inactive"}`} />
                    <div>
                      <strong>{e.name}</strong>
                      <p className="manage-meta">
                        ID: {e.id} · {e.totalVotes} votes ·{" "}
                        {new Date(e.startTime).toLocaleDateString()} –{" "}
                        {new Date(e.endTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    className={`btn btn-sm ${e.isActive ? "btn-danger" : "btn-success"}`}
                    onClick={() => handleToggleStatus(e)}
                    disabled={loading}
                  >
                    {e.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;