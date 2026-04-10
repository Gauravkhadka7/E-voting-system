import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

// Party banner images (Unsplash free)
const PARTY_IMAGES = {
  default: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=80',
  blue:    'https://images.unsplash.com/photo-1541872705-1f73c6400ec9?w=400&q=80',
  green:   'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=400&q=80',
  red:     'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=80',
};

function LiveResultsWidget({ electionId }) {
  const [results, setResults] = useState({ candidates:[], totalVotes:0 });
  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  const pollRef = useRef();

  useEffect(() => {
    if (!electionId) return;
    const fetch = async () => {
      try {
        const res = await api.get(`/api/vote/results/${electionId}`);
        setResults(res.data);
      } catch {}
    };
    fetch();
    pollRef.current = setInterval(fetch, 15000);
    return () => clearInterval(pollRef.current);
  }, [electionId]);

  return (
    <div className="card" style={{marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:8,height:8,background:'var(--green)',borderRadius:'50%',display:'inline-block',animation:'pulse 2s infinite'}}/>
          Live Voting Results
        </div>
        <span className="badge badge-green">{results.totalVotes} votes</span>
      </div>
      {results.candidates.length === 0 ? (
        <div style={{textAlign:'center',padding:'20px 0',color:'var(--muted)',fontSize:'.85rem'}}>No votes yet — be the first!</div>
      ) : (
        results.candidates.map((c,i) => {
          const pct   = results.totalVotes ? Math.round(c.voteCount/results.totalVotes*100) : 0;
          const color = colors[i%colors.length];
          const isLeading = i === 0 && c.voteCount > 0;
          return (
            <div key={c._id} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:30,height:30,borderRadius:'50%',background:`${color}22`,border:`2px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
                    {c.imageUrl||c.ipfsImageUrl ? <img src={c.imageUrl||c.ipfsImageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:12}}>👤</span>}
                  </div>
                  <div>
                    <div style={{fontSize:'.85rem',fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:'.72rem',color:'var(--muted)'}}>{c.party}</div>
                  </div>
                  {isLeading && <span className="badge badge-green" style={{fontSize:'.6rem'}}>Leading</span>}
                </div>
                <span style={{fontWeight:700,color,fontSize:'.9rem'}}>{pct}%</span>
              </div>
              <div style={{height:9,background:'rgba(255,255,255,0.05)',borderRadius:5,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:5,background:color,width:`${pct}%`,transition:'width 1s ease'}}/>
              </div>
              <div style={{fontSize:'.72rem',color:'var(--muted)',marginTop:3}}>{c.voteCount} votes</div>
            </div>
          );
        })
      )}
      <div style={{fontSize:'.7rem',color:'var(--muted)',textAlign:'right',fontFamily:'var(--font-mono)',marginTop:8}}>Refreshes every 15s</div>
    </div>
  );
}

export default function UserDashboard() {
  const computeStatus = (startDate, endDate) => {
    const now = new Date();
    if (!startDate || !endDate) return 'unknown';
    if (now < new Date(startDate)) return 'upcoming';
    if (now > new Date(endDate))   return 'completed';
    return 'active';
  };

  const navigate  = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [elections,  setElections]  = useState([]);
  const [activeEl,   setActiveEl]   = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [partyFilter, setPartyFilter] = useState('All');

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const token    = localStorage.getItem('userToken');

  const logout = () => { localStorage.clear(); navigate('/user/login'); };

  useEffect(() => {
    Promise.all([
      api.get('/api/candidates/public'),
      api.get('/api/elections/active'),
      api.get('/api/voter/status', { headers:{ Authorization:`Bearer ${token}` } }),
    ]).then(([cRes, elRes, sRes]) => {
      setCandidates(cRes.data);
      const actives = Array.isArray(elRes.data) ? elRes.data : [elRes.data];
      setElections(actives);
      setActiveEl(actives[0]);
      setIsRegistered(sRes.data.isRegistered);
      setHasVoted(sRes.data.hasVoted);
    }).catch(() => {
      // Demo fallback
      const demoCands = [
        { _id:'c1', name:'Alice Kumar',  party:'Progressive Alliance', age:45, qualification:'MBA, Harvard',      bio:'Committed to digital governance and transparent elections for all.', imageUrl:'', voteCount:124 },
        { _id:'c2', name:'Bob Sherpa',   party:'Reform Coalition',     age:52, qualification:'LLB, National Law', bio:'Advocating for legal reforms and rural development across the nation.', imageUrl:'', voteCount:98 },
        { _id:'c3', name:'Clara Thapa',  party:'Green Future',          age:39, qualification:'PhD Environmental', bio:'Championing green energy and a sustainable future for our children.', imageUrl:'', voteCount:76 },
        { _id:'c4', name:'David Rai',    party:'Progressive Alliance', age:48, qualification:'MSc Economics',     bio:'Focused on economic development and job creation in the digital era.', imageUrl:'', voteCount:55 },
      ];
      setCandidates(demoCands);
      setActiveEl({ _id:'demo', title:'Presidential Election 2024', endDate:'2025-12-31T18:00:00Z' });
      setIsRegistered(false); setHasVoted(false);
    }).finally(() => setLoading(false));
  }, [token]);

  const parties  = ['All', ...new Set(candidates.map(c => c.party))];
  const filtered = partyFilter === 'All' ? candidates : candidates.filter(c => c.party === partyFilter);
  const colors   = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6'];
  const pColor   = p => colors[parties.indexOf(p) % colors.length] || 'var(--muted)';
  const total    = candidates.reduce((s,c) => s+(c.voteCount||0), 1);

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* Nav */}
      <nav style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:10,fontFamily:'var(--font-head)',fontWeight:800}}>
          <div style={{width:32,height:32,background:'var(--grad)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>⛓</div>
          BlockVote
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:'.82rem',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>👤 {userInfo.name}</span>
          {!isRegistered && <Link to="/user/register-voter" className="btn btn-outline btn-sm">📋 Register</Link>}
          {isRegistered && !hasVoted && <Link to="/user/vote" className="btn btn-primary btn-sm">🗳️ Vote Now</Link>}
          <button onClick={logout} className="btn btn-outline btn-sm">🚪</button>
        </div>
      </nav>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'32px 24px',display:'grid',gridTemplateColumns:'1fr 300px',gap:24,alignItems:'start'}}>

        {/* ── Main column ── */}
        <div>
          {/* Welcome */}
          <div style={{marginBottom:22}}>
            <h1 style={{fontFamily:'var(--font-head)',fontSize:'1.6rem',fontWeight:800,marginBottom:6}}>
              Welcome, {userInfo.name} 👋
            </h1>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <span className={`badge ${isRegistered?'badge-green':'badge-amber'}`}>{isRegistered?'✅ Registered Voter':'⚠ Not Registered'}</span>
              {isRegistered && <span className={`badge ${hasVoted?'badge-purple':'badge-blue'}`}>{hasVoted?'🗳️ Vote Cast':'🔵 Ready to Vote'}</span>}
            </div>
          </div>

          {/* Active election banner */}
          {activeEl && (
            <div style={{background:'linear-gradient(135deg,rgba(98,126,234,0.1),rgba(139,92,246,0.07))',border:'1px solid rgba(98,126,234,0.25)',borderRadius:14,padding:'16px 22px',marginBottom:22,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,position:'relative',overflow:'hidden'}}>
              {/* Banner image */}
              <div style={{position:'absolute',right:0,top:0,bottom:0,width:140,background:`url(${PARTY_IMAGES.default}) center/cover no-repeat`,opacity:.08,borderRadius:'0 14px 14px 0'}}/>
              <div style={{position:'relative',zIndex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{width:8,height:8,background:'var(--green)',borderRadius:'50%',animation:'pulse 2s infinite',display:'inline-block'}}/>
                  <span style={{fontSize:'.72rem',fontWeight:700,color:'var(--green)',fontFamily:'var(--font-mono)',textTransform:'uppercase'}}>Election Active</span>
                </div>
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.05rem'}}>{activeEl.title}</div>
                <div style={{fontSize:'.82rem',color:'var(--muted)',marginTop:2}}>Closes: {new Date(activeEl.endDate).toLocaleString()}</div>
              </div>
              <div style={{position:'relative',zIndex:1}}>
                {!isRegistered && <Link to="/user/register-voter" className="btn btn-primary btn-sm">Register to Vote →</Link>}
                {isRegistered && !hasVoted && <Link to="/user/vote" className="btn btn-primary">🗳️ Cast Vote →</Link>}
                {hasVoted && <span className="badge badge-green" style={{padding:'8px 16px',fontSize:'.85rem'}}>✅ Voted</span>}
              </div>
            </div>
          )}

          {/* Party filter */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:18}}>
            {parties.map(p => (
              <button
                key={p}
                onClick={() => setPartyFilter(p)}
                style={{padding:'5px 15px',borderRadius:20,border:`1px solid ${partyFilter===p?pColor(p):'var(--border2)'}`,background:partyFilter===p?`${pColor(p)}18`:'transparent',color:partyFilter===p?pColor(p):'var(--muted)',fontSize:'.82rem',fontWeight:600,cursor:'pointer',transition:'all .2s'}}
              >{p}</button>
            ))}
          </div>

          {/* Candidate cards */}
          {loading ? (
            <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading candidates…</div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
              {filtered.map((c, i) => {
                const color = pColor(c.party);
                const pct   = Math.round((c.voteCount||0)/total*100);
                return (
                  <div key={c._id} className="card card-hover" style={{position:'relative',overflow:'hidden'}}>
                    {/* Top accent */}
                    <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:color}}/>
                    {/* Party banner bg */}
                    <div style={{position:'absolute',top:3,left:0,right:0,height:70,background:`url(${Object.values(PARTY_IMAGES)[i%4]}) center/cover no-repeat`,opacity:.06}}/>

                    <div style={{position:'relative',zIndex:1,paddingTop:4}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
                        <div style={{width:60,height:60,borderRadius:'50%',background:`${color}22`,border:`2px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,overflow:'hidden'}}>
                          {c.imageUrl||c.ipfsImageUrl ? <img src={c.imageUrl||c.ipfsImageUrl} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : '👤'}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4}}>{c.name}</div>
                          <span style={{display:'inline-block',padding:'2px 10px',borderRadius:12,background:`${color}18`,border:`1px solid ${color}44`,color,fontSize:'.7rem',fontWeight:700}}>{c.party}</span>
                        </div>
                      </div>

                      {c.age && <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',marginBottom:5}}><span style={{color:'var(--muted)'}}>Age</span><span>{c.age}</span></div>}
                      {c.qualification && <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',marginBottom:5}}><span style={{color:'var(--muted)'}}>Qualification</span><span style={{textAlign:'right',maxWidth:140,fontSize:'.78rem'}}>{c.qualification}</span></div>}

                      {c.bio && (
                        <p style={{fontSize:'.8rem',color:'var(--sub)',lineHeight:1.65,marginTop:10,marginBottom:12,borderTop:'1px solid var(--border)',paddingTop:10}}>
                          {c.bio.slice(0,110)}{c.bio.length>110?'…':''}
                        </p>
                      )}

                      <div style={{marginTop:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'.72rem',color:'var(--muted)',marginBottom:4}}>
                          <span>Votes</span>
                          <span style={{color,fontWeight:700}}>{c.voteCount||0} ({pct}%)</span>
                        </div>
                        <div style={{height:7,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:4,background:color,width:`${pct}%`,transition:'width 1s ease'}}/>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isRegistered && (
            <div style={{marginTop:36,background:'rgba(98,126,234,0.05)',border:'1px solid rgba(98,126,234,0.2)',borderRadius:16,padding:'28px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
              <div>
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.1rem',marginBottom:6}}>Ready to make your voice heard?</div>
                <div style={{fontSize:'.88rem',color:'var(--sub)'}}>Complete voter registration to participate in active elections.</div>
              </div>
              <Link to="/user/register-voter" className="btn btn-primary btn-lg">📋 Register Now →</Link>
            </div>
          )}
        </div>

        {/* ── Right: sticky live results ── */}
        <div style={{position:'sticky',top:80}}>
          {activeEl && <LiveResultsWidget electionId={activeEl._id} />}

          {/* MetaMask hint */}
          <div className="card card-sm" style={{background:'rgba(245,158,11,0.06)',borderColor:'rgba(245,158,11,0.2)'}}>
            <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--amber)',marginBottom:8}}>🦊 MetaMask Required</div>
            <div style={{fontSize:'.78rem',color:'var(--sub)',lineHeight:1.75}}>
              Install MetaMask browser extension. Connect to <strong style={{color:'var(--text)'}}>Localhost 8545 (Chain ID: 1337)</strong> to cast your vote. Every vote requires MetaMask confirmation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}