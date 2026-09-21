import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import CandidateList from "../../components/CandidateList";
import CountdownTimer from "../../components/CountdownTimer";
import { electionAPI, candidateAPI, voteAPI } from "../../utils/api";
import { useAuth } from "../../App";
import { trackVote } from "../../utils/tracker";

export default function VoteCasting() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState({});
  const [positions, setPositions] = useState([]);
  const [currentPositionIdx, setCurrentPositionIdx] = useState(0);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("voting"); // voting | confirm | success
  const [voteResult, setVoteResult] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    loadElection();
  }, [electionId]);

  const loadElection = async () => {
    setLoading(true);
    try {
      const [elRes, votedRes] = await Promise.all([
        electionAPI.getById(electionId),
        voteAPI.hasVoted(electionId),
      ]);

      if (votedRes.data.has_voted) {
        setAlreadyVoted(true);
        setLoading(false);
        return;
      }

      const el = elRes.data.election;
      setElection(el);
      const posArr = Array.isArray(el.positions) ? el.positions : [];
      setPositions(posArr);

      // Load candidates per position
      const candRes = await candidateAPI.getByElection(electionId);
      const grouped = candRes.data.grouped_by_position || {};
      setCandidates(grouped);
    } catch (err) {
      toast.error("Failed to load election");
      navigate("/user/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const currentPosition = positions[currentPositionIdx];
  const currentCandidates = candidates[currentPosition?.position_name] || [];
  const currentSelected = selections[currentPosition?.position_name] || [];

  const handleSelect = (ids) => {
    setSelections((prev) => ({
      ...prev,
      [currentPosition.position_name]: ids,
    }));
  };

  const handleNext = () => {
    if (currentSelected.length === 0) {
      return toast.error("Please select at least one candidate");
    }
    if (currentPositionIdx < positions.length - 1) {
      setCurrentPositionIdx((i) => i + 1);
    } else {
      setStep("confirm");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const votes = Object.entries(selections).map(([position_name, candidate_ids]) => ({
        position_name,
        candidate_ids,
      }));

      const walletAddress = user?.wallet_address || null;
      const res = await voteAPI.cast({ election_id: electionId, votes, wallet_address: walletAddress });

      setVoteResult(res.data);
      setStep("success");
      trackVote(electionId, votes.length);
      toast.success("Vote cast successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cast vote");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading election...</p>
        </div>
      </div>
    );
  }

  if (alreadyVoted) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center page-enter">
          <div className="card">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="font-display text-2xl font-bold text-white mb-3">Already Voted</h2>
            <p className="text-slate-400 mb-6">You have already cast your vote in this election.</p>
            <button onClick={() => navigate("/user/vote-history")} className="btn-primary px-8 py-3">
              View Vote History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === "success") {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center page-enter">
          <div className="card">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Vote Cast!</h2>
            <p className="text-slate-400 mb-6">Your vote has been securely recorded on the blockchain.</p>

            <div className="bg-slate-800 rounded-xl p-4 mb-6 text-left space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">Vote Hash</p>
                <p className="font-mono text-xs text-indigo-400 break-all">{voteResult?.vote_hash}</p>
              </div>
              {voteResult?.ipfs_cid && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">IPFS CID</p>
                  <p className="font-mono text-xs text-emerald-400 break-all">{voteResult.ipfs_cid}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Save your vote hash to verify your vote on the blockchain at any time.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/user/vote-history")}
                className="btn-primary w-full py-3"
              >
                View Vote History
              </button>
              <button
                onClick={() => navigate("/user/dashboard")}
                className="btn-secondary w-full py-3"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm screen
  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8 page-enter">
          <div className="card">
            <h2 className="font-display text-2xl font-bold text-white mb-2">Confirm Your Vote</h2>
            <p className="text-slate-400 text-sm mb-6">
              ⚠️ Once submitted, your vote cannot be changed. Please review carefully.
            </p>

            <div className="space-y-4 mb-8">
              {Object.entries(selections).map(([positionName, candidateIds]) => {
                const positionCandidates = candidates[positionName] || [];
                const chosen = positionCandidates.filter((c) => candidateIds.includes(c.id));
                return (
                  <div key={positionName} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <p className="text-xs text-slate-400 mb-2">{positionName}</p>
                    {chosen.map((c) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {c.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{c.name}</p>
                          {c.party && <p className="text-xs text-slate-400">{c.party}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep("voting"); setCurrentPositionIdx(0); }} className="btn-secondary flex-1 py-3">
                ← Review
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-3">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : "Submit Vote ✓"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Voting screen
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 page-enter">
        {/* Election header */}
        <div className="card mb-6 bg-gradient-to-r from-indigo-900/30 to-slate-800/30 border-indigo-700/30">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-xl font-bold text-white mb-1">{election?.name}</h1>
              {election?.description && (
                <p className="text-sm text-slate-400">{election.description}</p>
              )}
            </div>
            {election?.end_date && (
              <CountdownTimer targetDate={election.end_date} label="Closes in" />
            )}
          </div>
        </div>

        {/* Position progress */}
        <div className="flex items-center gap-2 mb-6">
          {positions.map((pos, i) => (
            <React.Fragment key={pos.position_name}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  i === currentPositionIdx
                    ? "bg-indigo-600 text-white"
                    : selections[pos.position_name]
                    ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {selections[pos.position_name] && i !== currentPositionIdx && "✓ "}
                {pos.position_name}
              </div>
              {i < positions.length - 1 && (
                <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Position voting */}
        {currentPosition && (
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold text-white">{currentPosition.position_name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {currentPosition.voting_type === "SINGLE"
                    ? "Select one candidate"
                    : `Select up to ${currentPosition.number_of_winners || currentCandidates.length}`}
                </p>
              </div>
              <span className="badge-blue">{currentPosition.voting_type || "SINGLE"}</span>
            </div>

            <CandidateList
              candidates={currentCandidates}
              selected={currentSelected}
              onSelect={handleSelect}
              votingType={currentPosition.voting_type || "SINGLE"}
              maxSelections={currentPosition.number_of_winners || 1}
            />

            <div className="flex gap-3 mt-6">
              {currentPositionIdx > 0 && (
                <button onClick={() => setCurrentPositionIdx((i) => i - 1)} className="btn-secondary px-6 py-2.5">
                  ← Previous
                </button>
              )}
              <button onClick={handleNext} className="btn-primary flex-1 py-2.5">
                {currentPositionIdx < positions.length - 1 ? "Next Position →" : "Review & Confirm →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}