import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import CountdownTimer from "../../components/CountdownTimer";
import { useAuth } from "../../App";
import { electionAPI, voteAPI } from "../../utils/api";
import toast from "react-hot-toast";

function ElectionCard({ election, hasVoted, onVote }) {
  const now = new Date();
  const start = new Date(election.start_date);
  const end = new Date(election.end_date);
  const isLive = now >= start && now <= end;
  const isUpcoming = now < start;

  return (
    <div className="card hover:border-indigo-500/30 transition-all duration-300">
      {election.banner_url && (
        <img src={election.banner_url} alt="" className="w-full h-32 object-cover rounded-lg mb-4" />
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-white text-lg leading-tight">{election.name}</h3>
        <span className={`badge flex-shrink-0 ${
          isLive ? "badge-green" : isUpcoming ? "badge-blue" : "badge-gray"
        }`}>
          {isLive ? "🔴 Live" : isUpcoming ? "⏳ Upcoming" : "Ended"}
        </span>
      </div>

      {election.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{election.description}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(election.start_date).toLocaleDateString()} – {new Date(election.end_date).toLocaleDateString()}
        </div>
        {isLive && (
          <CountdownTimer targetDate={election.end_date} label="Closes in" />
        )}
        {isUpcoming && (
          <CountdownTimer targetDate={election.start_date} label="Starts in" />
        )}
      </div>

      {isLive && !hasVoted ? (
        <Link to={`/user/vote/${election.id}`} className="btn-primary w-full text-center block py-2.5">
          Cast Your Vote →
        </Link>
      ) : isLive && hasVoted ? (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-sm text-emerald-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          You've voted in this election
        </div>
      ) : (
        <button disabled className="btn-secondary w-full py-2.5 opacity-50 cursor-not-allowed">
          {isUpcoming ? "Not started yet" : "Election ended"}
        </button>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-10 w-full rounded-lg mt-2" />
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [elections, setElections] = useState([]);
  const [votedMap, setVotedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [voteHistory, setVoteHistory] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [elRes, histRes] = await Promise.all([
        electionAPI.getAll({ status: "ACTIVE" }),
        voteAPI.getHistory(),
      ]);

      const electionList = elRes.data.elections || [];
      setElections(electionList);
      setVoteHistory(histRes.data.votes || []);

      // Check voted status for each election
      const votedIds = new Set((histRes.data.votes || []).map((v) => v.election_id));
      const map = {};
      electionList.forEach((e) => { map[e.id] = votedIds.has(e.id); });
      setVotedMap(map);
    } catch (err) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const pendingVotes = elections.filter(
    (e) => new Date() >= new Date(e.start_date) && new Date() <= new Date(e.end_date) && !votedMap[e.id]
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">

        {/* Welcome banner */}
        <div className="card bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-indigo-700/40 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">
                Welcome, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {user?.is_verified
                  ? "Your account is verified. You can vote in eligible elections."
                  : "⚠️ Your account is pending verification. Contact an admin."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!user?.is_verified && (
                <span className="badge-yellow px-3 py-1">Pending Verification</span>
              )}
              {user?.is_verified && (
                <span className="badge-green px-3 py-1">✓ Verified</span>
              )}
              <Link to="/user/profile" className="btn-secondary text-sm py-2">
                My Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Elections", value: elections.length, icon: "🗳️" },
            { label: "Votes Cast", value: voteHistory.length, icon: "✅" },
            { label: "Pending Votes", value: pendingVotes.length, icon: "⏳" },
            { label: "Account Role", value: user?.primary_role || "—", icon: "👤" },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Active Elections */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Active Elections</h2>
            <Link to="/user/vote-history" className="text-sm text-indigo-400 hover:underline">
              View Vote History →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : elections.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-5xl mb-4">🗳️</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Active Elections</h3>
              <p className="text-slate-400 text-sm">Check back later for upcoming elections.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elections.map((e) => (
                <ElectionCard
                  key={e.id}
                  election={e}
                  hasVoted={votedMap[e.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent votes */}
        {voteHistory.length > 0 && (
          <div>
            <h2 className="section-title">Recent Votes</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-700">
                    <tr>
                      <th className="table-header">Election</th>
                      <th className="table-header">Position</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voteHistory.slice(0, 5).map((v, i) => (
                      <tr key={i} className="table-row">
                        <td className="table-cell font-medium text-white">{v.election_name}</td>
                        <td className="table-cell">{v.position_name}</td>
                        <td className="table-cell">{new Date(v.cast_at).toLocaleDateString()}</td>
                        <td className="table-cell">
                          <span className="badge-green">Recorded</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}