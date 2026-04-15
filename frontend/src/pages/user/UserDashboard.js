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

function LiveResultsWidget({ electionId }) {
  const [results, setResults] = useState({ candidates:[], totalVotes:0 });
  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  const pollRef = useRef();

  const fetchR = useCallback(async () => {
    if (!electionId) return;
    try {
      const res = await api.get(`/api/vote/results/${electionId}`);
      setResults(res.data);
    } catch { /* ignore */ }
  }, [electionId]);

  useEffect(() => {
    fetchR();
    pollRef.current = setInterval(fetchR, 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchR]);

  const total = results.totalVotes || 1;
  return (
    <div className="card" style={{marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'.9rem',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:8,height:8,background:'var(--green)',borderRadius:'50%',animation:'pulse 2s infinite',display:'inline-block'}}/>
          Live Results
        </div>
        <span className="badge badge-green">{results.totalVotes} votes</span>
      </div>
      {results.candidates.length===0 ? (
        <div style={{textAlign:'center',padding:'20px 0',color:'var(--muted)',fontSize:'.85rem'}}>No votes yet — be the first!</div>
      ) : results.candidates.map((c,i) => {
        const pct = Math.round((c.voteCount||0)/total*100);
        const color = colors[i%colors.length];
        return (
          <div key={c._id} style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:`${color}22`,border:`2px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,fontSize:12}}>
                  {c.imageUrl?<img src={c.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
                </div>
                <div>
                  <div style={{fontSize:'.83rem',fontWeight:600}}>{c.name}</div>
                  <div style={{fontSize:'.7rem',color:'var(--muted)'}}>{c.party}</div>
                </div>
                {i===0&&c.voteCount>0&&<span className="badge badge-green" style={{fontSize:'.6rem',padding:'1px 6px'}}>Leading</span>}
              </div>
              <span style={{fontWeight:700,color,fontSize:'.88rem'}}>{pct}%</span>
            </div>
            <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:4,background:color,width:`${pct}%`,transition:'width 1s ease'}}/>
            </div>
            <div style={{fontSize:'.7rem',color:'var(--muted)',marginTop:2}}>{c.voteCount} votes</div>
          </div>
        );
      })}
      <div style={{fontSize:'.7rem',color:'var(--muted)',textAlign:'right',fontFamily:'var(--font-mono)',marginTop:8}}>Auto-refreshes every 15s</div>
    </div>
  );
}

export default function UserDashboard() {
  const navigate   = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [activeEl,   setActiveEl]   = useState(null);
  const [allElections,setAllElections]=useState([]);
  const [isRegistered,setIsRegistered]=useState(false);
  const [hasVoted,   setHasVoted]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [partyFilter,setPartyFilter] = useState('All');
  const [compareMode,setCompareMode] = useState(false);
  const [compared,   setCompared]   = useState([]);
  const [tab,        setTab]        = useState('candidates'); // candidates | elections | audit

  const userInfo = JSON.parse(localStorage.getItem('userInfo')||'{}');
  const token    = localStorage.getItem('userToken');

  const logout = () => { localStorage.clear(); navigate('/user/login'); };

  const loadAll = useCallback(async () => {
    try {
      const [candRes, elRes, statusRes, allElRes] = await Promise.all([
        api.get('/api/candidates/public'),
        api.get('/api/elections/active'),
        token ? api.get('/api/voter/status') : Promise.resolve({data:{isRegistered:false,hasVoted:false}}),
        api.get('/api/elections/all-public').catch(()=>({data:[]})),
      ]);
      setCandidates(candRes.data);
      const actives = Array.isArray(elRes.data)?elRes.data:[elRes.data].filter(Boolean);
      setActiveEl(actives[0]||null);
      setIsRegistered(statusRes.data.isRegistered);
      setHasVoted(statusRes.data.hasVoted);
      setAllElections(allElRes.data||[]);
    } catch {
      setCandidates([
        {_id:'c1',name:'Alice Kumar',party:'Progressive Alliance',age:45,qualification:'MBA, Harvard',bio:'Committed to digital governance and transparent elections.',imageUrl:'',voteCount:124},
        {_id:'c2',name:'Bob Sherpa', party:'Reform Coalition',    age:52,qualification:'LLB, National Law',bio:'Advocating for legal reforms and rural development.',imageUrl:'',voteCount:98},
        {_id:'c3',name:'Clara Thapa',party:'Green Future',        age:39,qualification:'PhD Environmental',bio:'Championing green energy and a sustainable future.',imageUrl:'',voteCount:76},
      ]);
      setActiveEl({_id:'demo',title:'Presidential Election 2024',endDate:'2025-12-31T18:00:00Z',startDate:'2025-01-01T00:00:00Z'});
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const colors    = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  const parties   = ['All', ...new Set(candidates.map(c=>c.party))];
  const filtered  = partyFilter==='All' ? candidates : candidates.filter(c=>c.party===partyFilter);
  const pColor    = p => colors[parties.indexOf(p)%colors.length]||'var(--muted)';
  const totalVotes= candidates.reduce((s,c)=>s+(c.voteCount||0),1);

  const toggleCompare = (c) => {
    if (compared.find(x=>x._id===c._id)) setCompared(compared.filter(x=>x._id!==c._id));
    else if (compared.length<3) setCompared([...compared,c]);
  };

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
          {isRegistered&&hasVoted&&<span className="badge badge-green">✅ Voted</span>}
          {isRegistered&&!hasVoted&&<Link to="/user/vote" className="btn btn-primary btn-sm">🗳️ Vote Now</Link>}
          {!isRegistered&&<Link to="/user/register-voter" className="btn btn-outline btn-sm">📋 Register</Link>}
          <button onClick={logout} className="btn btn-outline btn-sm" title="Logout">🚪</button>
        </div>
      </nav>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>

        {/* Welcome banner */}
        <div style={{background:'linear-gradient(135deg,rgba(98,126,234,0.08),rgba(139,92,246,0.06))',border:'1px solid rgba(98,126,234,0.2)',borderRadius:16,padding:'20px 24px',marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.3rem',marginBottom:4}}>Welcome back, {userInfo.name||'Voter'} 👋</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <span className={`badge ${isRegistered?'badge-green':'badge-amber'}`}>{isRegistered?'✅ Registered Voter':'⚠ Not Registered'}</span>
              {isRegistered&&<span className={`badge ${hasVoted?'badge-purple':'badge-blue'}`}>{hasVoted?'🗳️ Vote Submitted':'🔵 Ready to Vote'}</span>}
              {activeEl&&<span className="badge badge-green" style={{animation:'pulse 2s infinite'}}>🟢 Election Active</span>}
            </div>
          </div>
          {activeEl&&(
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700,marginBottom:4}}>{activeEl.title}</div>
              <div style={{fontSize:'.8rem',color:'var(--muted)'}}>Closes {new Date(activeEl.endDate).toLocaleString()}</div>
              {!isRegistered&&<Link to="/user/register-voter" className="btn btn-primary btn-sm" style={{marginTop:8}}>Register to Vote →</Link>}
              {isRegistered&&!hasVoted&&<Link to="/user/vote" className="btn btn-primary btn-sm" style={{marginTop:8}}>Cast Your Vote →</Link>}
            </div>
          )}
        </div>

        {/* Status cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:24}}>
          {[
            {label:'Candidates',value:candidates.length,icon:'👤',color:'#627EEA'},
            {label:'Total Votes',value:candidates.reduce((s,c)=>s+(c.voteCount||0),0),icon:'✅',color:'#10B981'},
            {label:'Parties',value:parties.length-1,icon:'🏛️',color:'#8B5CF6'},
            {label:'Elections',value:allElections.length,icon:'🗳️',color:'#F59E0B'},
          ].map((s,i)=>(
            <div key={i} className="card" style={{borderTop:`3px solid ${s.color}`,textAlign:'center',padding:'16px 12px'}}>
              <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
              <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.6rem',color:s.color}}>{s.value}</div>
              <div style={{fontSize:'.75rem',color:'var(--muted)'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--card)',borderRadius:12,padding:4,width:'fit-content'}}>
          {[
            {key:'candidates',label:'🏛️ Candidates'},
            {key:'elections', label:'🗳️ Elections'},
            {key:'audit',     label:'🔍 Public Audit'},
          ].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{padding:'8px 18px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:600,fontSize:'.83rem',transition:'all .2s',
                background:tab===t.key?'var(--eth)':'transparent',
                color:tab===t.key?'#fff':'var(--muted)'}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:24,alignItems:'start'}}>
          {/* Main content */}
          <div>
            {/* ── CANDIDATES TAB ── */}
            {tab==='candidates'&&(
              <>
                {/* Compare mode toggle */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {parties.map(p=>(
                      <button key={p} onClick={()=>setPartyFilter(p)}
                        style={{padding:'4px 14px',borderRadius:20,border:`1px solid ${partyFilter===p?pColor(p):'var(--border2)'}`,background:partyFilter===p?`${pColor(p)}18`:'transparent',color:partyFilter===p?pColor(p):'var(--muted)',fontSize:'.8rem',fontWeight:600,cursor:'pointer',transition:'all .2s'}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>{setCompareMode(!compareMode);setCompared([]);}}
                    className={`btn btn-sm ${compareMode?'btn-primary':'btn-outline'}`}>
                    {compareMode?'Exit Compare':'⚖️ Compare'}
                  </button>
                </div>

                {/* Compare panel */}
                {compareMode&&compared.length>0&&(
                  <div className="card" style={{marginBottom:16,background:'rgba(98,126,234,0.05)',borderColor:'rgba(98,126,234,0.2)'}}>
                    <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:12}}>⚖️ Candidate Comparison ({compared.length}/3)</div>
                    <div style={{display:'grid',gridTemplateColumns:`repeat(${compared.length},1fr)`,gap:12}}>
                      {compared.map(c=>{
                        const color=pColor(c.party);
                        return(
                          <div key={c._id} style={{textAlign:'center',padding:'12px 8px',background:'var(--card2)',borderRadius:10,border:`1px solid ${color}33`}}>
                            <div style={{width:44,height:44,borderRadius:'50%',background:`${color}22`,border:`2px solid ${color}`,margin:'0 auto 8px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                              {c.imageUrl?<img src={c.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
                            </div>
                            <div style={{fontWeight:700,fontSize:'.88rem'}}>{c.name}</div>
                            <span style={{display:'inline-block',padding:'2px 8px',borderRadius:10,background:`${color}18`,color,fontSize:'.7rem',fontWeight:700,margin:'4px 0'}}>{c.party}</span>
                            {c.age&&<div style={{fontSize:'.75rem',color:'var(--muted)'}}>Age: {c.age}</div>}
                            {c.qualification&&<div style={{fontSize:'.75rem',color:'var(--muted)'}}>{c.qualification}</div>}
                            <div style={{fontWeight:700,color,marginTop:6}}>{c.voteCount||0} votes</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {loading?(
                  <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading candidates…</div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
                    {filtered.map((c,i)=>{
                      const color=pColor(c.party);
                      const pct=Math.round((c.voteCount||0)/totalVotes*100);
                      const isCompared=compared.find(x=>x._id===c._id);
                      return(
                        <div key={c._id} className="card"
                          style={{position:'relative',overflow:'hidden',border:`2px solid ${isCompared?color:'var(--border)'}`,transition:'all .25s'}}>
                          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:color}}/>
                          <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12,paddingTop:4}}>
                            <div style={{width:56,height:56,borderRadius:'50%',background:`${color}18`,border:`2px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,overflow:'hidden'}}>
                              {c.imageUrl?<img src={c.imageUrl} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4}}>{c.name}</div>
                              <span style={{display:'inline-block',padding:'2px 10px',borderRadius:12,background:`${color}18`,border:`1px solid ${color}44`,color,fontSize:'.7rem',fontWeight:700}}>{c.party}</span>
                            </div>
                          </div>
                          {c.age&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'.8rem',marginBottom:4}}><span style={{color:'var(--muted)'}}>Age</span><span>{c.age}</span></div>}
                          {c.qualification&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'.8rem',marginBottom:4}}><span style={{color:'var(--muted)'}}>Education</span><span style={{textAlign:'right',maxWidth:130,fontSize:'.76rem'}}>{c.qualification}</span></div>}
                          {c.bio&&<p style={{fontSize:'.78rem',color:'var(--sub)',lineHeight:1.6,marginTop:8,marginBottom:10,borderTop:'1px solid var(--border)',paddingTop:8}}>{c.bio.slice(0,100)}{c.bio.length>100?'…':''}</p>}
                          <div style={{marginTop:8}}>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.72rem',marginBottom:4}}>
                              <span style={{color:'var(--muted)'}}>Votes</span>
                              <span style={{color,fontWeight:700}}>{c.voteCount||0} ({pct}%)</span>
                            </div>
                            <div style={{height:7,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                              <div style={{height:'100%',borderRadius:4,background:color,width:`${pct}%`,transition:'width 1s ease'}}/>
                            </div>
                          </div>
                          {compareMode&&(
                            <button onClick={()=>toggleCompare(c)}
                              style={{marginTop:10,width:'100%',padding:'6px',borderRadius:8,border:`1px solid ${color}`,background:isCompared?color:'transparent',color:isCompared?'#fff':color,cursor:'pointer',fontSize:'.78rem',fontWeight:600,transition:'all .2s'}}>
                              {isCompared?'✓ Added':'+ Compare'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── ELECTIONS TAB ── */}
            {tab==='elections'&&(
              <div>
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:16}}>All Elections — Transparency Record</div>
                {allElections.length===0?(
                  <div className="card" style={{textAlign:'center',padding:'40px 0',color:'var(--muted)'}}>No elections found</div>
                ):(
                  allElections.map(e=>{
                    const st=getStatus(e.startDate,e.endDate);
                    const badgeClass=st==='active'?'badge-green':st==='upcoming'?'badge-blue':'badge-purple';
                    return(
                      <div key={e._id} className="card" style={{marginBottom:12}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:6}}>{e.title}</div>
                            {e.description&&<div style={{fontSize:'.82rem',color:'var(--sub)',marginBottom:8}}>{e.description}</div>}
                            <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:'.78rem',color:'var(--muted)'}}>
                              <span>📅 {e.startDate?new Date(e.startDate).toLocaleDateString():'-'}</span>
                              <span>→</span>
                              <span>{e.endDate?new Date(e.endDate).toLocaleDateString():'-'}</span>
                              {e.cid&&<span style={{fontFamily:'var(--font-mono)',fontSize:'.7rem'}}>IPFS: {e.cid.slice(0,12)}…</span>}
                            </div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                            <span className={`badge ${badgeClass}`} style={{textTransform:'capitalize'}}>{st}</span>
                            <div style={{fontWeight:700,color:'var(--eth)'}}>{e.totalVotes||0} votes</div>
                          </div>
                        </div>
                        {st==='active'&&isRegistered&&!hasVoted&&(
                          <Link to="/user/vote" className="btn btn-primary btn-sm" style={{marginTop:10}}>Vote in This Election →</Link>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── PUBLIC AUDIT TAB ── */}
            {tab==='audit'&&(
              <div>
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:8}}>🔍 Public Audit Trail</div>
                <div style={{fontSize:'.83rem',color:'var(--sub)',marginBottom:16,lineHeight:1.7}}>
                  Every vote is stored on IPFS with a unique content identifier (CID). You can verify any vote record independently at <a href="https://ipfs.io" target="_blank" rel="noopener noreferrer" style={{color:'var(--eth)'}}>ipfs.io ↗</a>. Vote contents are encrypted — only aggregate counts are visible.
                </div>
                <div className="card" style={{background:'rgba(20,184,166,0.04)',borderColor:'rgba(20,184,166,0.2)'}}>
                  <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:12,color:'var(--teal)'}}>🔐 Privacy Guarantee</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {[
                      ['ZK-SNARK Proof','Your vote is cryptographically proven without revealing your choice'],
                      ['AES-256 Encryption','Candidate selection encrypted before IPFS storage'],
                      ['Nullifier Hash','Prevents double-voting while keeping your identity private'],
                      ['Ethereum Timestamp','Every vote timestamped on-chain permanently'],
                      ['IPFS Immutability','Once stored, vote records cannot be modified or deleted'],
                    ].map(([title,desc])=>(
                      <div key={title} style={{display:'flex',gap:12,padding:'10px 12px',background:'rgba(255,255,255,0.02)',borderRadius:9}}>
                        <span style={{color:'var(--green)',flexShrink:0,marginTop:1}}>✅</span>
                        <div>
                          <div style={{fontSize:'.83rem',fontWeight:600,marginBottom:2}}>{title}</div>
                          <div style={{fontSize:'.78rem',color:'var(--sub)'}}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div style={{position:'sticky',top:80}}>
            {activeEl&&<LiveResultsWidget electionId={activeEl._id}/>}

            {/* Voter actions */}
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:12}}>Your Actions</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {!isRegistered&&(
                  <Link to="/user/register-voter" className="btn btn-primary btn-full">📋 Register as Voter →</Link>
                )}
                {isRegistered&&!hasVoted&&activeEl&&(
                  <Link to="/user/vote" className="btn btn-primary btn-full">🗳️ Cast Your Vote →</Link>
                )}
                {hasVoted&&(
                  <div style={{background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
                    <div style={{fontSize:18,marginBottom:4}}>✅</div>
                    <div style={{fontWeight:700,fontSize:'.88rem',color:'var(--green)'}}>Vote Recorded</div>
                    <div style={{fontSize:'.75rem',color:'var(--muted)',marginTop:4}}>Check your email for receipt</div>
                  </div>
                )}
              </div>
            </div>

            {/* MetaMask status */}
            <div className="card card-sm" style={{background:'rgba(245,158,11,0.05)',borderColor:'rgba(245,158,11,0.2)'}}>
              <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--amber)',marginBottom:6}}>🦊 MetaMask Required</div>
              <div style={{fontSize:'.78rem',color:'var(--sub)',lineHeight:1.7}}>
                Install MetaMask → connect to <strong style={{color:'var(--text)'}}>Localhost 8545 (Chain 1337)</strong>
              </div>
              {typeof window!=='undefined'&&window.ethereum&&(
                <div style={{marginTop:8,fontSize:'.75rem',color:'var(--green)',fontWeight:600}}>✅ MetaMask detected</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}