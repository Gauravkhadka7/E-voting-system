import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { voteAPI } from "../../utils/api";
import toast from "react-hot-toast";

export default function VoteHistory() {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [hashInput, setHashInput] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await voteAPI.getHistory();
      setVotes(res.data.votes || []);
    } catch {
      toast.error("Failed to load vote history");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (hash) => {
    setVerifying(hash);
    setVerifyResult(null);
    try {
      const res = await voteAPI.verify(hash);
      setVerifyResult(res.data);
      if (res.data.verified) {
        toast.success("Vote verified on blockchain!");
      } else {
        toast.error("Vote hash not found");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 page-enter">
        <h1 className="section-title">Vote History</h1>

        {/* Verify by hash */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-2">Verify a Vote</h2>
          <p className="text-sm text-slate-400 mb-4">Enter any vote hash to verify it on the blockchain.</p>
          <div className="flex gap-3 flex-wrap">
            <input
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              className="input-field flex-1 font-mono text-sm"
              placeholder="Enter vote hash..."
            />
            <button
              onClick={() => hashInput && handleVerify(hashInput)}
              disabled={!hashInput || verifying === hashInput}
              className="btn-primary px-6 py-3"
            >
              {verifying === hashInput ? "Verifying..." : "Verify"}
            </button>
          </div>
          {verifyResult && (
            <div className={`mt-4 p-4 rounded-xl ${verifyResult.verified ? "bg-emerald-900/20 border border-emerald-700/40" : "bg-red-900/20 border border-red-700/40"}`}>
              {verifyResult.verified ? (
                <div className="space-y-1 text-sm">
                  <p className="text-emerald-400 font-medium">✓ Vote Verified</p>
                  <p className="text-slate-300">Election: {verifyResult.election_name}</p>
                  <p className="text-slate-300">Position: {verifyResult.position_name}</p>
                  <p className="text-slate-300">Cast at: {new Date(verifyResult.cast_at).toLocaleString()}</p>
                  {verifyResult.blockchain_verified && (
                    <p className="text-indigo-400">⛓️ Blockchain verified</p>
                  )}
                  {verifyResult.ipfs_cid && (
                    <p className="text-slate-400 font-mono text-xs">IPFS: {verifyResult.ipfs_cid}</p>
                  )}
                </div>
              ) : (
                <p className="text-red-400 text-sm">✗ Vote hash not found in database</p>
              )}
            </div>
          )}
        </div>

        {/* Vote list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card space-y-3">
                <div className="skeleton h-5 w-1/2 rounded" />
                <div className="skeleton h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : votes.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-white mb-2">No Votes Yet</h3>
            <p className="text-slate-400 text-sm">Your voting history will appear here after you vote.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {votes.map((vote, idx) => (
              <div key={idx} className="card hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-white">{vote.election_name}</h3>
                      <span className={`badge ${vote.election_status === "ACTIVE" ? "badge-green" : "badge-gray"}`}>
                        {vote.election_status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-1">Position: {vote.position_name}</p>
                    <p className="text-xs text-slate-500">
                      Voted on {new Date(vote.cast_at).toLocaleString()}
                    </p>
                    <p className="font-mono text-xs text-indigo-400 mt-2 truncate max-w-xs">
                      Hash: {vote.vote_hash?.slice(0, 24)}...
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className="badge-green">✓ Recorded</span>
                    <button
                      onClick={() => handleVerify(vote.vote_hash)}
                      disabled={verifying === vote.vote_hash}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {verifying === vote.vote_hash ? "Verifying..." : "Verify"}
                    </button>
                    {vote.blockchain_tx && (
                      <span className="text-xs text-slate-500 font-mono">⛓️ On-chain</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}