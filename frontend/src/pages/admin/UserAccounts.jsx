import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

/* ── role config ─────────────────────────────────────────────────────────── */
const ROLE_META = {
  superadmin: { label: "Super Admin", color: "#a855f7", bg: "#a855f711" },
  admin:      { label: "Admin",       color: "#3b82f6", bg: "#3b82f611" },
  voter:      { label: "Voter",       color: "#00e5a0", bg: "#00e5a011" },
};

/* ── status config ───────────────────────────────────────────────────────── */
const verifiedMeta = {
  true:  { label: "Verified",   color: "#00e5a0", icon: "✓" },
  false: { label: "Unverified", color: "#f59e0b", icon: "○" },
};

/* ══════════════════════════════════════════════════════════════════════════ */
export default function UserAccounts() {
  const navigate = useNavigate();

  const [users,    setUsers]   = useState([]);
  const [total,    setTotal]   = useState(0);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState("");
  const [roleFilter, setRole]  = useState("all");
  const [page,     setPage]    = useState(1);
  const [deleting, setDel]     = useState(null);
  const [err,      setErr]     = useState("");

  const LIMIT = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await api.get(`/users?${params}`);
      setUsers(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => { load(); }, [load]);

  /* ── filtered locally by search ──────────────────────────────────────── */
  const displayed = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.wallet_address?.toLowerCase().includes(s)
    );
  });

  /* ── delete user ─────────────────────────────────────────────────────── */
  async function handleDelete(id) {
    if (!window.confirm("Permanently delete this user?")) return;
    try {
      setDel(id);
      await api.delete(`/users/${id}`);
      setUsers((u) => u.filter((x) => x.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      setErr(e.response?.data?.message || "Delete failed.");
    } finally {
      setDel(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={s.page}>
      <div style={s.gridBg} />

      {/* ── header ────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Administration</p>
          <h1 style={s.title}>User Accounts</h1>
        </div>
        <button onClick={() => navigate("/admin/create-admin")} style={s.primaryBtn}>
          + New Admin
        </button>
      </div>

      {err && <div style={s.errBanner} onClick={() => setErr("")}>{err} ✕</div>}

      {/* ── controls ──────────────────────────────────────────────────── */}
      <div style={s.controls}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input
            style={s.searchInput}
            placeholder="Search name, email or wallet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={s.filterGroup}>
          {["all", "voter", "admin", "superadmin"].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setPage(1); }}
              style={{ ...s.filterBtn, ...(roleFilter === r ? s.filterActive : {}) }}
            >
              {r === "all" ? "All Roles" : ROLE_META[r]?.label}
            </button>
          ))}
        </div>

        <div style={s.totalBadge}>
          <span style={{ color: "#00e5a0", fontFamily: "'DM Mono', monospace" }}>{total}</span>
          <span style={{ color: "#6b8f7a", fontSize: 12 }}> total users</span>
        </div>
      </div>

      {/* ── table ─────────────────────────────────────────────────────── */}
      <div style={s.tableWrap}>
        {loading ? (
          <Spinner />
        ) : displayed.length === 0 ? (
          <Empty />
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["User", "Email", "Role", "Wallet", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((u) => {
                const rm = ROLE_META[u.role] || ROLE_META.voter;
                const vm = verifiedMeta[String(!!u.is_verified)];
                return (
                  <tr key={u.id} style={s.row}>
                    {/* User */}
                    <td style={s.td}>
                      <div style={s.userCell}>
                        <div style={{ ...s.avatar, background: rm.bg, color: rm.color }}>
                          {u.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p style={s.userName}>{u.name}</p>
                          <p style={s.userId}>#{u.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={s.td}><span style={s.mono}>{u.email}</span></td>

                    {/* Role */}
                    <td style={s.td}>
                      <span style={{ ...s.roleBadge, background: rm.bg, color: rm.color, border: `1px solid ${rm.color}33` }}>
                        {rm.label}
                      </span>
                    </td>

                    {/* Wallet */}
                    <td style={s.td}>
                      {u.wallet_address ? (
                        <span style={{ ...s.mono, fontSize: 11, color: "#6b8f7a" }}>
                          {u.wallet_address.slice(0, 6)}…{u.wallet_address.slice(-4)}
                        </span>
                      ) : (
                        <span style={{ color: "#3a4f45", fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={s.td}>
                      <span style={{ color: vm.color, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 16 }}>{vm.icon}</span> {vm.label}
                      </span>
                    </td>

                    {/* Joined */}
                    <td style={s.td}>
                      <span style={{ ...s.mono, fontSize: 11, color: "#6b8f7a" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={s.td}>
                      <div style={s.actions}>
                        <button
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                          style={s.viewBtn}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deleting === u.id}
                          style={s.deleteBtn}
                        >
                          {deleting === u.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={s.pageBtn}>← Prev</button>
          <span style={s.pageInfo}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={s.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ padding: "80px", textAlign: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #1e3a2f", borderTopColor: "#00e5a0", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#6b8f7a", fontSize: 13 }}>Loading users…</p>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ padding: "80px", textAlign: "center" }}>
      <p style={{ fontSize: 40, margin: "0 0 12px" }}>👥</p>
      <p style={{ color: "#6b8f7a", fontSize: 14 }}>No users found.</p>
    </div>
  );
}

/* ── styles ──────────────────────────────────────────────────────────────── */
const s = {
  page: { minHeight: "100vh", background: "#080f14", paddingBottom: 60, fontFamily: "'DM Sans', sans-serif", position: "relative" },
  gridBg: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(#1e3a2f18 1px, transparent 1px), linear-gradient(90deg, #1e3a2f18 1px, transparent 1px)`, backgroundSize: "48px 48px" },
  header: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 36px", borderBottom: "1px solid #1e3a2f" },
  eyebrow: { color: "#00e5a0", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" },
  title: { color: "#e2f0ea", fontSize: 28, fontWeight: 700, margin: 0 },
  primaryBtn: { background: "#00e5a0", color: "#050f0a", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
  errBanner: { position: "relative", zIndex: 1, margin: "12px 36px", background: "#2d0f0f", border: "1px solid #ef444455", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14, cursor: "pointer" },
  controls: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 16, padding: "20px 36px", flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1 1 260px" },
  searchIcon: { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b8f7a", fontSize: 18, pointerEvents: "none" },
  searchInput: { width: "100%", background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 10, padding: "10px 14px 10px 42px", color: "#e2f0ea", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" },
  filterGroup: { display: "flex", gap: 6 },
  filterBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid #1e3a2f", background: "transparent", color: "#6b8f7a", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", transition: "all .15s" },
  filterActive: { background: "#00e5a022", border: "1px solid #00e5a055", color: "#00e5a0" },
  totalBadge: { marginLeft: "auto", background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 8, padding: "8px 14px" },
  tableWrap: { position: "relative", zIndex: 1, margin: "0 36px", background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 16, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "14px 18px", textAlign: "left", color: "#6b8f7a", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #1e3a2f", fontWeight: 500 },
  row: { borderBottom: "1px solid #1e3a2f22", transition: "background .12s" },
  td: { padding: "14px 18px", verticalAlign: "middle" },
  userCell: { display: "flex", alignItems: "center", gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 },
  userName: { color: "#e2f0ea", fontWeight: 600, margin: "0 0 2px", fontSize: 14 },
  userId: { color: "#3a4f45", fontSize: 11, fontFamily: "'DM Mono', monospace", margin: 0 },
  mono: { fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c0d4c8" },
  roleBadge: { padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" },
  actions: { display: "flex", gap: 8 },
  viewBtn: { padding: "6px 14px", borderRadius: 6, border: "1px solid #1e3a2f", background: "transparent", color: "#6b8f7a", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif" },
  deleteBtn: { padding: "6px 14px", borderRadius: 6, border: "1px solid #ef444433", background: "#ef444411", color: "#ef4444", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif" },
  pagination: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "24px 36px" },
  pageBtn: { padding: "8px 18px", borderRadius: 8, border: "1px solid #1e3a2f", background: "transparent", color: "#6b8f7a", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, disabled: { opacity: 0.4 } },
  pageInfo: { color: "#6b8f7a", fontFamily: "'DM Mono', monospace", fontSize: 13 },
};