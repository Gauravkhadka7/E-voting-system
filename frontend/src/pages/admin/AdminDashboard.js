import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

/* ─── Constants ─────────────────────────────────────── */
const COLORS = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];

/* ─── Helpers ────────────────────────────────────────── */
const getStatus = (s, e) => {
  const now = new Date();
  if (!s || !e) return 'draft';
  if (now < new Date(s)) return 'upcoming';
  if (now > new Date(e)) return 'completed';
  return 'active';
};

/* ─── Custom Tooltips ────────────────────────────────── */
const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', boxShadow:'var(--shadow)' }}>
      <div style={{ fontWeight:700, fontSize:'.83rem', marginBottom:4 }}>{label}</div>
      <div style={{ color:'var(--eth)', fontWeight:700 }}>{payload[0].value} votes</div>
    </div>
  );
};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', boxShadow:'var(--shadow)' }}>
      <div style={{ fontWeight:700, fontSize:'.83rem' }}>{payload[0].name}</div>
      <div style={{ color:payload[0].payload.fill, fontWeight:700 }}>
        {payload[0].value} votes · {payload[0].payload.pct}%
      </div>
    </div>
  );
};

/* ─── Mini custom DonutChart (for party distribution) ── */
function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 44, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
            strokeWidth="14" strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset * circ / total + circ * 0.25}
            strokeLinecap="round"
            style={{ transition:'stroke-dasharray 1s ease' }}
          />
        );
        offset += seg.value;
        return el;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fill="var(--text)" fontSize="18" fontWeight="700" fontFamily="Syne">
        {total}
      </text>
    </svg>
  );
}

/* ─── News icon/color maps ───────────────────────────── */
const newsIcon  = { info:'ℹ️', success:'✅', tip:'💡', security:'🔐', warning:'⚠️' };
const newsColor = {
  info:     'rgba(98,126,234,0.15)',
  success:  'rgba(16,185,129,0.12)',
  tip:      'rgba(245,158,11,0.12)',
  security: 'rgba(139,92,246,0.12)',
  warning:  'rgba(239,68,68,0.12)',
};

