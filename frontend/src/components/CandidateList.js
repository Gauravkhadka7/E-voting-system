import React from "react";
import { getIPFSUrl } from "../utils/ipfs";

const CandidateList = ({ candidates, selectedCandidate, onSelect, disabled, showVotes }) => {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🗳️</span>
        <p>No candidates found for this election.</p>
      </div>
    );
  }

  const totalVotes = candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);

  return (
    <div className="candidate-list">
      {candidates.map((candidate) => {
        const isSelected = selectedCandidate === candidate.id;
        const votePercent =
          totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : 0;

        return (
          <div
            key={candidate.id}
            className={`candidate-card ${isSelected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
            onClick={() => !disabled && onSelect && onSelect(candidate.id)}
            role={onSelect ? "button" : "article"}
            tabIndex={onSelect && !disabled ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !disabled && onSelect) onSelect(candidate.id);
            }}
            aria-pressed={isSelected}
          >
            {/* Avatar / Photo */}
            <div className="candidate-avatar">
              {candidate.ipfsHash ? (
                <img
                  src={getIPFSUrl(candidate.ipfsHash)}
                  alt={candidate.name}
                  className="avatar-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div className="avatar-fallback" style={candidate.ipfsHash ? { display: "none" } : {}}>
                {candidate.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div className="candidate-info">
              <h3 className="candidate-name">{candidate.name}</h3>
              <p className="candidate-party">
                <span className="party-dot" />
                {candidate.party}
              </p>

              {/* Vote bar (results mode) */}
              {showVotes && (
                <div className="vote-bar-container">
                  <div className="vote-bar-track">
                    <div
                      className="vote-bar-fill"
                      style={{ width: `${votePercent}%` }}
                    />
                  </div>
                  <span className="vote-stats">
                    {candidate.voteCount} vote{candidate.voteCount !== 1 ? "s" : ""} —{" "}
                    {votePercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Selection indicator */}
            {onSelect && (
              <div className="candidate-selector">
                <div className={`radio-circle ${isSelected ? "checked" : ""}`}>
                  {isSelected && <span className="radio-dot" />}
                </div>
              </div>
            )}

            {/* Winner badge */}
            {showVotes && candidate.isWinner && (
              <div className="winner-badge">🏆 Winner</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CandidateList;