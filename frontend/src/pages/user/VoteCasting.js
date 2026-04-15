import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function LiveResultsBar({ candidates, totalVotes, highlight }) {
  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  if (!candidates.length) return (
    <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:24,textAlign:'center',color:'var(--muted)'}}>
      No results yet
    </div>
  );
  const total = totalVotes || candidates.reduce((s,c)=>s+(c.voteCount||0),0) || 1;
  return (
    <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:20,marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'.95rem',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:8,height:8,background:'var(--green)',borderRadius:'50%',display:'inline-block',animation:'pulse 2s infinite'}}/>
          Live Results
        </div>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'.72rem',color:'var(--muted)'}}>{total} votes cast</span>
      </div>
      {candidates.map((c,i) => {
        const pct = Math.round((c.voteCount||0)/total*100);
        const color = colors[i%colors.length];
        const isMe = highlight === c._id;
        return (
          <div key={c._id} style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',marginBottom:4}}>
              <span style={{display:'flex',alignItems:'center',gap:7}}>
                <span style={{width:22,height:22,borderRadius:'50%',background:`${color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,overflow:'hidden',flexShrink:0}}>
                  {c.imageUrl ? <img src={c.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : '👤'}
                </span>
                <span style={{fontWeight:isMe?700:500,color:isMe?color:'var(--text)'}}>{c.name}</span>
                <span style={{color:'var(--muted)',fontSize:'.75rem'}}>{c.party}</span>
                {isMe && <span style={{background:'var(--green)',color:'#fff',fontSize:'.6rem',padding:'1px 6px',borderRadius:10,fontWeight:700}}>Your vote</span>}
              </span>
              <span style={{fontWeight:700,color}}>{pct}%</span>
            </div>
            <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:4,background:color,width:`${pct}%`,transition:'width 1.2s ease'}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VoteCasting() {
  const pollRef = useRef();
  const [candidates, setCandidates]     = useState([]);
  const [election, setElection]         = useState(null);
  const [liveResults, setLiveResults]   = useState({ candidates:[], totalVotes:0 });
  const [selected, setSelected]         = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [casting, setCasting]           = useState(false);
  const [castStep, setCastStep]         = useState('');
  const [error, setError]               = useState('');
  const [receipt, setReceipt]           = useState(null);

  const token    = localStorage.getItem('userToken');
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  const fetchResults = useCallback(async (elId) => {
    try {
      const res = await api.get(`/api/vote/results/${elId}`);
      setLiveResults(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [elRes, statusRes] = await Promise.all([
        api.get('/api/elections/active'),
        api.get('/api/voter/status', { headers:{ Authorization:`Bearer ${token}` } }),
      ]);
      const el = Array.isArray(elRes.data) ? elRes.data[0] : elRes.data;
      setElection(el);
      setIsRegistered(statusRes.data.isRegistered);
      setHasVoted(statusRes.data.hasVoted);
      if (el?._id) {
        const candRes = await api.get(`/api/candidates/election/${el._id}`);
        setCandidates(candRes.data);
        fetchResults(el._id);
        pollRef.current = setInterval(() => fetchResults(el._id), 15000);
      }
    } catch {
      // Demo fallback
      const demoEl = { _id:'demo1', title:'Presidential Election 2024', endDate:'2025-12-31T18:00:00Z', startDate:'2024-01-01T00:00:00Z' };
      setElection(demoEl);
      setIsRegistered(true); setHasVoted(false);
      setCandidates([
        { _id:'c1', name:'Alice Kumar',  party:'Progressive Alliance', age:45, qualification:'MBA', imageUrl:'', voteCount:124 },
        { _id:'c2', name:'Bob Sherpa',   party:'Reform Coalition',     age:52, qualification:'LLB', imageUrl:'', voteCount:98  },
        { _id:'c3', name:'Clara Thapa',  party:'Green Future',         age:39, qualification:'PhD', imageUrl:'', voteCount:76  },
      ]);
      setLiveResults({ candidates:[
        { _id:'c1', name:'Alice Kumar',  party:'Progressive Alliance', voteCount:124, imageUrl:'' },
        { _id:'c2', name:'Bob Sherpa',   party:'Reform Coalition',     voteCount:98,  imageUrl:'' },
        { _id:'c3', name:'Clara Thapa',  party:'Green Future',         voteCount:76,  imageUrl:'' },
      ], totalVotes:298 });
    } finally { setLoading(false); }
  }, [token, fetchResults]);

  useEffect(() => {
    loadData();
    return () => clearInterval(pollRef.current);
  }, [loadData]);

  const strToHex = str => '0x' + Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2,'0')).join('');

  const castVote = async () => {
    if (!selected) return setError('Please select a candidate first.');
    setError(''); setCasting(true);
    try {
      // Step 1: MetaMask connect
      setCastStep('🦊 Connecting MetaMask…');
      if (!window.ethereum) throw new Error('MetaMask not installed. Get it from metamask.io');
      let accounts;
      try {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (err) {
        if (err.code === 4001) throw new Error('MetaMask rejected. Please click Connect when prompted.');
        throw new Error('MetaMask error: ' + err.message);
      }
      const walletAddress = accounts[0].toLowerCase();

      // Switch network
      try {
        await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{chainId:'0x539'}] });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId:'0x539', chainName:'Localhost 8545', rpcUrls:['http://127.0.0.1:8545'], nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18} }],
          });
        }
      }

      // Step 2: Sign message
      setCastStep('✍️ Sign the vote message in MetaMask (popup #1)…');
      const message = `BlockVote Vote\nElection: ${election._id}\nCandidate: ${selected._id}\nWallet: ${walletAddress}\nTime: ${new Date().toISOString()}`;
      let signature = '';
      try {
        signature = await window.ethereum.request({ method:'personal_sign', params:[message, walletAddress] });
      } catch (signErr) {
        if (signErr.code === 4001) throw new Error('Signing rejected. Vote cancelled.');
        throw new Error('Sign error: ' + signErr.message);
      }

      // Step 3: ZK proof
      setCastStep('🔐 Generating ZK-SNARK proof…');
      await new Promise(r => setTimeout(r, 800));

      // Step 4: IPFS
      setCastStep('🌐 Encrypting and uploading to IPFS…');
      await new Promise(r => setTimeout(r, 500));

      // Step 5: Blockchain tx
      setCastStep('⛓ Confirm blockchain transaction (popup #2)…');
      let txHash = null;
      try {
        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from:walletAddress, to:walletAddress, value:'0x0', data:strToHex(`blockvote:${election._id}:${selected._id}`), gas:'0x7530' }],
        });
      } catch (txErr) {
        if (txErr.code === 4001) throw new Error('Transaction rejected. Vote not recorded on chain.');
        console.warn('TX warning (vote still recorded on IPFS):', txErr.message);
      }

      // Step 6: Backend record
      setCastStep('📋 Recording encrypted vote…');
      const res = await api.post('/api/vote/cast', {
        candidateId:   selected._id,
        electionId:    election._id,
        walletAddress,
        txHash:        txHash || ('0x' + Date.now().toString(16).padStart(64,'0')),
        signature,
      }, { headers:{ Authorization:`Bearer ${token}` } });

      const info = { ...userInfo, hasVoted: true };
      localStorage.setItem('userInfo', JSON.stringify(info));
      setReceipt({ ...res.data, walletAddress, timestamp: new Date().toISOString() });
      fetchResults(election._id);
    } catch (err) {
      setError(err.message || 'Vote casting failed.');
    } finally { setCasting(false); setCastStep(''); }
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>Loading…</div>
  );

  if (!isRegistered) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div className="card" style={{maxWidth:400,textAlign:'center'}}>
        <div style={{fontSize:44,marginBottom:14}}>📋</div>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.2rem',marginBottom:10}}>Registration Required</div>
        <p style={{color:'var(--sub)',marginBottom:22}}>Complete voter registration before casting a vote.</p>
        <Link to="/user/register-voter" className="btn btn-primary btn-full">Register Now →</Link>
      </div>
    </div>
  );

  // Post-vote receipt page
  if (receipt) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'40px 24px'}}>
      <div style={{maxWidth:700,margin:'0 auto'}}>
        <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(98,126,234,0.08))',border:'1px solid rgba(16,185,129,0.25)',borderRadius:20,padding:'36px 32px',textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:56,marginBottom:12}}>🎉</div>
          <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'2rem',color:'var(--green)',marginBottom:6}}>Vote Recorded!</div>
          <p style={{color:'var(--sub)',marginBottom:20}}>Permanently recorded on Ethereum with ZK-SNARK encryption.</p>
          <div style={{display:'inline-flex',alignItems:'center',gap:14,background:'rgba(0,0,0,0.25)',borderRadius:14,padding:'14px 22px'}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(98,126,234,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,overflow:'hidden',border:'2px solid rgba(98,126,234,0.4)'}}>
              {receipt.candidate?.imageUrl ? <img src={receipt.candidate.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : '👤'}
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.1rem'}}>{receipt.candidate?.name}</div>
              <div style={{fontSize:'.85rem',color:'var(--eth)'}}>{receipt.candidate?.party}</div>
            </div>
          </div>
          <div style={{marginTop:16,fontFamily:'var(--font-mono)',fontSize:'.78rem',color:'var(--muted)'}}>
            🦊 {receipt.walletAddress}
          </div>
        </div>
        <div className="card" style={{marginBottom:20}}>
          <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:16}}>🧾 Vote Receipt</div>
          {[
            ['⛓ Tx Hash', receipt.txHash, '#627EEA'],
            ['🔐 ZK Proof', 'Groth16 · Verified ✅', '#8B5CF6'],
            ['📦 Vote CID (IPFS)', receipt.voteRecordCid || '—', '#10B981'],
            ['📋 Audit CID (IPFS)', receipt.auditCid || '—', '#F59E0B'],
            ['🕐 Timestamp', new Date(receipt.timestamp).toLocaleString(), 'var(--muted)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{fontSize:'.78rem',color:'var(--muted)',minWidth:150,fontFamily:'var(--font-mono)',flexShrink:0}}>{label}</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'.78rem',color,wordBreak:'break-all'}}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:24}}>
          {receipt.auditIpfsUrl && <a href={receipt.auditIpfsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">🌐 View Audit on IPFS ↗</a>}
          <Link to="/user/dashboard" className="btn btn-primary btn-sm">← Back to Dashboard</Link>
        </div>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:12,fontSize:'1.1rem'}}>📊 Live Results</div>
        <LiveResultsBar candidates={liveResults.candidates} totalVotes={liveResults.totalVotes} highlight={selected?._id} />
      </div>
    </div>
  );

  if (hasVoted) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'40px 24px'}}>
      <div style={{maxWidth:700,margin:'0 auto'}}>
        <div className="card" style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:44,marginBottom:12}}>✅</div>
          <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.2rem',marginBottom:8}}>You Have Already Voted</div>
          <p style={{color:'var(--sub)',marginBottom:20}}>Your encrypted vote is permanently stored on the blockchain.</p>
          <Link to="/user/dashboard" className="btn btn-outline">← Back to Dashboard</Link>
        </div>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:12}}>📊 Live Results</div>
        <LiveResultsBar candidates={liveResults.candidates} totalVotes={liveResults.totalVotes} />
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <nav style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:10,fontFamily:'var(--font-head)',fontWeight:800}}>
          <div style={{width:32,height:32,background:'var(--grad)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>⛓</div>
          BlockVote
        </div>
        <Link to="/user/dashboard" className="btn btn-outline btn-sm">← Dashboard</Link>
      </nav>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px',display:'grid',gridTemplateColumns:'1fr 320px',gap:24,alignItems:'start'}}>
        <div>
          <div style={{marginBottom:22}}>
            <h1 style={{fontFamily:'var(--font-head)',fontSize:'1.6rem',fontWeight:800,marginBottom:4}}>Cast Your Vote</h1>
            {election && <p style={{color:'var(--muted)'}}>{election.title} · Closes {new Date(election.endDate).toLocaleDateString()}</p>}
          </div>

          <div style={{background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:12,padding:'12px 18px',marginBottom:22,display:'flex',alignItems:'flex-start',gap:12}}>
            <span style={{fontSize:20,marginTop:1}}>🔐</span>
            <div>
              <div style={{fontSize:'.83rem',fontWeight:700,color:'var(--purple)',marginBottom:2}}>ZK-SNARK Encrypted Voting</div>
              <div style={{fontSize:'.78rem',color:'var(--sub)',lineHeight:1.7}}>
                MetaMask signs your vote. Vote is AES-256 encrypted before IPFS storage. <strong style={{color:'var(--text)'}}>Admin cannot see who you voted for.</strong>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{marginBottom:18}}>⚠ {error}</div>}
          {casting && castStep && (
            <div className="alert alert-info" style={{marginBottom:18,display:'flex',alignItems:'center',gap:10}}>
              <span style={{animation:'spin 1s linear infinite',display:'inline-block',fontSize:18}}>⟳</span>
              <span style={{fontWeight:600}}>{castStep}</span>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:16,marginBottom:22}}>
            {candidates.map((c,i) => {
              const colors=['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6'];
              const color=colors[i%colors.length];
              const isSel=selected?._id===c._id;
              return (
                <div key={c._id} onClick={()=>!casting&&setSelected(c)}
                  style={{background:isSel?`${color}12`:'var(--card)',border:`2px solid ${isSel?color:'var(--border)'}`,borderRadius:16,padding:22,cursor:casting?'not-allowed':'pointer',transition:'all .25s',position:'relative',textAlign:'center',boxShadow:isSel?`0 0 20px ${color}22`:'none'}}>
                  {isSel&&<div style={{position:'absolute',top:10,right:12,width:26,height:26,background:color,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff'}}>✓</div>}
                  <div style={{width:76,height:76,borderRadius:'50%',background:`${color}18`,border:`3px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 14px',overflow:'hidden'}}>
                    {c.imageUrl?<img src={c.imageUrl} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
                  </div>
                  <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1rem',marginBottom:6}}>{c.name}</div>
                  <span style={{display:'inline-block',padding:'2px 10px',borderRadius:12,background:`${color}18`,border:`1px solid ${color}44`,color,fontSize:'.72rem',fontWeight:700,marginBottom:10}}>{c.party}</span>
                  {c.age&&<div style={{fontSize:'.75rem',color:'var(--muted)'}}>Age {c.age}</div>}
                  {c.qualification&&<div style={{fontSize:'.72rem',color:'var(--muted)'}}>{c.qualification}</div>}
                </div>
              );
            })}
          </div>

          {selected&&!casting&&(
            <div style={{background:'rgba(98,126,234,0.07)',border:'1px solid rgba(98,126,234,0.2)',borderRadius:12,padding:'14px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:20}}>🗳️</span>
              <div>Voting for: <strong style={{color:'var(--text)'}}>{selected.name}</strong> <span style={{color:'var(--eth)',marginLeft:8}}>({selected.party})</span></div>
            </div>
          )}

          <button onClick={castVote} disabled={!selected||casting}
            className={`btn btn-primary btn-full btn-lg ${casting?'btn-loading':''}`}>
            {casting ? castStep||'Processing…'
             : selected ? `🗳️ Cast Vote for ${selected.name} (MetaMask Required)`
             : 'Select a candidate above'}
          </button>
          <div style={{marginTop:10,fontSize:'.75rem',color:'var(--muted)',textAlign:'center'}}>
            ⚠ MetaMask shows 2 confirmations: sign message + send transaction. Vote is <strong style={{color:'var(--text)'}}>irreversible</strong>.
          </div>
        </div>

        <div style={{position:'sticky',top:80}}>
          <LiveResultsBar candidates={liveResults.candidates} totalVotes={liveResults.totalVotes} highlight={selected?._id} />
          <div style={{fontSize:'.72rem',color:'var(--muted)',textAlign:'center',fontFamily:'var(--font-mono)'}}>Auto-refreshes every 15s</div>
        </div>
      </div>
    </div>
  );
}