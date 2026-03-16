import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import axios from 'axios';

// Simple bar chart component (no external lib needed)
function BarChart({ data, colors }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 130, padding: '10px 0 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '.78rem', fontWeight: 700, color: colors[i % colors.length] }}>{d.value}</span>
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 100, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
            <div style={{ width: '100%', background: colors[i % colors.length], borderRadius: 6, height: `${(d.value / max) * 100}%`, transition: 'height 1s ease', opacity: .85 }} />
          </div>
          <span style={{ fontSize: '.7rem', color: 'var(--muted)', textAlign: 'center' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Donut chart
function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 44, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset * circumference / total + circumference * 0.25}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        );
        offset += seg.value;
        return el;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontSize="18" fontWeight="700" fontFamily="Syne">{total}</text>
    </svg>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ elections: 0, candidates: 0, voters: 0, parties: 0, totalVotes: 0 });
  const [recentElections, setRecentElections] = useState([]);
  const [partyData, setPartyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get('/api/admin/stats', { headers }),
      axios.get('/api/elections', { headers }),
      axios.get('/api/admin/party-stats', { headers }),
    ]).then(([statsRes, electionsRes, partyRes]) => {
      setStats(statsRes.data);
      setRecentElections(electionsRes.data.slice(0, 5));
      setPartyData(partyRes.data);
    }).catch(() => {
      // Demo fallback
      setStats({ elections: 3, candidates: 12, voters: 248, parties: 4, totalVotes: 186 });
      setRecentElections([
        { _id: '1', title: 'Presidential Election 2024', status: 'active', totalVotes: 186, startDate: '2024-12-01', endDate: '2024-12-15' },
        { _id: '2', title: 'Municipal Elections', status: 'upcoming', totalVotes: 0, startDate: '2025-01-10', endDate: '2025-01-20' },
        { _id: '3', title: 'Student Union Vote', status: 'completed', totalVotes: 320, startDate: '2024-11-01', endDate: '2024-11-05' },
      ]);
      setPartyData([
        { label: 'Progressive', value: 4, color: 'var(--eth)' },
        { label: 'Reform', value: 3, color: 'var(--purple)' },
        { label: 'Green', value: 3, color: 'var(--green)' },
        { label: 'Others', value: 2, color: 'var(--amber)' },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Elections', value: stats.elections, icon: '🗳️', color: 'var(--eth)', c: 'linear-gradient(135deg,#627EEA,#8B5CF6)' },
    { label: 'Candidates', value: stats.candidates, icon: '👤', color: 'var(--purple)', c: 'linear-gradient(135deg,#8B5CF6,#14B8A6)' },
    { label: 'Registered Voters', value: stats.voters, icon: '👥', color: 'var(--teal)', c: 'linear-gradient(135deg,#14B8A6,#10B981)' },
    { label: 'Parties', value: stats.parties, icon: '🏛️', color: 'var(--amber)', c: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
    { label: 'Votes Cast', value: stats.totalVotes, icon: '✅', color: 'var(--green)', c: 'linear-gradient(135deg,#10B981,#627EEA)' },
  ];

  const statusBadge = (s) => {
    const map = { active: 'badge-green', upcoming: 'badge-blue', completed: 'badge-amber' };
    return <span className={`badge ${map[s] || 'badge-blue'}`}>{s}</span>;
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Admin Dashboard</div>
            <div className="topbar-sub">Overview of your blockchain voting system</div>
          </div>
          <div className="topbar-right">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/create-election')}>+ New Election</button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 14, marginBottom: 28 }}>
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ '--c': s.c }}>
              <div className="stat-icon" style={{ background: `${s.color}20` }}>{s.icon}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

          {/* Voter vs Votes bar chart */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 4 }}>Voter Activity</div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 16 }}>Registered voters vs votes cast per election</div>
            <BarChart
              data={[
                { label: 'Registered', value: stats.voters },
                { label: 'Voted', value: stats.totalVotes },
                { label: 'Pending', value: Math.max(0, stats.voters - stats.totalVotes) },
              ]}
              colors={['var(--eth)', 'var(--green)', 'var(--amber)']}
            />
          </div>

          {/* Candidates by Party donut */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 4 }}>Candidates by Party</div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 16 }}>Distribution across political parties</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart segments={partyData.length ? partyData : [{ value: 1, color: 'var(--border)' }]} size={120} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {partyData.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '.82rem', color: 'var(--sub)', flex: 1 }}>{p.label}</span>
                    <span style={{ fontSize: '.82rem', fontWeight: 700, color: p.color }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System metrics bar chart */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 4 }}>System Overview</div>
          <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 16 }}>Total counts across all system entities</div>
          <BarChart
            data={[
              { label: 'Elections', value: stats.elections },
              { label: 'Parties', value: stats.parties },
              { label: 'Candidates', value: stats.candidates },
              { label: 'Voters', value: stats.voters },
              { label: 'Votes', value: stats.totalVotes },
            ]}
            colors={['var(--eth)', 'var(--amber)', 'var(--purple)', 'var(--teal)', 'var(--green)']}
          />
        </div>

        {/* Recent Elections Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>Recent Elections</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/elections')}>View All</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Election Title</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentElections.map(e => (
                  <tr key={e._id}>
                    <td style={{ fontWeight: 600 }}>{e.title}</td>
                    <td>{statusBadge(e.status)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{e.startDate?.split('T')[0]}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{e.endDate?.split('T')[0]}</td>
                    <td><span className="badge badge-green">{e.totalVotes || 0}</span></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/elections')}>Edit</button>
                    </td>
                  </tr>
                ))}
                {recentElections.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: '28px 0' }}>No elections yet. <a href="/admin/create-election">Create one →</a></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}