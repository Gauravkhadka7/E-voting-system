import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

const getStatus = (s,e) => {
  const now=new Date();
  if(!s||!e) return 'unknown';
  if(now<new Date(s)) return 'upcoming';
  if(now>new Date(e)) return 'completed';
  return 'active';
};

function LiveBar({ electionId }) {
  const [res, setRes] = useState({ candidates:[], totalVotes:0 });
  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  const t = useRef();

  const load = useCallback(async () => {
    if (!electionId) return;
    try { const r = await api.get(`/api/vote/results/${electionId}`); setRes(r.data); } catch {}
  }, [electionId]);

  useEffect(() => { load(); t.current=setInterval(load,15000); return ()=>clearInterval(t.current); }, [load]);

  const total = res.totalVotes || 1;
  return (
    <div className="card" style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.88rem', display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:7, height:7, background:'var(--green)', borderRadius:'50%', animation:'pulse 2s infinite', display:'inline-block' }}/>
          Live Results
        </div>
        <span className="badge badge-green">{res.totalVotes} votes</span>
      </div>
      {res.candidates.length === 0
        ? <div style={{ textAlign:'center', padding:'14px 0', color:'var(--muted)', fontSize:'.83rem' }}>No votes yet</div>
        : res.candidates.map((c,i) => {
            const pct = Math.round((c.voteCount||0)/total*100);
            const col = colors[i%colors.length];
            return (
              <div key={c._id} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.8rem', marginBottom:3 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:20, height:20, borderRadius:'50%', background:`${col}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, overflow:'hidden', flexShrink:0 }}>
                      {c.imageUrl?<img src={c.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:'👤'}
                    </span>
                    <span style={{ fontWeight:600 }}>{c.name}</span>
                    {i===0&&c.voteCount>0&&<span className="badge badge-green" style={{ fontSize:'.58rem' }}>🏆</span>}
                  </span>
                  <span style={{ fontWeight:700, color:col }}>{pct}%</span>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:col, width:`${pct}%`, borderRadius:3, transition:'width 1s ease' }}/>
                </div>
              </div>
            );
          })
      }
      <div style={{ fontSize:'.68rem', color:'var(--muted)', textAlign:'right', marginTop:6, fontFamily:'var(--font-mono)' }}>Refreshes every 15s</div>
    </div>
  );
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [myElections,  setMyElections]  = useState([]);
  const [candidates,   setCandidates]   = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted,     setHasVoted]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [activeEl,     setActiveEl]     = useState(null);
  const [selectedElId, setSelectedElId] = useState(null);

  const userInfo = JSON.parse(localStorage.getItem('userInfo')||'{}');

  const logout = () => { localStorage.clear(); navigate('/user/login'); };

  const load = useCallback(async () => {
    try {
      // /api/elections is automatically filtered by backend for this user
      const [elRes, statusRes] = await Promise.all([
        api.get('/api/elections'),
        api.get('/api/voter/status'),
      ]);
      const els = Array.isArray(elRes.data) ? elRes.data : [];
      setMyElections(els);
      const active = els.find(e=>getStatus(e.startDate,e.endDate)==='active');
      setActiveEl(active||null);
      setSelectedElId(active?._id || els[0]?._id || null);
      setIsRegistered(statusRes.data.isRegistered||false);
      setHasVoted(statusRes.data.hasVoted||false);
    } catch {
      setMyElections([]);
    } finally { setLoading(false); }
  }, []);

  // Load candidates for selected election
  useEffect(() => {
    if (!selectedElId) { setCandidates([]); return; }
    api.get(`/api/candidates/election/${selectedElId}`)
      .then(r => setCandidates(r.data||[]))
      .catch(() => setCandidates([]));
  }, [selectedElId]);

  useEffect(() => { load(); }, [load]);

  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  const selEl  = myElections.find(e=>e._id===selectedElId);
  const selSt  = selEl ? getStatus(selEl.startDate, selEl.endDate) : 'unknown';

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.05rem' }}>
          <div style={{ width:32, height:32, background:'var(--grad)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>⛓</div>
          BlockVote
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Username badge */}
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', background:'var(--card2)', borderRadius:20, border:'1px solid var(--border)', fontSize:'.83rem' }}>
            <span style={{ fontSize:14 }}>👤</span>
            <span style={{ fontWeight:600, color:'var(--text)' }}>{userInfo.name || 'Voter'}</span>
          </div>
          {/* Vote Now — only if active election, registered, not voted */}
          {activeEl && isRegistered && !hasVoted && (
            <button onClick={()=>navigate('/user/vote')} className="btn btn-primary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span>🗳️</span> Vote Now
            </button>
          )}
          {hasVoted && <span className="badge badge-purple" style={{ padding:'6px 12px' }}>✅ Voted</span>}
          {/* Logout */}
          <button onClick={logout} className="btn btn-outline btn-sm" style={{ display:'flex', alignItems:'center', gap:5 }}>
            🚪 Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px', display:'grid', gridTemplateColumns:'1fr 290px', gap:24, alignItems:'start' }}>

        {/* ── Main column ── */}
        <div>

          {/* Welcome */}
          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.4rem', marginBottom:8 }}>
              Welcome back, {userInfo.name || 'Voter'} 👋
            </h1>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span className={`badge ${isRegistered?'badge-green':'badge-amber'}`}>{isRegistered?'✅ Registered Voter':'⚠ Not Registered'}</span>
              {isRegistered&&<span className={`badge ${hasVoted?'badge-purple':'badge-blue'}`}>{hasVoted?'🗳️ Voted':'🔵 Ready to Vote'}</span>}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>Loading your elections…</div>
          ) : myElections.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🗳️</div>
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'1.05rem', marginBottom:8 }}>No Elections Assigned</div>
              <div style={{ color:'var(--sub)', fontSize:'.88rem' }}>Contact your admin to be assigned to an election.</div>
            </div>
          ) : (
            <>
              {/* Election tabs */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:'.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>Your Elections</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {myElections.map(el => {
                    const st = getStatus(el.startDate, el.endDate);
                    const active = selectedElId === el._id;
                    const dotColor = st==='active'?'var(--green)':st==='upcoming'?'var(--eth)':'var(--muted)';
                    return (
                      <button key={el._id} onClick={()=>setSelectedElId(el._id)}
                        style={{ padding:'7px 14px', borderRadius:20, border:`1px solid ${active?'var(--eth)':'var(--border)'}`,
                          background:active?'rgba(98,126,234,0.12)':'var(--card)',
                          color:active?'var(--eth)':'var(--sub)', cursor:'pointer', fontSize:'.82rem', fontWeight:active?700:400,
                          display:'flex', alignItems:'center', gap:6, transition:'all .2s' }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:dotColor, flexShrink:0 }}/>
                        {el.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected election info */}
              {selEl && (
                <div style={{ background:'rgba(98,126,234,0.06)', border:'1px solid rgba(98,126,234,0.18)', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>{selEl.title}</div>
                    <div style={{ fontSize:'.78rem', color:'var(--muted)', marginTop:3 }}>
                      {selEl.startDate?new Date(selEl.startDate).toLocaleDateString():''} → {selEl.endDate?new Date(selEl.endDate).toLocaleDateString():''}
                      {' · '}
                      <span className={`badge ${selSt==='active'?'badge-green':selSt==='upcoming'?'badge-blue':'badge-purple'}`} style={{ textTransform:'capitalize', fontSize:'.65rem' }}>{selSt}</span>
                    </div>
                  </div>
                  {selSt==='active' && isRegistered && !hasVoted && (
                    <button onClick={()=>navigate('/user/vote')} className="btn btn-primary btn-sm">🗳️ Vote Now →</button>
                  )}
                </div>
              )}

              {/* Candidates for selected election */}
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:14, fontSize:'.95rem' }}>
                Candidates {selEl ? `— ${selEl.title}` : ''}
              </div>
              {candidates.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:'.85rem' }}>
                  No candidates in this election yet
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:14 }}>
                  {candidates.map((c,i) => {
                    const col = colors[i%colors.length];
                    return (
                      <div key={c._id} className="card" style={{ borderTop:`3px solid ${col}`, position:'relative', overflow:'hidden' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                          <div style={{ width:46, height:46, borderRadius:'50%', background:`${col}18`, border:`2px solid ${col}44`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, fontSize:20 }}>
                            {c.imageUrl||c.ipfsImageUrl?<img src={c.imageUrl||c.ipfsImageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:'👤'}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.92rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                            <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:10, background:`${col}18`, color:col, fontSize:'.68rem', fontWeight:700 }}>{c.party}</span>
                          </div>
                        </div>
                        {c.age&&<div style={{ fontSize:'.77rem', color:'var(--muted)', marginBottom:2 }}>Age: {c.age}</div>}
                        {c.qualification&&<div style={{ fontSize:'.77rem', color:'var(--muted)', marginBottom:2 }}>{c.qualification}</div>}
                        {c.bio&&<div style={{ fontSize:'.76rem', color:'var(--sub)', lineHeight:1.5, marginTop:6, borderTop:'1px solid var(--border)', paddingTop:6 }}>{c.bio.slice(0,80)}{c.bio.length>80?'…':''}</div>}
                        <div style={{ marginTop:10, fontWeight:700, color:col, fontSize:'.85rem' }}>
                          {c.voteCount||0} vote{(c.voteCount||0)!==1?'s':''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Registration CTA */}
              {!isRegistered && (
                <div style={{ marginTop:20, background:'rgba(98,126,234,0.06)', border:'1px solid rgba(98,126,234,0.2)', borderRadius:12, padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700, marginBottom:3 }}>Register to vote</div>
                    <div style={{ color:'var(--sub)', fontSize:'.85rem' }}>Complete registration to cast your vote</div>
                  </div>
                  <Link to="/user/register-voter" className="btn btn-primary btn-sm">Register Now →</Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ position:'sticky', top:76 }}>
          {activeEl
            ? <LiveBar electionId={activeEl._id}/>
            : <div className="card" style={{ textAlign:'center', padding:'24px 16px', color:'var(--muted)', fontSize:'.83rem', marginBottom:16 }}>
                No active election right now
              </div>
          }

          <div className="card">
            <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:12, fontSize:'.88rem' }}>Your Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {!isRegistered && <Link to="/user/register-voter" className="btn btn-outline btn-full btn-sm">📋 Register as Voter</Link>}
              {isRegistered && !hasVoted && activeEl && <button onClick={()=>navigate('/user/vote')} className="btn btn-primary btn-full btn-sm">🗳️ Cast Your Vote →</button>}
              {hasVoted && (
                <div style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, padding:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>✅</div>
                  <div style={{ fontWeight:700, color:'var(--green)', fontSize:'.85rem' }}>Vote Recorded</div>
                  <div style={{ fontSize:'.72rem', color:'var(--muted)', marginTop:3 }}>Check email for receipt</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}