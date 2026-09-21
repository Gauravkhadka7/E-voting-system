import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import { electionAPI } from "../../utils/api";
import toast from "react-hot-toast";

function StatCard({ label, value, icon, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-600/20 text-indigo-400",
    emerald: "bg-emerald-600/20 text-emerald-400",
    amber: "bg-amber-600/20 text-amber-400",
    rose: "bg-rose-600/20 text-rose-400",
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white">{value ?? "—"}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    ACTIVE: "badge-green", DRAFT: "badge-gray", ENDED: "badge-blue",
    PAUSED: "badge-yellow", CANCELLED: "badge-red",
  };
  return <span className={`badge ${map[status] || "badge-gray"}`}>{status}</span>;
}

export default function AdminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentElections, setRecentElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, elRes] = await Promise.all([
        electionAPI.getStats(),
        electionAPI.getAll({ limit: 8 }),
      ]);
      setStats(statsRes.data.stats);
      setRecentElections(elRes.data.elections || []);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await electionAPI.updateStatus(id, status);
      toast.success(`Election ${status.toLowerCase()}`);
      loadDashboard();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-64"} p-6`}>
        <div className="max-w-7xl mx-auto page-enter">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Election management overview</p>
            </div>
            <Link to="/admin/elections/create" className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Election
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Total Elections" value={stats?.total_elections} icon="🗳️" color="indigo" />
            <StatCard label="Active" value={stats?.active_elections} icon="🔴" color="emerald" />
            <StatCard label="Total Users" value={stats?.total_users} icon="👥" color="indigo" />
            <StatCard label="Verified" value={stats?.verified_users} icon="✅" color="emerald" />
            <StatCard label="Total Votes" value={stats?.total_votes} icon="📊" color="amber" />
            <StatCard label="Candidates" value={stats?.total_candidates} icon="🏅" color="rose" />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Recent Elections</h2>
              <Link to="/admin/history" className="text-sm text-indigo-400 hover:underline">View All →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Scope</th>
                    <th className="table-header">Start</th>
                    <th className="table-header">End</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        {Array(6).fill(0).map((_, j) => (
                          <td key={j} className="table-cell"><div className="skeleton h-4 w-20 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : recentElections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No elections yet.{" "}
                        <Link to="/admin/elections/create" className="text-indigo-400 hover:underline">Create one →</Link>
                      </td>
                    </tr>
                  ) : (
                    recentElections.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell">
                          <Link to={`/admin/elections/${e.id}`} className="font-medium text-white hover:text-indigo-400 transition-colors">
                            {e.name}
                          </Link>
                        </td>
                        <td className="table-cell"><StatusBadge status={e.status} /></td>
                        <td className="table-cell text-slate-400 text-xs">{e.scope_type}</td>
                        <td className="table-cell text-xs">{new Date(e.start_date).toLocaleDateString()}</td>
                        <td className="table-cell text-xs">{new Date(e.end_date).toLocaleDateString()}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <Link to={`/admin/elections/${e.id}`} className="text-xs text-indigo-400 hover:underline">View</Link>
                            {e.status === "DRAFT" && (
                              <button onClick={() => handleStatusChange(e.id, "ACTIVE")} className="text-xs text-emerald-400 hover:underline">Activate</button>
                            )}
                            {e.status === "ACTIVE" && (
                              <button onClick={() => handleStatusChange(e.id, "ENDED")} className="text-xs text-amber-400 hover:underline">End</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}