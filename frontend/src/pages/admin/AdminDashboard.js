import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../utils/api';

function BarChart({ data, colors }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:12,height:130,padding:'10px 0 0'}}>
      {data.map((d,i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <span style={{fontSize:'.78rem',fontWeight:700,color:colors[i%colors.length]}}>{d.value}</span>
          <div style={{width:'100%',background:'rgba(255,255,255,0.05)',borderRadius:6,height:100,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
            <div style={{width:'100%',background:colors[i%colors.length],borderRadius:6,height:`${(d.value/max)*100}%`,transition:'height 1s ease',opacity:.85}} />
          </div>
          <span style={{fontSize:'.7rem',color:'var(--muted)',textAlign:'center'}}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size=120 }) {
  const total = segments.reduce((s,x)=>s+x.value,0)||1;
  let offset = 0;
  const r=44,cx=60,cy=60,circ=2*Math.PI*r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
      {segments.map((seg,i)=>{
        const dash=(seg.value/total)*circ;
        const el=(
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
            strokeWidth="14" strokeDasharray={`${dash} ${circ-dash}`}
            strokeDashoffset={-offset*circ/total+circ*0.25}
            strokeLinecap="round" style={{transition:'stroke-dasharray 1s ease'}}/>
        );
        offset+=seg.value; return el;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fill="var(--text)" fontSize="18" fontWeight="700" fontFamily="Syne">{total}</text>
    </svg>
  );
}

const getStatus = (s,e) => {
  const now=new Date();
  if(now<new Date(s)) return 'upcoming';
  if(now>new Date(e)) return 'completed';
  return 'active';
};

const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({elections:0,candidates:0,voters:0,parties:0,totalVotes:0});
  const [allElections, setAllElections] = useState([]);
  const [partyData, setPartyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([
    { id:1, type:'info',    text:'BlockVote system initialized. Create your first election to get started.', time:'Just now' },
    { id:2, type:'tip',     text:'Add candidates before setting the election start date.', time:'Tip' },
    { id:3, type:'security',text:'Admin OTP confirmation is required for all sensitive actions.', time:'Security' },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin/login'); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      api.get('/api/admin/stats', { headers }),
      api.get('/api/elections', { headers }),
      api.get('/api/admin/party-stats', { headers }),
    ]).then(([sRes, eRes, pRes]) => {
      setStats(sRes.data);
      setAllElections(eRes.data);
      setPartyData(pRes.data);
      // Build news from real data
      const newsItems = [{ id:1, type:'info', text:`System has ${sRes.data.elections} elections and ${sRes.data.candidates} candidates.`, time:'Now' }];
      const active = eRes.data.filter(e => getStatus(e.startDate,e.endDate)==='active');
      if (active.length) newsItems.push({ id:2, type:'success', text:`${active.length} election(s) currently active. Total votes: ${sRes.data.totalVotes}.`, time:'Live' });
      setNews(newsItems);
    }).catch(() => {
      setStats({elections:3,candidates:12,voters:248,parties:4,totalVotes:186});
      setAllElections([
        {_id:'1',title:'Presidential Election 2024',startDate:'2024-12-01',endDate:'2024-12-15',totalVotes:186},
        {_id:'2',title:'Municipal Elections',startDate:'2025-06-10',endDate:'2025-06-20',totalVotes:0},
        {_id:'3',title:'Student Union Vote',startDate:'2024-11-01',endDate:'2024-11-05',totalVotes:320},
      ]);
    }).finally(()=>setLoading(false));
  }, [navigate]);

  const statCards = [
    {label:'Elections', value:stats.elections, icon:'🗳️', color:'#627EEA', path:'/admin/elections'},
    {label:'Candidates', value:stats.candidates, icon:'👤', color:'#8B5CF6', path:'/admin/candidates'},
    {label:'Voters',    value:stats.voters,    icon:'📋', color:'#10B981', path:null},
    {label:'Total Votes',value:stats.totalVotes,icon:'✅', color:'#F59E0B', path:null},
  ];

  const barData = [
    {label:'Elections', value:stats.elections},
    {label:'Candidates',value:stats.candidates},
    {label:'Voters',    value:stats.voters},
    {label:'Votes',     value:stats.totalVotes},
  ];

  const newsIcon = {info:'ℹ️', success:'✅', tip:'💡', security:'🔐', warning:'⚠️'};
  const newsColor = {info:'rgba(98,126,234,0.15)',success:'rgba(16,185,129,0.12)',tip:'rgba(245,158,11,0.12)',security:'rgba(139,92,246,0.12)',warning:'rgba(239,68,68,0.12)'};

  // Election history — all elections with computed status
  const history = [...allElections].map(e=>({...e, computedStatus: getStatus(e.startDate,e.endDate)}))
    .sort((a,b)=>new Date(b._created||b.startDate)-new Date(a._created||a.startDate));

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Admin Dashboard</div>
            <div className="topbar-sub">BlockVote control center — manage elections, candidates and voters</div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-outline btn-sm" onClick={()=>navigate('/admin/create-election')}>+ Election</button>
            <button className="btn btn-primary btn-sm" onClick={()=>navigate('/admin/add-candidate')}>+ Candidate</button>
          </div>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'80px 0',color:'var(--muted)'}}>Loading dashboard…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:24}}>
              {statCards.map((s,i)=>(
                <div key={i} className={`card ${s.path?'card-hover':''}`}
                  onClick={()=>s.path&&navigate(s.path)}
                  style={{cursor:s.path?'pointer':'default',borderTop:`3px solid ${s.color}`,position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',right:16,top:16,fontSize:28,opacity:.15}}>{s.icon}</div>
                  <div style={{fontSize:'.78rem',color:'var(--muted)',marginBottom:8}}>{s.label}</div>
                  <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'2.2rem',color:s.color}}>{s.value}</div>
                  {s.path&&<div style={{fontSize:'.75rem',color:s.color,marginTop:8,fontWeight:600}}>View →</div>}
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
              {/* Bar chart */}
              <div className="card">
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4}}>System Overview</div>
                <div style={{fontSize:'.78rem',color:'var(--muted)',marginBottom:12}}>All records at a glance</div>
                <BarChart data={barData} colors={colors} />
              </div>

              {/* Party donut */}
              <div className="card">
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4}}>Party Distribution</div>
                <div style={{fontSize:'.78rem',color:'var(--muted)',marginBottom:16}}>Candidates by party</div>
                {partyData.length ? (
                  <div style={{display:'flex',alignItems:'center',gap:20}}>
                    <DonutChart segments={partyData.map((p,i)=>({...p,color:colors[i%colors.length]}))} size={130}/>
                    <div style={{flex:1}}>
                      {partyData.map((p,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <div style={{display:'flex',alignItems:'center',gap:7}}>
                            <div style={{width:10,height:10,borderRadius:'50%',background:colors[i%colors.length],flexShrink:0}}/>
                            <span style={{fontSize:'.8rem'}}>{p.label}</span>
                          </div>
                          <span style={{fontWeight:700,fontSize:'.8rem',color:colors[i%colors.length]}}>{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div style={{textAlign:'center',color:'var(--muted)',padding:'20px 0'}}>No candidates yet</div>}
              </div>
            </div>

            {/* News & Alerts */}
            <div className="card" style={{marginBottom:24}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                📢 System Notices
                <span className="badge badge-blue">{news.length}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {news.map(n=>(
                  <div key={n.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',borderRadius:10,background:newsColor[n.type]||newsColor.info}}>
                    <span style={{fontSize:18,flexShrink:0}}>{newsIcon[n.type]||'ℹ️'}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'.85rem',color:'var(--text)'}}>{n.text}</div>
                      <div style={{fontSize:'.72rem',color:'var(--muted)',marginTop:3}}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Election History */}
            <div className="card">
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  📅 Election History
                  <span className="badge badge-blue">{history.length}</span>
                </div>
                <button className="btn btn-outline btn-sm" onClick={()=>navigate('/admin/elections')}>View All →</button>
              </div>
              {history.length===0 ? (
                <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>
                  <div style={{fontSize:36,marginBottom:12}}>🗳️</div>
                  No elections yet. <button className="btn btn-primary btn-sm" style={{marginLeft:8}} onClick={()=>navigate('/admin/create-election')}>Create First →</button>
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid var(--border)'}}>
                        {['Election','Status','Start','End','Votes'].map(h=>(
                          <th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:'.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((e,i)=>{
                        const st = e.computedStatus;
                        const badgeClass = st==='active'?'badge-green':st==='upcoming'?'badge-blue':'badge-purple';
                        return (
                          <tr key={e._id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                            <td style={{padding:'10px 12px'}}>
                              <div style={{fontWeight:600,fontSize:'.88rem'}}>{e.title}</div>
                            </td>
                            <td style={{padding:'10px 12px'}}>
                              <span className={`badge ${badgeClass}`} style={{textTransform:'capitalize'}}>{st}</span>
                            </td>
                            <td style={{padding:'10px 12px',fontSize:'.82rem',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>
                              {e.startDate ? new Date(e.startDate).toLocaleDateString() : '—'}
                            </td>
                            <td style={{padding:'10px 12px',fontSize:'.82rem',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>
                              {e.endDate ? new Date(e.endDate).toLocaleDateString() : '—'}
                            </td>
                            <td style={{padding:'10px 12px',fontWeight:700,color:'var(--eth)'}}>{e.totalVotes||0}</td>
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