/* ════════════════════════════════════════════════════════
   AdminDashboard
   ════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats,      setStats]      = useState({ elections:0, candidates:0, voters:0, parties:0, totalVotes:0, active:0 });
  const [elections,  setElections]  = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [partyData,  setPartyData]  = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedEl, setSelectedEl] = useState(null);
  const [news,       setNews]       = useState([
    { id:1, type:'info',     text:'BlockVote system initialised. Create your first election to get started.', time:'Just now' },
    { id:2, type:'tip',      text:'Add candidates before setting the election start date.', time:'Tip' },
    { id:3, type:'security', text:'Admin OTP confirmation is required for all sensitive actions.', time:'Security' },
  ]);

  const token   = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  const loadAll = useCallback(async () => {
    try {
      const [elRes, candRes, statsRes, voterRes, partyRes] = await Promise.all([
        api.get('/api/elections/all-public', { headers }).catch(() => api.get('/api/elections', { headers })),
        api.get('/api/candidates',           { headers }),
        api.get('/api/admin/stats',          { headers }),
        api.get('/api/voter/all',            { headers }).catch(() => ({ data:[] })),
        api.get('/api/admin/party-stats',    { headers }).catch(() => ({ data:[] })),
      ]);

      const els   = elRes.data   || [];
      const cands = candRes.data || [];
      const st    = statsRes.data || {};
      const vot   = voterRes.data || [];
      const party = partyRes.data || [];

      setElections(els);
      setCandidates(cands);
      setStats(st);
      setUsers(vot);
      setPartyData(party);
      if (els.length > 0) setSelectedEl(els[0]);

      // Build live news from real data
      const liveNews = [
        { id:1, type:'info',    text:`System has ${st.elections} elections and ${st.candidates} candidates.`, time:'Now' },
      ];
      const active = els.filter(e => getStatus(e.startDate, e.endDate) === 'active');
      if (active.length) {
        liveNews.push({ id:2, type:'success', text:`${active.length} election(s) currently active. Total votes: ${st.totalVotes}.`, time:'Live' });
      }
      setNews(liveNews);

    } catch {
      /* ── Demo fallback ── */
      const demoEls = [
        { _id:'el1', title:'Presidential Election 2024', startDate:'2025-01-01', endDate:'2025-12-31', totalVotes:298 },
        { _id:'el2', title:'Municipal Elections',        startDate:'2025-06-01', endDate:'2025-06-30', totalVotes:0   },
        { _id:'el3', title:'Student Union Vote',         startDate:'2024-11-01', endDate:'2024-11-05', totalVotes:320 },
      ];
      const demoCands = [
        { _id:'c1', name:'Alice Kumar', party:'Progressive Alliance', election:'el1', voteCount:124 },
        { _id:'c2', name:'Bob Sherpa',  party:'Reform Coalition',     election:'el1', voteCount:98  },
        { _id:'c3', name:'Clara Thapa', party:'Green Future',          election:'el1', voteCount:76  },
      ];
      const demoParty = [
        { label:'Progressive Alliance', value:5 },
        { label:'Reform Coalition',     value:4 },
        { label:'Green Future',         value:3 },
      ];
      setElections(demoEls);
      setCandidates(demoCands);
      setPartyData(demoParty);
      setStats({ elections:3, candidates:12, voters:248, parties:3, totalVotes:618, active:1 });
      setSelectedEl(demoEls[0]);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    loadAll();
  }, [loadAll, navigate, token]);

  /* ── Derived data for selected election ── */
  const elCandidates = candidates.filter(c => c.election === selectedEl?._id);
  const totalV       = elCandidates.reduce((s, c) => s + (c.voteCount || 0), 0) || 1;
  const barData      = elCandidates.map(c => ({ name: c.name.split(' ')[0], votes: c.voteCount || 0, party: c.party }));
  const pieData      = elCandidates.map((c, i) => ({
    name:  c.name,
    value: c.voteCount || 0,
    fill:  COLORS[i % COLORS.length],
    pct:   Math.round(((c.voteCount || 0) / totalV) * 100),
  }));
  const leader = [...elCandidates].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))[0];

  /* ── History (all elections sorted newest first) ── */
  const history = [...elections]
    .map(e => ({ ...e, computedStatus: getStatus(e.startDate, e.endDate) }))
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  /* ── Stat cards ── */
  const statCards = [
    { label:'Total Elections',   value: stats.elections  || elections.length,  icon:'🗳️', color:'#627EEA', path:'/admin/elections'  },
    { label:'Total Candidates',  value: stats.candidates || candidates.length, icon:'👤', color:'#8B5CF6', path:'/admin/candidates' },
    { label:'Registered Voters', value: stats.voters     || users.length,      icon:'📋', color:'#10B981', path:null               },
    { label:'Total Votes Cast',  value: stats.totalVotes || 0,                 icon:'✅', color:'#F59E0B', path:null               },
    { label:'Active Elections',  value: stats.active     || elections.filter(e => getStatus(e.startDate, e.endDate) === 'active').length, icon:'🟢', color:'#14B8A6', path:null },
  ];

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */
  return (
    <div className="dashboard-layout">

      {/* ── Sidebar (flex-direction: column forced) ── */}
      <AdminSidebar style={{ display:'flex', flexDirection:'column' }} />

      <main className="main-content">

        {/* Top bar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard</div>
            <div className="topbar-sub">BlockVote control centre — election analytics and system overview</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/elections')}>Elections</button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/add-candidate')}>+ Candidate</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/create-election')}>+ New Election</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)' }}>Loading analytics…</div>
        ) : (
          <>
            {/* ── Stat cards ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14, marginBottom:24 }}>
              {statCards.map((s, i) => (
                <div key={i}
                  className={`card ${s.path ? 'card-hover' : ''}`}
                  onClick={() => s.path && navigate(s.path)}
                  style={{ borderTop:`3px solid ${s.color}`, cursor:s.path ? 'pointer' : 'default', padding:'18px 20px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', right:14, top:14, fontSize:28, opacity:.1 }}>{s.icon}</div>
                  <div style={{ fontSize:'.75rem', color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600 }}>{s.label}</div>
                  <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'2.1rem', color:s.color }}>{s.value}</div>
                  {s.path && <div style={{ fontSize:'.75rem', color:s.color, marginTop:8, fontWeight:600 }}>View →</div>}
                </div>
              ))}
            </div>

            {/* ── Election selector ── */}
            <div className="card" style={{ marginBottom:20, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.9rem', flexShrink:0 }}>📊 Viewing:</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', flex:1 }}>
                  {elections.map(el => {
                    const st  = getStatus(el.startDate, el.endDate);
                    const sel = selectedEl?._id === el._id;
                    return (
                      <button key={el._id} onClick={() => setSelectedEl(el)}
                        style={{ padding:'6px 14px', borderRadius:20,
                          border:`1px solid ${sel ? 'var(--eth)' : 'var(--border)'}`,
                          background:sel ? 'rgba(98,126,234,0.12)' : 'transparent',
                          color:sel ? 'var(--eth)' : 'var(--muted)',
                          cursor:'pointer', fontSize:'.8rem', fontWeight:sel ? 700 : 500,
                          display:'flex', alignItems:'center', gap:6, transition:'all .2s' }}>
                        <span style={{ width:6, height:6, borderRadius:'50%',
                          background: st === 'active' ? 'var(--green)' : st === 'upcoming' ? 'var(--eth)' : 'var(--muted)',
                          flexShrink:0 }}/>
                        {el.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Charts row ── */}
            {selectedEl && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>

                {/* Bar chart — votes per candidate */}
                <div className="card">
                  <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:4 }}>📊 Votes per Candidate</div>
                  <div style={{ fontSize:'.78rem', color:'var(--muted)', marginBottom:16 }}>{selectedEl.title}</div>
                  {leader && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                      background:'rgba(98,126,234,0.06)', border:'1px solid rgba(98,126,234,0.15)',
                      borderRadius:10, marginBottom:16 }}>
                      <span style={{ fontSize:18 }}>🏆</span>
                      <div>
                        <div style={{ fontSize:'.78rem', color:'var(--muted)' }}>Leading Candidate</div>
                        <div style={{ fontWeight:700, color:'var(--eth)' }}>
                          {leader.name}
                          <span style={{ color:'var(--muted)', fontWeight:400, fontSize:'.82rem' }}>
                            {' '}· {Math.round(((leader.voteCount || 0) / totalV) * 100)}% of votes
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {barData.length === 0
                    ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)' }}>No candidates in this election</div>
                    : <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                          <XAxis dataKey="name" tick={{ fill:'var(--muted)', fontSize:12 }} axisLine={false} tickLine={false}/>
                          <YAxis tick={{ fill:'var(--muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
                          <Tooltip content={<BarTip/>}/>
                          <Bar dataKey="votes" radius={[6,6,0,0]}>
                            {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>

                {/* Pie chart — vote distribution */}
                <div className="card">
                  <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:4 }}>🥧 Vote Distribution</div>
                  <div style={{ fontSize:'.78rem', color:'var(--muted)', marginBottom:16 }}>Percentage share</div>
                  {pieData.length === 0
                    ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)' }}>No votes yet</div>
                    : <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                            </Pie>
                            <Tooltip content={<PieTip/>}/>
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {pieData.map((d, i) => (
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:10, height:10, borderRadius:'50%', background:d.fill, flexShrink:0 }}/>
                                <span style={{ fontSize:'.8rem' }}>{d.name}</span>
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:80, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                                  <div style={{ height:'100%', background:d.fill, width:`${d.pct}%` }}/>
                                </div>
                                <span style={{ fontWeight:700, color:d.fill, fontSize:'.8rem', minWidth:32, textAlign:'right' }}>{d.pct}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                  }
                </div>
              </div>
            )}

            {/* ── Party distribution + System notices row ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>

              {/* Party donut */}
              <div className="card">
                <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:4 }}>🎯 Party Distribution</div>
                <div style={{ fontSize:'.78rem', color:'var(--muted)', marginBottom:16 }}>Candidates by party</div>
                {partyData.length ? (
                  <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                    <DonutChart
                      segments={partyData.map((p, i) => ({ ...p, color: COLORS[i % COLORS.length] }))}
                      size={130}
                    />
                    <div style={{ flex:1 }}>
                      {partyData.map((p, i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i % COLORS.length], flexShrink:0 }}/>
                            <span style={{ fontSize:'.8rem' }}>{p.label}</span>
                          </div>
                          <span style={{ fontWeight:700, fontSize:'.8rem', color:COLORS[i % COLORS.length] }}>{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:'center', color:'var(--muted)', padding:'20px 0' }}>No candidates yet</div>
                )}
              </div>

              {/* System notices */}
              <div className="card">
                <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  📢 System Notices
                  <span className="badge badge-blue">{news.length}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {news.map(n => (
                    <div key={n.id}
                      style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px',
                        borderRadius:10, background: newsColor[n.type] || newsColor.info }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{newsIcon[n.type] || 'ℹ️'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'.85rem', color:'var(--text)' }}>{n.text}</div>
                        <div style={{ fontSize:'.72rem', color:'var(--muted)', marginTop:3 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Election history table ── */}
            <div className="card">
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:16,
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  📅 Elections Overview
                  <span className="badge badge-blue">{history.length}</span>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/elections')}>Manage →</button>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🗳️</div>
                  No elections yet.
                  <button className="btn btn-primary btn-sm" style={{ marginLeft:8 }}
                    onClick={() => navigate('/admin/create-election')}>Create First →</button>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Election','Status','Candidates','Voters','Votes','Start','End'].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:'.72rem',
                            color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((el, i) => {
                        const st         = el.computedStatus;
                        const bc         = candidates.filter(c => c.election === el._id).length;
                        const bv         = users.filter(u => (u.assignedElections || []).includes(el._id)).length;
                        const badgeClass = st === 'active' ? 'badge-green' : st === 'upcoming' ? 'badge-blue' : 'badge-purple';
                        return (
                          <tr key={el._id}
                            style={{ borderBottom:'1px solid rgba(255,255,255,0.04)',
                              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                              cursor:'pointer' }}
                            onClick={() => setSelectedEl(el)}>
                            <td style={{ padding:'10px 12px', fontWeight:600, fontSize:'.87rem' }}>{el.title}</td>
                            <td style={{ padding:'10px 12px' }}>
                              <span className={`badge ${badgeClass}`} style={{ textTransform:'capitalize' }}>{st}</span>
                            </td>
                            <td style={{ padding:'10px 12px', fontWeight:700, color:'var(--purple)' }}>{bc}</td>
                            <td style={{ padding:'10px 12px', fontWeight:700, color:'var(--teal)' }}>
                              {bv || el.assignedUsers?.length || 0}
                            </td>
                            <td style={{ padding:'10px 12px', fontWeight:700, color:'var(--eth)' }}>{el.totalVotes || 0}</td>
                            <td style={{ padding:'10px 12px', fontSize:'.82rem', color:'var(--muted)', fontFamily:'var(--font-mono)' }}>
                              {el.startDate ? new Date(el.startDate).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ padding:'10px 12px', fontSize:'.82rem', color:'var(--muted)', fontFamily:'var(--font-mono)' }}>
                              {el.endDate ? new Date(el.endDate).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </>
        )}
      </main>
    </div>
  );
}