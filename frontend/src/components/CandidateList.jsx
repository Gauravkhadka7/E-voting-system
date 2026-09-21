import React from "react";

export default function CandidateList({
  candidates = [],
  selected = [],
  onSelect,
  votingType = "SINGLE",
  maxSelections = 1,
  disabled = false,
}) {
  const isSelected = (id) => selected.includes(id);

  const handleSelect = (id) => {
    if (disabled) return;
    if (votingType === "SINGLE") {
      onSelect([id]);
    } else {
      if (isSelected(id)) {
        onSelect(selected.filter((s) => s !== id));
      } else {
        if (selected.length < maxSelections) {
          onSelect([...selected, id]);
        }
      }
    }
  };

  if (!candidates.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">No candidates available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {candidates.map((candidate) => {
        const sel = isSelected(candidate.id);
        return (
          <button
            key={candidate.id}
            onClick={() => handleSelect(candidate.id)}
            disabled={disabled}
            className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
              sel
                ? "border-indigo-500 bg-indigo-600/10"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800"
            } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {/* Selection indicator */}
            <div
              className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                sel ? "border-indigo-500 bg-indigo-500" : "border-slate-600"
              }`}
            >
              {sel && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Photo */}
            <div className="flex items-center gap-3 mb-3">
              {candidate.photo_url ? (
                <img
                  src={candidate.photo_url.startsWith("/") ? `http://localhost:5000${candidate.photo_url}` : candidate.photo_url}
                  alt={candidate.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-600"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {candidate.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 pr-8">
                <h3 className="font-semibold text-white truncate">{candidate.name}</h3>
                {candidate.party && (
                  <p className="text-xs text-indigo-400 truncate">{candidate.party}</p>
                )}
                {candidate.symbol && (
                  <p className="text-xs text-slate-400 truncate">{candidate.symbol}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {candidate.bio && (
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{candidate.bio}</p>
            )}

            {/* Selected highlight */}
            {sel && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Selected
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}