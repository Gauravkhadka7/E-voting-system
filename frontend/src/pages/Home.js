import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

// ── Mini bar chart (no external lib) ────────────────────────
function MiniBar({ data, height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height}}>
      {data.map((d,i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{width:'100%',background:'rgba(255,255,255,0.05)',borderRadius:4,height:height-20,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
            <div style={{width:'100%',background:colors[i%colors.length],borderRadius:4,height:`${(d.value/max)*100}%`,transition:'height 1.5s ease',opacity:.85}}/>
          </div>
          <div style={{fontSize:'.62rem',color:'var(--muted)',textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:40}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Mini donut ───────────────────────────────────────────────
function MiniDonut({ segments, size = 90 }) {
  const total = segments.reduce((s,x)=>s+x.value,0)||1;
  let offset = 0;
  const r=35,cx=45,cy=45,circ=2*Math.PI*r;
  return (
    <svg width={size} height={size} viewBox="0 0 90 90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
      {segments.map((seg,i)=>{
        const dash=(seg.value/total)*circ;
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
          strokeWidth="12" strokeDasharray={`${dash} ${circ-dash}`}
          strokeDashoffset={-offset*circ/total+circ*0.25} strokeLinecap="round"
          style={{transition:'stroke-dasharray 1.5s ease'}}/>;
        offset+=seg.value; return el;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fill="var(--text)" fontSize="13" fontWeight="700">{total}</text>
    </svg>
  );
}

// ── Live ticker ──────────────────────────────────────────────
function StatTicker({ value, label, color, icon }) {
  return (
    <div style={{textAlign:'center',padding:'16px 12px',background:'var(--card)',borderRadius:12,border:'1px solid var(--border)',borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.8rem',color}}>{value}</div>
      <div style={{fontSize:'.72rem',color:'var(--muted)',marginTop:2}}>{label}</div>
    </div>
  );
}

const getStatus = (s,e) => {
  const now=new Date();
  if(!s||!e) return 'unknown';
  if(now<new Date(s)) return 'upcoming';
  if(now>new Date(e)) return 'completed';
  return 'active';
};

export default function Home() {
  const navigate = useNavigate();
  const [stats,     setStats]     = useState({ elections:0, candidates:0, totalVotes:0, voters:0 });
  const [elections, setElections] = useState([]);
  const [candidates,setCandidates]= useState([]);
  const [loading,   setLoading]   = useState(true);

  const adminToken = localStorage.getItem('adminToken');
  const userToken  = localStorage.getItem('userToken');
  const userInfo   = JSON.parse(localStorage.getItem('userInfo')||'{}');

  useEffect(() => {
    Promise.all([
      api.get('/api/elections/all-public').catch(()=>({data:[]})),
      api.get('/api/candidates/public').catch(()=>({data:[]})),
    ]).then(([elRes, candRes]) => {
      const els  = elRes.data  || [];
      const cands= candRes.data|| [];
      setElections(els);
      setCandidates(cands);
      setStats({
        elections:  els.length,
        candidates: cands.length,
        totalVotes: cands.reduce((s,c)=>s+(c.voteCount||0),0),
        voters:     0,
      });
    }).catch(()=>{
      // Demo data
      const demoEls=[
        {_id:'1',title:'Presidential Election 2024',startDate:'2024-12-01',endDate:'2024-12-15',totalVotes:186},
        {_id:'2',title:'Municipal Elections',startDate:'2025-06-10',endDate:'2025-06-20',totalVotes:0},
        {_id:'3',title:'Student Union Vote',startDate:'2024-11-01',endDate:'2024-11-05',totalVotes:320},
      ];
      const demoCands=[
        {_id:'c1',name:'Alice Kumar',party:'Progressive Alliance',voteCount:124},
        {_id:'c2',name:'Bob Sherpa', party:'Reform Coalition',    voteCount:98},
        {_id:'c3',name:'Clara Thapa',party:'Green Future',        voteCount:76},
        {_id:'c4',name:'David Rai',  party:'Progressive Alliance',voteCount:55},
      ];
      setElections(demoEls);
      setCandidates(demoCands);
      setStats({elections:3,candidates:12,totalVotes:506,voters:0});
    }).finally(()=>setLoading(false));
  },[]);

  const colors   = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  const barData  = candidates.slice(0,6).map(c=>({label:c.name.split(' ')[0],value:c.voteCount||0}));
  const donutData= [...new Set(candidates.map(c=>c.party))].slice(0,5).map((p,i)=>({
    label:p, value:candidates.filter(c=>c.party===p).reduce((s,c)=>s+(c.voteCount||0),0), color:colors[i]
  }));

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',overflowX:'hidden'}}>

      {/* Background */}
      <div style={{position:'fixed',inset:0,zIndex:0,
        background:'radial-gradient(ellipse at 15% 40%,rgba(98,126,234,0.12) 0%,transparent 55%),radial-gradient(ellipse at 85% 60%,rgba(139,92,246,0.09) 0%,transparent 55%)',
        pointerEvents:'none'}}/>

      {/* Nav */}
      <nav style={{background:'rgba(6,11,24,0.85)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',height:58,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:9,fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.05rem'}}>
          <div style={{width:30,height:30,background:'var(--grad)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>⛓</div>
          BlockVote
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {adminToken && <button onClick={()=>navigate('/admin/dashboard')} className="btn btn-outline btn-sm">Admin Dashboard →</button>}
          {userToken  && <button onClick={()=>navigate('/user/dashboard')}  className="btn btn-primary btn-sm">My Dashboard →</button>}
          {!userToken && !adminToken && (
            <>
              <Link to="/user/login"  className="btn btn-outline btn-sm">Sign In</Link>
              <Link to="/user/signup" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </nav>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 24px',position:'relative',zIndex:1}}>

        {/* Hero */}
        <div style={{textAlign:'center',padding:'64px 0 48px'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(98,126,234,0.08)',border:'1px solid rgba(98,126,234,0.2)',borderRadius:20,padding:'5px 16px',fontSize:'.75rem',fontWeight:700,color:'var(--eth)',marginBottom:24,fontFamily:'var(--font-mono)'}}>
            <span style={{width:7,height:7,background:'var(--eth)',borderRadius:'50%',animation:'pulse 2s infinite',display:'inline-block'}}/>
            Blockchain E-Voting · Ethereum · ZK-SNARKs · IPFS
          </div>
          <h1 style={{fontFamily:'var(--font-head)',fontSize:'clamp(2rem,5vw,3.4rem)',fontWeight:800,lineHeight:1.1,marginBottom:16}}>
            The Future of<br/><span className="grad-text">Democratic Voting</span>
          </h1>
          <p style={{fontSize:'1rem',color:'var(--sub)',maxWidth:520,margin:'0 auto 36px',lineHeight:1.8}}>
            Every vote is cryptographically secured, stored on IPFS, and recorded on the Ethereum blockchain. Transparent, verifiable, tamper-proof.
          </p>

          {/* Already logged in */}
          {(adminToken||userToken) ? (
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              {adminToken&&<button onClick={()=>navigate('/admin/dashboard')} className="btn btn-primary btn-lg">🔑 Admin Dashboard →</button>}
              {userToken &&<button onClick={()=>navigate('/user/dashboard')}  className="btn btn-primary btn-lg">🗳️ My Dashboard →</button>}
              <button onClick={()=>{localStorage.clear();window.location.reload();}} className="btn btn-outline">Logout</button>
            </div>
          ) : (
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <Link to="/user/signup" className="btn btn-primary btn-lg">🗳️ Register to Vote</Link>
              <Link to="/user/login"  className="btn btn-outline btn-lg">Sign In →</Link>
              <Link to="/admin/login" className="btn btn-outline btn-lg" style={{borderColor:'rgba(245,158,11,0.4)',color:'var(--amber)'}}>🔑 Admin Login</Link>
            </div>
          )}
        </div>

        {/* Live stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:40}}>
          <StatTicker value={stats.elections}  label="Total Elections"  color="#627EEA" icon="🗳️"/>
          <StatTicker value={stats.candidates} label="Candidates"       color="#8B5CF6" icon="👤"/>
          <StatTicker value={stats.totalVotes} label="Votes Cast"       color="#10B981" icon="✅"/>
          <StatTicker value={elections.filter(e=>getStatus(e.startDate,e.endDate)==='active').length} label="Active Elections" color="#F59E0B" icon="🟢"/>
        </div>

        {/* Charts row */}
        {!loading && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:40}}>

            {/* Bar chart — candidate vote counts */}
            <div className="card">
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4,fontSize:'.9rem'}}>📊 Vote Distribution</div>
              <div style={{fontSize:'.75rem',color:'var(--muted)',marginBottom:12}}>Votes per candidate</div>
              {barData.length>0 ? <MiniBar data={barData} height={100}/> : <div style={{color:'var(--muted)',textAlign:'center',padding:'20px 0',fontSize:'.85rem'}}>No data yet</div>}
            </div>

            {/* Donut — party distribution */}
            <div className="card">
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4,fontSize:'.9rem'}}>🏛️ Party Distribution</div>
              <div style={{fontSize:'.75rem',color:'var(--muted)',marginBottom:12}}>Votes by party</div>
              {donutData.length>0 ? (
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  <MiniDonut segments={donutData} size={90}/>
                  <div style={{flex:1}}>
                    {donutData.slice(0,4).map((d,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0}}/>
                          <span style={{fontSize:'.72rem',color:'var(--text)'}}>{d.label.slice(0,12)}</span>
                        </div>
                        <span style={{fontSize:'.72rem',fontWeight:700,color:d.color}}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div style={{color:'var(--muted)',textAlign:'center',padding:'20px 0',fontSize:'.85rem'}}>No data yet</div>}
            </div>

            {/* Election status summary */}
            <div className="card">
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4,fontSize:'.9rem'}}>⏱️ Election Status</div>
              <div style={{fontSize:'.75rem',color:'var(--muted)',marginBottom:12}}>Current overview</div>
              {['active','upcoming','completed'].map(st=>{
                const cnt = elections.filter(e=>getStatus(e.startDate,e.endDate)===st).length;
                const color = st==='active'?'#10B981':st==='upcoming'?'#627EEA':'#8B5CF6';
                const label = st==='active'?'Active':st==='upcoming'?'Upcoming':'Completed';
                return (
                  <div key={st} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,marginBottom:6,background:`${color}0D`,border:`1px solid ${color}22`}}>
                    <span style={{fontSize:'.82rem',color}}>{label}</span>
                    <span style={{fontFamily:'var(--font-head)',fontWeight:700,color,fontSize:'1.1rem'}}>{cnt}</span>
                  </div>
                );
              })}
              <div style={{fontSize:'.7rem',color:'var(--muted)',textAlign:'center',marginTop:8,fontFamily:'var(--font-mono)'}}>Live data • no login needed</div>
            </div>
          </div>
        )}

        {/* Election history — public, no login needed */}
        <div style={{marginBottom:40}}>
          <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.2rem',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
            📅 Election History
            <span className="badge badge-blue" style={{fontSize:'.72rem'}}>{elections.length} elections</span>
          </div>
          {loading ? (
            <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>Loading…</div>
          ) : elections.length===0 ? (
            <div className="card" style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No elections yet</div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
              {elections.slice(0,6).map(e=>{
                const st=getStatus(e.startDate,e.endDate);
                const badgeClass=st==='active'?'badge-green':st==='upcoming'?'badge-blue':'badge-purple';
                return (
                  <div key={e._id} className="card" style={{position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:st==='active'?'var(--green)':st==='upcoming'?'var(--eth)':'var(--purple)'}}/>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'.92rem',flex:1,paddingRight:8}}>{e.title}</div>
                      <span className={`badge ${badgeClass}`} style={{textTransform:'capitalize',flexShrink:0}}>{st}</span>
                    </div>
                    <div style={{fontSize:'.78rem',color:'var(--muted)',marginBottom:6}}>
                      {e.startDate?new Date(e.startDate).toLocaleDateString():''} → {e.endDate?new Date(e.endDate).toLocaleDateString():''}
                    </div>
                    <div style={{fontWeight:700,color:'var(--eth)',fontSize:'.88rem'}}>{e.totalVotes||0} votes cast</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature highlights */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16,marginBottom:48}}>
          {[
            {icon:'🔐',title:'ZK-SNARK Privacy',desc:'Vote content is encrypted — not even admin can read your choice'},
            {icon:'⛓',title:'Ethereum Blockchain',desc:'Every vote permanently recorded on-chain with a transaction hash'},
            {icon:'🌐',title:'IPFS Storage',desc:'Votes stored on decentralized IPFS — no single point of failure'},
            {icon:'🦊',title:'MetaMask Voting',desc:'Confirm your vote with MetaMask — two-step cryptographic signing'},
            {icon:'📊',title:'Live Results',desc:'Real-time vote counts updated every 15 seconds on your dashboard'},
            {icon:'📋',title:'Verifiable Receipts',desc:'Get an email receipt with your IPFS CID and transaction hash'},
          ].map((f,i)=>(
            <div key={i} className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:10}}>{f.icon}</div>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:6,fontSize:'.95rem'}}>{f.title}</div>
              <div style={{fontSize:'.8rem',color:'var(--sub)',lineHeight:1.7}}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!userToken && !adminToken && (
          <div style={{textAlign:'center',background:'linear-gradient(135deg,rgba(98,126,234,0.08),rgba(139,92,246,0.06))',border:'1px solid rgba(98,126,234,0.2)',borderRadius:20,padding:'40px 24px',marginBottom:48}}>
            <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.5rem',marginBottom:10}}>Ready to cast your vote?</div>
            <p style={{color:'var(--sub)',marginBottom:24,maxWidth:400,margin:'0 auto 24px'}}>Register in seconds, connect MetaMask, and participate in secure blockchain elections.</p>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <Link to="/user/signup" className="btn btn-primary btn-lg">🗳️ Register Now →</Link>
              <Link to="/user/login"  className="btn btn-outline btn-lg">Already have account? Sign In →</Link>
            </div>
          </div>
        )}

        {/* Tech badges */}
        <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:36,opacity:.5}}>
          {['Ethereum','Solidity 0.8','Hardhat','Ganache','ZK-SNARKs','IPFS / Pinata','MetaMask','React.js','Node.js','JWT Auth','bcrypt'].map(t=>(
            <span key={t} style={{fontFamily:'var(--font-mono)',fontSize:'.65rem',padding:'3px 10px',borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px solid var(--border2)',color:'var(--muted)'}}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}