import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";

/* ══════════════════════════════════════════════════════════════════════════ */
export default function CandidateDetails() {
  const { electionId } = useParams();
  const navigate = useNavigate();

  const [election,    setElection]   = useState(null);
  const [candidates,  setCandidates] = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [deleting,    setDeleting]   = useState(null);
  const [editTarget,  setEditTarget] = useState(null);   // candidate being edited
  const [editForm,    setEditForm]   = useState({});
  const [editLoading, setEditLoad]   = useState(false);
  const [err,         setErr]        = useState("");

  /* ── load ────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [eRes, cRes] = await Promise.all([
        api.get(`/elections/${electionId}`),
        api.get(`/elections/${electionId}/candidates`),
      ]);
      setElection(eRes.data.data);
      setCandidates(cRes.data.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => { load(); }, [load]);

  /* ── delete ──────────────────────────────────────────────────────────── */
  async function handleDelete(candidateId) {
    if (!window.confirm("Delete this candidate? This cannot be undone.")) return;
    try {
      setDeleting(candidateId);
      await api.delete(`/elections/${electionId}/candidates/${candidateId}`);
      setCandidates((cs) => cs.filter((c) => c.id !== candidateId));
    } catch (e) {
      setErr(e.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  /* ── open edit modal ─────────────────────────────────────────────────── */
  function openEdit(c) {
    setEditTarget(c);
    setEditForm({ name: c.name, party: c.party || "", bio: c.bio || "" });
    setErr("");
  }

  /* ── save edit ───────────────────────────────────────────────────────── */
  async function handleSaveEdit() {
    if (!editForm.name?.trim()) return setErr("Candidate name is required.");
    try {
      setEditLoad(true);
      const res = await api.put(`/elections/${electionId}/candidates/${editTarget.id}`, editForm);
      setCandidates((cs) => cs.map((c) => c.id === editTarget.id ? res.data.data : c));
      setEditTarget(null);
    } catch (e) {
      setErr(e.response?.data?.message || "Update failed.");
    } finally {
      setEditLoad(false);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={cd.page}>
      <div style={cd.bg} />

      {/* ── header ──────────────────────────────────────────────────── */}
      <div style={cd.header}>
        <button onClick={() => navigate(-1)} style={cd.backBtn}>← Back</button>
        <div style={{ flex: 1 }}>
          <p style={cd.eyebrow}>Election Management</p>
          <h1 style={cd.title}>Candidates</h1>
          {election && <p style={cd.sub}>{election.title}</p>}
        </div>
        <button onClick={() => navigate(`/admin/elections/${electionId}/add-candidate`)} style={cd.addBtn}>
          + Add Candidate
        </button>
      </div>

      {err && <div style={cd.errBanner} onClick={() => setErr("")}>{err} ✕</div>}

      {/* ── stats strip ─────────────────────────────────────────────── */}
      <div style={cd.statsStrip}>
        <StatPill label="Total Candidates" value={candidates.length} color="#00e5a0" />
        <StatPill label="Election Status"  value={election?.status || "—"} color={
          election?.status === "active" ? "#00e5a0" : election?.status === "ended" ? "#f59e0b" : "#6b8f7a"
        } />
        <StatPill label="Starts" value={election ? new Date(election.start_time).toLocaleDateString() : "—"} color="#3b82f6" />
        <StatPill label="Ends"   value={election ? new Date(election.end_time).toLocaleDateString() : "—"} color="#a855f7" />
      </div>

      {/* ── candidate grid ───────────────────────────────────────────── */}
      {loading ? (
        <div style={cd.loadWrap}><Spinner /><p style={{ color: "#6b8f7a", fontSize: 13 }}>Loading candidates…</p></div>
      ) : candidates.length === 0 ? (
        <EmptyState electionId={electionId} navigate={navigate} />
      ) : (
        <div style={cd.grid}>
          {candidates.map((c, i) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              index={i}
              onEdit={() => openEdit(c)}
              onDelete={() => handleDelete(c.id)}
              deleting={deleting === c.id}
            />
          ))}
        </div>
      )}

      {/* ── edit modal ───────────────────────────────────────────────── */}
      {editTarget && (
        <div style={cd.modalOverlay} onClick={() => setEditTarget(null)}>
          <div style={cd.modal} onClick={(e) => e.stopPropagation()}>
            <div style={cd.modalHeader}>
              <h2 style={cd.modalTitle}>Edit Candidate</h2>
              <button onClick={() => setEditTarget(null)} style={cd.closeBtn}>✕</button>
            </div>

            {/* photo preview */}
            <div style={cd.modalPhoto}>
              {editTarget.photo_path ? (
                <img src={`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/${editTarget.photo_path}`}
                  alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }} />
              ) : (
                <div style={cd.modalAvatar}>{editTarget.name.charAt(0).toUpperCase()}</div>
              )}
              <div>
                <p style={{ color: "#6b8f7a", fontSize: 12, margin: "0 0 2px" }}>Editing</p>
                <p style={{ color: "#e2f0ea", fontWeight: 600, margin: 0 }}>{editTarget.name}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <EditField label="Full Name *">
                <input style={cd.input} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </EditField>
              <EditField label="Party / Affiliation">
                <input style={cd.input} value={editForm.party} placeholder="Independent" onChange={(e) => setEditForm({ ...editForm, party: e.target.value })} />
              </EditField>
              <EditField label="Biography">
                <textarea style={{ ...cd.input, minHeight: 100, resize: "vertical" }} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
              </EditField>
            </div>

            {err && <div style={cd.errBox}>{err}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditTarget(null)} style={cd.ghostBtn}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={editLoading} style={cd.saveBtn}>
                {editLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CandidateCard ───────────────────────────────────────────────────────── */
const PALETTE = ["#00e5a0", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];

function CandidateCard({ candidate: c, index, onEdit, onDelete, deleting }) {
  const accent = PALETTE[index % PALETTE.length];
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  return (
    <div style={{ ...cd.card, "--accent": accent }}>
      {/* accent top stripe */}
      <div style={{ height: 4, background: accent, margin: "-24px -24px 20px", borderRadius: "14px 14px 0 0" }} />

      {/* photo + name */}
      <div style={cd.cardTop}>
        {c.photo_path ? (
          <img src={`${apiBase}/${c.photo_path}`} alt={c.name}
            style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", border: `2px solid ${accent}44` }} />
        ) : (
          <div style={{ ...cd.avatarCircle, background: accent + "22", color: accent, border: `2px solid ${accent}44` }}>
            {c.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={cd.candidateName}>{c.name}</p>
          {c.party && (
            <span style={{ ...cd.partyBadge, background: accent + "18", color: accent }}>
              {c.party}
            </span>
          )}
        </div>
      </div>

      {/* bio */}
      {c.bio && (
        <p style={cd.bioText}>{c.bio.length > 120 ? c.bio.slice(0, 117) + "…" : c.bio}</p>
      )}

      {/* meta */}
      <div style={cd.cardMeta}>
        <span style={cd.metaItem}>
          <span style={{ color: "#6b8f7a", fontSize: 11 }}>ID</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#3a4f45" }}>#{c.id.slice(0, 8)}</span>
        </span>
        <span style={cd.metaItem}>
          <span style={{ color: "#6b8f7a", fontSize: 11 }}>Added</span>
          <span style={{ fontSize: 11, color: "#3a4f45" }}>{new Date(c.created_at).toLocaleDateString()}</span>
        </span>
      </div>

      {/* actions */}
      <div style={cd.cardActions}>
        <button onClick={onEdit} style={cd.editBtn}>✏️ Edit</button>
        <button onClick={onDelete} disabled={deleting} style={cd.deleteBtn}>
          {deleting ? "…" : "🗑 Delete"}
        </button>
      </div>
    </div>
  );
}

/* ── smaller helpers ─────────────────────────────────────────────────────── */
function StatPill({ label, value, color }) {
  return (
    <div style={{ background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 10, padding: "12px 18px" }}>
      <p style={{ color: "#6b8f7a", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 4px" }}>{label}</p>
      <p style={{ color, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'DM Mono', monospace" }}>{value}</p>
    </div>
  );
}

function EditField({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", color: "#c0d4c8", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, border: "3px solid #1e3a2f", borderTopColor: "#00e5a0", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
    </>
  );
}

function EmptyState({ electionId, navigate }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <p style={{ fontSize: 52, margin: "0 0 16px" }}>🗳️</p>
      <p style={{ color: "#e2f0ea", fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>No Candidates Yet</p>
      <p style={{ color: "#6b8f7a", fontSize: 14, margin: "0 0 24px" }}>Add candidates so voters can make their choice.</p>
      <button onClick={() => navigate(`/admin/elections/${electionId}/add-candidate`)}
        style={{ background: "#00e5a0", color: "#050f0a", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, cursor: "pointer", fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
        + Add First Candidate
      </button>
    </div>
  );
}

/* ── styles ──────────────────────────────────────────────────────────────── */
const cd = {
  page: { minHeight: "100vh", background: "#080f14", fontFamily: "'DM Sans', sans-serif", position: "relative", paddingBottom: 60 },
  bg: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(#1e3a2f18 1px, transparent 1px), linear-gradient(90deg, #1e3a2f18 1px, transparent 1px)`, backgroundSize: "48px 48px" },
  header: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 16, padding: "28px 36px", borderBottom: "1px solid #1e3a2f" },
  backBtn: { background: "#1e3a2f55", border: "1px solid #1e3a2f", color: "#6b8f7a", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, flexShrink: 0 },
  eyebrow: { color: "#00e5a0", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 2px" },
  title: { color: "#e2f0ea", fontSize: 26, fontWeight: 700, margin: "0 0 2px" },
  sub: { color: "#6b8f7a", fontSize: 13, margin: 0 },
  addBtn: { background: "#00e5a0", color: "#050f0a", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 },
  errBanner: { position: "relative", zIndex: 1, margin: "12px 36px", background: "#2d0f0f", border: "1px solid #ef444455", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14, cursor: "pointer" },
  statsStrip: { position: "relative", zIndex: 1, display: "flex", gap: 12, padding: "20px 36px", flexWrap: "wrap" },
  grid: { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20, padding: "0 36px" },
  loadWrap: { textAlign: "center", padding: "80px 20px", position: "relative", zIndex: 1 },

  card: { background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 14, padding: "24px", display: "flex", flexDirection: "column", gap: 14, transition: "border-color .2s" },
  cardTop: { display: "flex", alignItems: "flex-start", gap: 14 },
  avatarCircle: { width: 64, height: 64, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 26, flexShrink: 0 },
  candidateName: { color: "#e2f0ea", fontWeight: 700, fontSize: 16, margin: "0 0 6px" },
  partyBadge: { padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 },
  bioText: { color: "#6b8f7a", fontSize: 13, lineHeight: 1.6, margin: 0 },
  cardMeta: { display: "flex", gap: 16, borderTop: "1px solid #1e3a2f", paddingTop: 12 },
  metaItem: { display: "flex", flexDirection: "column", gap: 2 },
  cardActions: { display: "flex", gap: 8 },
  editBtn: { flex: 1, background: "#1e3a2f55", border: "1px solid #1e3a2f", color: "#c0d4c8", borderRadius: 8, padding: "9px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  deleteBtn: { flex: 1, background: "#ef444411", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 8, padding: "9px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" },

  modalOverlay: { position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 20, padding: "32px", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { color: "#e2f0ea", fontSize: 20, fontWeight: 700, margin: 0 },
  closeBtn: { background: "none", border: "none", color: "#6b8f7a", fontSize: 20, cursor: "pointer", padding: "4px 8px" },
  modalPhoto: { display: "flex", alignItems: "center", gap: 14, background: "#080f14", border: "1px solid #1e3a2f", borderRadius: 12, padding: "14px 16px", marginBottom: 20 },
  modalAvatar: { width: 72, height: 72, borderRadius: 12, background: "#00e5a022", color: "#00e5a0", fontSize: 28, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  input: { width: "100%", background: "#080f14", border: "1px solid #1e3a2f", borderRadius: 10, padding: "11px 14px", color: "#e2f0ea", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" },
  errBox: { background: "#2d0f0f", border: "1px solid #ef444455", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginTop: 12 },
  ghostBtn: { flex: 1, background: "transparent", color: "#6b8f7a", border: "1px solid #1e3a2f", borderRadius: 10, padding: "11px", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
  saveBtn: { flex: 2, background: "#00e5a0", color: "#050f0a", border: "none", borderRadius: 10, padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
};