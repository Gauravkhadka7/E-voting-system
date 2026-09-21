import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend
} from "recharts";
import api from "../../utils/api";

/* ── palette ─────────────────────────────────────────────────────────────── */
const COLORS = ["#00e5a0", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

/* ── tiny helpers ────────────────────────────────────────────────────────── */
const fmt = (n) => Number(n).toLocaleString();
const pct = (part, total) => (total ? ((part / total) * 100).toFixed(1) : "0.0");

/* ── custom tooltip for bar chart ────────────────────────────────────────── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "#0f1923", border: "1px solid #1e3a2f",
      borderRadius: 10, padding: "12px 18px", boxShadow: "0 8px 32px #00000088"
    }}>
      <p style={{ color: "#00e5a0", fontFamily: "'DM Mono', monospace", fontSize: 13, margin: 0 }}>{d.name}</p>
      {d.party && <p style={{ color: "#6b8f7a", fontSize: 11, margin: "2px 0 6px" }}>{d.party}</p>}
      <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>{fmt(d.voteCount)} <span style={{ fontSize: 12, color: "#6b8f7a" }}>votes</span></p>
      <p style={{ color: "#00e5a0", fontSize: 12, margin: "4px 0 0" }}>{pct(d.voteCount, d._total)}%</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ElectionResults() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]     = useState(null);
  const [part, setPart]     = useState(null);
  const [receipts, setRec]  = useState([]);
  const [loading, setLoad]  = useState(true);
  const [tab, setTab]       = useState("chart");   // chart | table | audit
  const [err, setErr]       = useState("");

  const load = useCallback(async () => {
    try {
      setLoad(true);
      const [rRes, pRes, auditRes] = await Promise.all([
        api.get(`/admin/elections/${id}/results`),
        api.get(`/admin/elections/${id}/participation`),
        api.get(`/elections/${id}/audit?limit=50`),
      ]);
      setData(rRes.data.data);
      setPart(pRes.data.data);
      setRec(auditRes.data.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load results.");
    } finally {
      setLoad(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* ── derived ────────────────────────────────────────────────────────────── */
  const results   = data?.results || [];
  const total     = data?.totalVotes || 0;
  const winner    = data?.winner;
  const election  = data?.election;

  const chartData = results.map((r) => ({ ...r, _total: total }));
  const pieData   = results.map((r) => ({ name: r.name, value: r.voteCount }));

  /* ── status badge ────────────────────────────────────────────────────────── */
  const statusColor = { active: "#00e5a0", ended: "#f59e0b", draft: "#6b8f7a" };

  /* ══════════════════════════════════════════════════════════════════════════ */
  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.page}>
      {/* ── grid background ──────────────────────────────────────────────── */}
      <div style={styles.gridBg} />

      {/* ── top bar ──────────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <span style={{ fontSize: 18 }}>←</span> Back
        </button>
        <div>
          <p style={styles.eyebrow}>Election Results</p>
          <h1 style={styles.title}>{election?.title || "—"}</h1>
        </div>
        <span style={{
          ...styles.statusBadge,
          background: (statusColor[election?.status] || "#6b8f7a") + "22",
          color: statusColor[election?.status] || "#6b8f7a",
          border: `1px solid ${statusColor[election?.status] || "#6b8f7a"}44`,
        }}>
          {election?.status?.toUpperCase()}
        </span>
      </header>

      {err && <div style={styles.errBanner}>{err}</div>}

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div style={styles.kpiRow}>
        <KpiCard label="Total Votes Cast" value={fmt(total)} accent="#00e5a0" />
        <KpiCard label="Assigned Voters"  value={fmt(part?.assignedVoters ?? "—")} accent="#3b82f6" />
        <KpiCard label="Participation"    value={part?.participation ?? "—"} accent="#f59e0b" />
        <KpiCard label="Candidates"       value={fmt(results.length)} accent="#a855f7" />
      </div>

      {/* ── winner banner ─────────────────────────────────────────────────── */}
      {winner && total > 0 && (
        <div style={styles.winnerBanner}>
          <div style={styles.winnerCrown}>👑</div>
          <div>
            <p style={styles.winnerLabel}>LEADING CANDIDATE</p>
            <p style={styles.winnerName}>{winner.name}</p>
          </div>
          <div style={styles.winnerRight}>
            <span style={styles.winnerCount}>{fmt(winner.voteCount)}</span>
            <span style={styles.winnerPct}>{pct(winner.voteCount, total)}%</span>
          </div>
        </div>
      )}

      {/* ── tabs ──────────────────────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        {["chart", "table", "audit"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...styles.tabBtn, ...(tab === t ? styles.tabActive : {}) }}>
            {t === "chart" ? "📊 Charts" : t === "table" ? "📋 Breakdown" : "🔍 Audit"}
          </button>
        ))}
      </div>

      {/* ── tab: charts ───────────────────────────────────────────────────── */}
      {tab === "chart" && (
        <div style={styles.chartsGrid}>
          {/* bar chart */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Vote Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a2f" />
                <XAxis dataKey="name" tick={{ fill: "#6b8f7a", fontSize: 11 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fill: "#6b8f7a", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="voteCount" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* pie chart */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Share of Votes</h3>
            {total > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend formatter={(v) => <span style={{ color: "#c0d4c8", fontSize: 12 }}>{v}</span>} />
                  <Tooltip formatter={(v) => [`${fmt(v)} votes`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={styles.empty}>No votes recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── tab: breakdown table ──────────────────────────────────────────── */}
      {tab === "table" && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Full Candidate Breakdown</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Rank", "Candidate", "Party", "Votes", "Share", "Progress"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const share = parseFloat(pct(r.voteCount, total));
                  return (
                    <tr key={r.id} style={{ ...styles.tr, ...(i === 0 && total > 0 ? styles.trWinner : {}) }}>
                      <td style={styles.td}>
                        <span style={{ ...styles.rank, background: COLORS[i % COLORS.length] + "33", color: COLORS[i % COLORS.length] }}>
                          {i === 0 && total > 0 ? "👑" : `#${i + 1}`}
                        </span>
                      </td>
                      <td style={styles.td}><span style={{ color: "#e2f0ea", fontWeight: 600 }}>{r.name}</span></td>
                      <td style={styles.td}><span style={{ color: "#6b8f7a", fontSize: 13 }}>{r.party || "—"}</span></td>
                      <td style={styles.td}><span style={{ color: "#00e5a0", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmt(r.voteCount)}</span></td>
                      <td style={styles.td}><span style={{ color: "#c0d4c8" }}>{share}%</span></td>
                      <td style={{ ...styles.td, minWidth: 140 }}>
                        <div style={styles.progressTrack}>
                          <div style={{ ...styles.progressBar, width: `${share}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── tab: audit ────────────────────────────────────────────────────── */}
      {tab === "audit" && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Audit Log <span style={{ fontSize: 12, color: "#6b8f7a", fontWeight: 400 }}>last 50 actions</span></h3>
          {receipts.length === 0 ? (
            <p style={styles.empty}>No audit entries yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {receipts.map((log, i) => (
                <div key={i} style={styles.auditRow}>
                  <span style={styles.auditAction}>{log.action}</span>
                  <span style={styles.auditActor}>{log.actor_name || "System"}</span>
                  <span style={styles.auditTime}>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────────────────── */
function KpiCard({ label, value, accent }) {
  return (
    <div style={{ ...styles.kpiCard, borderColor: accent + "33" }}>
      <p style={{ ...styles.kpiValue, color: accent }}>{value}</p>
      <p style={styles.kpiLabel}>{label}</p>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 20%, ${accent}0a 0%, transparent 70%)`, borderRadius: 14, pointerEvents: "none" }} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "#080f14", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: "3px solid #1e3a2f", borderTopColor: "#00e5a0", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#6b8f7a", fontFamily: "'DM Mono', monospace" }}>Loading results…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── styles ──────────────────────────────────────────────────────────────── */
const styles = {
  page: {
    minHeight: "100vh", background: "#080f14", padding: "0 0 60px",
    fontFamily: "'DM Sans', sans-serif", position: "relative", overflowX: "hidden",
  },
  gridBg: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `linear-gradient(#1e3a2f18 1px, transparent 1px), linear-gradient(90deg, #1e3a2f18 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
  },
  header: {
    position: "relative", zIndex: 1, display: "flex", alignItems: "center",
    gap: 20, padding: "28px 36px", borderBottom: "1px solid #1e3a2f",
    background: "linear-gradient(180deg, #0d1f17 0%, transparent 100%)",
  },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6, background: "#1e3a2f55",
    border: "1px solid #1e3a2f", color: "#6b8f7a", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, transition: "all .2s", flexShrink: 0,
  },
  eyebrow: { color: "#00e5a0", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" },
  title: { color: "#e2f0ea", fontSize: 26, fontWeight: 700, margin: 0, fontFamily: "'DM Sans', sans-serif" },
  statusBadge: { marginLeft: "auto", padding: "6px 14px", borderRadius: 20, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1, flexShrink: 0 },
  errBanner: { position: "relative", zIndex: 1, margin: "16px 36px 0", background: "#2d0f0f", border: "1px solid #ef444455", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 },
  kpiRow: { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, padding: "28px 36px 0" },
  kpiCard: { position: "relative", background: "#0d1f17", border: "1px solid", borderRadius: 14, padding: "22px 24px", overflow: "hidden" },
  kpiValue: { fontSize: 32, fontWeight: 800, fontFamily: "'DM Mono', monospace", margin: "0 0 4px" },
  kpiLabel: { color: "#6b8f7a", fontSize: 12, margin: 0, textTransform: "uppercase", letterSpacing: 1 },
  winnerBanner: {
    position: "relative", zIndex: 1, margin: "24px 36px 0",
    background: "linear-gradient(135deg, #00e5a011 0%, #00e5a005 100%)",
    border: "1px solid #00e5a033", borderRadius: 16, padding: "20px 28px",
    display: "flex", alignItems: "center", gap: 20,
  },
  winnerCrown: { fontSize: 36, flexShrink: 0 },
  winnerLabel: { color: "#00e5a0", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 2, margin: "0 0 4px" },
  winnerName: { color: "#e2f0ea", fontSize: 22, fontWeight: 700, margin: 0 },
  winnerRight: { marginLeft: "auto", textAlign: "right" },
  winnerCount: { display: "block", color: "#00e5a0", fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace" },
  winnerPct: { color: "#6b8f7a", fontSize: 14, fontFamily: "'DM Mono', monospace" },
  tabBar: { position: "relative", zIndex: 1, display: "flex", gap: 8, padding: "24px 36px 0" },
  tabBtn: {
    padding: "9px 20px", borderRadius: 8, border: "1px solid #1e3a2f",
    background: "transparent", color: "#6b8f7a", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, transition: "all .2s",
  },
  tabActive: { background: "#00e5a022", border: "1px solid #00e5a055", color: "#00e5a0" },
  chartsGrid: { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, padding: "20px 36px 0" },
  card: { position: "relative", zIndex: 1, background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 16, padding: "28px", margin: "20px 36px 0" },
  cardTitle: { color: "#e2f0ea", fontSize: 16, fontWeight: 600, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 },
  empty: { color: "#6b8f7a", textAlign: "center", padding: "40px 0", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { color: "#6b8f7a", fontWeight: 500, padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #1e3a2f", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  tr: { borderBottom: "1px solid #1e3a2f0a", transition: "background .15s" },
  trWinner: { background: "#00e5a00a" },
  td: { padding: "14px 16px", color: "#c0d4c8" },
  rank: { padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 },
  progressTrack: { height: 8, background: "#1e3a2f", borderRadius: 4, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 4, transition: "width 1s ease" },
  auditRow: {
    display: "flex", alignItems: "center", gap: 16, padding: "12px 16px",
    background: "#080f1488", borderRadius: 8, border: "1px solid #1e3a2f44",
    flexWrap: "wrap",
  },
  auditAction: { color: "#00e5a0", fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600 },
  auditActor: { color: "#c0d4c8", fontSize: 13 },
  auditTime: { marginLeft: "auto", color: "#6b8f7a", fontFamily: "'DM Mono', monospace", fontSize: 11 },
};