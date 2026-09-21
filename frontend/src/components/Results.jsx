import React from "react";

function ProgressBar({ value, max, color = "indigo" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-700 rounded-full h-2">
        <div
          className={`${colors[color] || colors.indigo} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function Results({ results = [], totalVoters = 0 }) {
  const colors = ["emerald", "indigo", "amber", "rose"];

  if (!results.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="font-medium">No results available yet</p>
        <p className="text-sm mt-1">Results will appear after the election ends</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {results.map((posResult) => (
        <div key={posResult.position_name} className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">{posResult.position_name}</h3>
            <div className="flex items-center gap-3">
              <span className="badge-blue">{posResult.voting_type}</span>
              <span className="text-sm text-slate-400">
                {posResult.total_votes} votes
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {(posResult.candidates || []).map((candidate, idx) => {
              const isWinner = posResult.winners?.some((w) => w.id === candidate.id);
              const colorKey = colors[idx % colors.length];
              return (
                <div
                  key={candidate.id}
                  className={`p-4 rounded-xl transition-all ${
                    isWinner
                      ? "bg-emerald-900/20 border border-emerald-700/40"
                      : "bg-slate-800/50 border border-slate-700/50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {/* Rank */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isWinner
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Photo */}
                    {candidate.photo_url ? (
                      <img
                        src={candidate.photo_url.startsWith("/") ? `http://localhost:5000${candidate.photo_url}` : candidate.photo_url}
                        alt={candidate.name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-slate-600"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {candidate.name?.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white">{candidate.name}</span>
                        {isWinner && (
                          <span className="badge-green text-[10px]">
                            🏆 Winner
                          </span>
                        )}
                        {candidate.party && (
                          <span className="text-xs text-slate-400">{candidate.party}</span>
                        )}
                      </div>
                    </div>

                    <span className="text-sm font-semibold text-white font-mono">
                      {candidate.vote_count || 0}
                    </span>
                  </div>
                  <ProgressBar
                    value={candidate.vote_count || 0}
                    max={posResult.total_votes}
                    color={isWinner ? "emerald" : colorKey}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}