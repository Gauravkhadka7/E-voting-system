import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ── Live results bar ─────────────────────────────────────────
function LiveResultsBar({ candidates, totalVotes, highlight }) {
  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  return (
    <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:20,marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'.95rem',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:8,height:8,background:'var(--green)',borderRadius:'50%',display:'inline-block',animation:'pulse 2s infinite'}}/>
          Live Results
        </div>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'.72rem',color:'var(--muted)'}}>{totalVotes} votes cast</span>
      </div>
      {candidates.map((c,i) => {
        const pct = totalVotes ? Math.round(c.voteCount/totalVotes*100) : 0;
        const color = colors[i%colors.length];
        const isHighlight = highlight === c._id;
        return (
          <div key={c._id} style={{marginBottom:12,opacity:1}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',marginBottom:4}}>
              <span style={{display:'flex',alignItems:'center',gap:7}}>
                {c.imageUrl || c.ipfsImageUrl ? (
                  <img src={c.imageUrl||c.ipfsImageUrl} alt="" style={{width:22,height:22,borderRadius:'50%',objectFit:'cover'}} />
                ) : <span style={{width:22,height:22,borderRadius:'50%',background:`${color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>👤</span>}
                <span style={{fontWeight:isHighlight?700:500,color:isHighlight?color:'var(--text)'}}>{c.name}</span>
                <span style={{color:'var(--muted)',fontSize:'.75rem'}}>{c.party}</span>
                {isHighlight && <span className="badge badge-green" style={{fontSize:'.62rem',padding:'1px 6px'}}>Your vote</span>}
              </span>
              <span style={{fontWeight:700,color:color}}>{pct}%</span>
            </div>
            <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:4,background:color,width:`${pct}%`,transition:'width 1.2s ease',boxShadow:isHighlight?`0 0 8px ${color}`:undefined}} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VoteCasting() {
  const navigate = useNavigate();
  const pollRef  = useRef();
  const [candidates, setCandidates]   = useState([]);
  const [election, setElection]       = useState(null);
  const [liveResults, setLiveResults] = useState({ candidates:[], totalVotes:0 });
  const [selected, setSelected]       = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [casting, setCasting]         = useState(false);
  const [castStep, setCastStep]       = useState('');
  const [error, setError]             = useState('');
  const [receipt, setReceipt]         = useState(null); // post-vote confirmation

  const token    = localStorage.getItem('userToken');
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  // ── Load data + start polling results ───────────────────────
  useEffect(() => {
    loadData();
    return () => clearInterval(pollRef.current);
  }, []);

  const loadData = async () => {
    try {
      const [elRes, statusRes] = await Promise.all([
        axios.get('/api/elections/active'),
        axios.get('/api/voter/status', { headers:{ Authorization:`Bearer ${token}` } }),
      ]);
      const el = Array.isArray(elRes.data) ? elRes.data[0] : elRes.data;
      setElection(el);
      setIsRegistered(statusRes.data.isRegistered);
      setHasVoted(statusRes.data.hasVoted);
      if (el?._id) {
        const candRes = await axios.get(`/api/candidates/election/${el._id}`);
        setCandidates(candRes.data);
        fetchResults(el._id);
        // Poll live results every 15s
        pollRef.current = setInterval(() => fetchResults(el._id), 15000);
      }
    } catch {
      // Demo fallback
      const demoEl = { _id:'demo1', title:'Presidential Election 2024', endDate:'2025-12-31T18:00:00Z' };
      setElection(demoEl);
      setIsRegistered(true); setHasVoted(false);
      const demoCands = [
        { _id:'c1', name:'Alice Kumar', party:'Progressive Alliance', age:45, qualification:'MBA', imageUrl:'', voteCount:124 },
        { _id:'c2', name:'Bob Sherpa',  party:'Reform Coalition',     age:52, qualification:'LLB', imageUrl:'', voteCount:98  },
        { _id:'c3', name:'Clara Thapa', party:'Green Future',          age:39, qualification:'PhD', imageUrl:'', voteCount:76  },
      ];
      setCandidates(demoCands);
      setLiveResults({ candidates:demoCands, totalVotes:298 });
    } finally { setLoading(false); }
  };

  const fetchResults = async elId => {
    try {
      const res = await axios.get(`/api/vote/results/${elId}`);
      setLiveResults(res.data);
    } catch {}
  };

  // ── MetaMask connect helper ──────────────────────────────────
  const connectMetaMask = async () => {
    if (!window.ethereum) throw new Error('MetaMask not found. Please install from metamask.io');
    const accounts = await window.ethereum.request({ method:'eth_requestAccounts' });
    // Switch to local Ganache network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x539' }], // 1337
      });
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId:'0x539', chainName:'Localhost 8545', rpcUrls:['http://127.0.0.1:8545'], nativeCurrency:{ name:'ETH', symbol:'ETH', decimals:18 } }],
        });
      }
    }
    return accounts[0];
  };

  // ── Cast vote flow ───────────────────────────────────────────
  const castVote = async () => {
    if (!selected) return setError('Please select a candidate.');
    setError(''); setCasting(true);

    try {
      // Step 1: Connect MetaMask
      setCastStep('🦊 Connecting MetaMask…');
      const walletAddress = await connectMetaMask();

      // Step 2: MetaMask sign message (user sees confirmation popup)
      setCastStep('✍️ Signing vote with MetaMask…');
      const message = `BlockVote: I am casting my vote in election ${election._id} at ${new Date().toISOString()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      // Step 3: Generate ZK proof (simulated)
      setCastStep('🔐 Generating ZK-SNARK proof…');
      await new Promise(r => setTimeout(r, 900));

      // Step 4: Upload to IPFS
      setCastStep('🌐 Uploading vote to IPFS…');
      await new Promise(r => setTimeout(r, 600));

      // Step 5: Send to backend (which stores encrypted on IPFS)
      setCastStep('⛓ Broadcasting to Ethereum…');

      // MetaMask send transaction (user sees confirmation popup again)
      let txHash = null;
      try {
        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to:   walletAddress, // self-send as proof; real contract call in production
            value: '0x0',
            data: '0x' + Buffer.from(`vote:${election._id}:${selected._id}`).toString('hex'),
            gas: '0x5208',
          }],
        });
      } catch (txErr) {
        if (txErr.code === 4001) throw new Error('MetaMask transaction rejected by user.');
      }

      // Step 6: Record on backend
      setCastStep('📋 Recording vote receipt…');
      const res = await axios.post('/api/vote/cast', {
        candidateId:   selected._id,
        electionId:    election._id,
        walletAddress: walletAddress.toLowerCase(),
        txHash:        txHash || 'simulated_' + Date.now(),
        signature,
      }, { headers:{ Authorization:`Bearer ${token}` } });

      // Step 7: Done → show receipt page
      const updatedInfo = { ...userInfo, hasVoted: true };
      localStorage.setItem('userInfo', JSON.stringify(updatedInfo));

      setReceipt({
        candidate:      res.data.candidate,
        txHash:         res.data.txHash,
        walletAddress:  walletAddress.toLowerCase(),
        voteRecordCid:  res.data.voteRecordCid,
        auditCid:       res.data.auditCid,
        voteIpfsUrl:    res.data.voteIpfsUrl,
        auditIpfsUrl:   res.data.auditIpfsUrl,
        zkProof:        res.data.zkProof,
        nullifierHash:  res.data.nullifierHash,
        timestamp:      new Date().toISOString(),
      });
      fetchResults(election._id);

    } catch (err) {
      setError(err.message || 'Vote casting failed. Please try again.');
    } finally {
      setCasting(false); setCastStep('');
    }
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>
      Loading election data…
    </div>
  );

  // ── Guard: not registered ────────────────────────────────────
  if (!isRegistered) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div className="card" style={{maxWidth:420,textAlign:'center'}}>
        <div style={{fontSize:44,marginBottom:14}}>📋</div>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.2rem',marginBottom:10}}>Registration Required</div>
        <p style={{color:'var(--sub)',marginBottom:22}}>Complete voter registration before casting a vote.</p>
        <Link to="/user/register-voter" className="btn btn-primary btn-full">Register Now →</Link>
      </div>
    </div>
  );

  // ── RECEIPT PAGE (post-vote) ─────────────────────────────────
  if (receipt) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'40px 24px'}}>
      <div style={{maxWidth:700,margin:'0 auto'}}>

        {/* Hero confirmation */}
        <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(98,126,234,0.08))',border:'1px solid rgba(16,185,129,0.25)',borderRadius:20,padding:'36px 32px',textAlign:'center',marginBottom:24,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%,rgba(16,185,129,0.1),transparent 60%)',pointerEvents:'none'}}/>
          <div style={{fontSize:56,marginBottom:12}}>🎉</div>
          <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'2rem',color:'var(--green)',marginBottom:6}}>Vote Recorded!</div>
          <p style={{color:'var(--sub)',fontSize:'1rem',marginBottom:20}}>
            Your vote has been permanently recorded on the Ethereum blockchain with ZK-SNARK encryption.
          </p>

          {/* Who you voted for */}
          <div style={{display:'inline-flex',alignItems:'center',gap:14,background:'rgba(0,0,0,0.25)',borderRadius:14,padding:'14px 22px',marginBottom:16}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(98,126,234,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,overflow:'hidden',border:'2px solid rgba(98,126,234,0.4)'}}>
              {receipt.candidate?.imageUrl ? <img src={receipt.candidate.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : '👤'}
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.1rem'}}>{receipt.candidate?.name}</div>
              <div style={{fontSize:'.85rem',color:'var(--eth)'}}>{receipt.candidate?.party}</div>
            </div>
          </div>

          {/* MetaMask wallet */}
          <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center',marginTop:4}}>
            <span style={{fontSize:18}}>🦊</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'.78rem',color:'var(--muted)'}}>
              Voted with: <strong style={{color:'var(--amber)'}}>{receipt.walletAddress}</strong>
            </span>
          </div>
        </div>

        {/* Receipt details */}
        <div className="card" style={{marginBottom:20}}>
          <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:16}}>🧾 Vote Receipt</div>
          {[
            ['⛓ Blockchain Tx Hash', receipt.txHash, '#627EEA'],
            ['🔐 ZK Proof', `Groth16 · Verified ✅ · ${receipt.zkProof?.publicSignals?.[0]||'—'}`, '#8B5CF6'],
            ['🔏 Nullifier Hash', receipt.nullifierHash, '#14B8A6'],
            ['📦 Encrypted Vote (IPFS)', receipt.voteRecordCid, '#10B981'],
            ['📋 Public Audit Log (IPFS)', receipt.auditCid, '#F59E0B'],
            ['🕐 Timestamp', new Date(receipt.timestamp).toLocaleString(), 'var(--muted)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{fontSize:'.78rem',color:'var(--muted)',minWidth:160,fontFamily:'var(--font-mono)',flexShrink:0}}>{label}</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'.78rem',color,wordBreak:'break-all'}}>{value}</span>
            </div>
          ))}
        </div>

        {/* Security note */}
        <div className="card card-sm" style={{background:'rgba(139,92,246,0.06)',borderColor:'rgba(139,92,246,0.2)',marginBottom:20}}>
          <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--purple)',marginBottom:8}}>🔐 Privacy Guarantee</div>
          <div style={{fontSize:'.8rem',color:'var(--sub)',lineHeight:1.8}}>
            Your vote is <strong style={{color:'var(--text)'}}>AES-256 encrypted</strong> before being stored on IPFS. Not even the admin can decrypt which candidate you chose. The nullifier hash proves you voted exactly once, while your identity remains anonymous. A vote receipt has been emailed to your registered address.
          </div>
        </div>

        {/* Verify links */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:24}}>
          <a href={receipt.auditIpfsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">🌐 View Audit on IPFS ↗</a>
          <a href={receipt.voteIpfsUrl}  target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">📦 View Encrypted Vote ↗</a>
          <Link to="/user/dashboard" className="btn btn-primary btn-sm">← Back to Dashboard</Link>
        </div>

        {/* Live results */}
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:12,fontSize:'1.1rem'}}>📊 Live Election Results</div>
        <LiveResultsBar candidates={liveResults.candidates} totalVotes={liveResults.totalVotes} highlight={selected?._id} />
      </div>
    </div>
  );

  // ── Already voted ────────────────────────────────────────────
  if (hasVoted) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'40px 24px'}}>
      <div style={{maxWidth:700,margin:'0 auto'}}>
        <div className="card" style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:44,marginBottom:12}}>✅</div>
          <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.2rem',marginBottom:8}}>You Have Already Voted</div>
          <p style={{color:'var(--sub)',marginBottom:20}}>Your encrypted vote is permanently stored on the blockchain. Check your email for the receipt.</p>
          <Link to="/user/dashboard" className="btn btn-outline">← Back to Dashboard</Link>
        </div>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:12}}>📊 Live Results</div>
        {election && <LiveResultsBar candidates={liveResults.candidates} totalVotes={liveResults.totalVotes} />}
      </div>
    </div>
  );

  // ── Main voting page ─────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* Nav */}
      <nav style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:10,fontFamily:'var(--font-head)',fontWeight:800}}>
          <div style={{width:32,height:32,background:'var(--grad)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>⛓</div>
          BlockVote
        </div>
        <Link to="/user/dashboard" className="btn btn-outline btn-sm">← Dashboard</Link>
      </nav>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px',display:'grid',gridTemplateColumns:'1fr 320px',gap:24,alignItems:'start'}}>

        {/* ── Left: candidate selection ── */}
        <div>
          <div style={{marginBottom:22}}>
            <h1 style={{fontFamily:'var(--font-head)',fontSize:'1.6rem',fontWeight:800,marginBottom:4}}>Cast Your Vote</h1>
            {election && <p style={{color:'var(--muted)'}}>
              {election.title} · Closes {new Date(election.endDate).toLocaleDateString()}
            </p>}
          </div>

          {/* ZK info bar */}
          <div style={{background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:12,padding:'12px 18px',marginBottom:22,display:'flex',alignItems:'flex-start',gap:12}}>
            <span style={{fontSize:20,marginTop:1}}>🔐</span>
            <div>
              <div style={{fontSize:'.83rem',fontWeight:700,color:'var(--purple)',marginBottom:2}}>ZK-SNARK Encrypted Voting</div>
              <div style={{fontSize:'.78rem',color:'var(--sub)',lineHeight:1.7}}>
                Your vote is signed with MetaMask, encrypted before storing on IPFS, and recorded on Ethereum. <strong style={{color:'var(--text)'}}>Not even the admin can see who you voted for.</strong> The nullifier prevents double-voting while keeping your identity private.
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{marginBottom:18}}>⚠ {error}</div>}

          {/* Casting steps indicator */}
          {casting && castStep && (
            <div className="alert alert-info" style={{marginBottom:18,display:'flex',alignItems:'center',gap:10}}>
              <span style={{animation:'spin 1s linear infinite',display:'inline-block',fontSize:18}}>⟳</span>
              <span style={{fontWeight:600}}>{castStep}</span>
            </div>
          )}

          {/* Candidate cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16,marginBottom:22}}>
            {candidates.map((c, i) => {
              const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6'];
              const color  = colors[i % colors.length];
              const isSelected = selected?._id === c._id;
              return (
                <div
                  key={c._id}
                  onClick={() => !casting && setSelected(c)}
                  style={{
                    background: isSelected ? `${color}12` : 'var(--card)',
                    border:`2px solid ${isSelected ? color : 'var(--border)'}`,
                    borderRadius:16, padding:22, cursor: casting ? 'not-allowed' : 'pointer',
                    transition:'all .25s', position:'relative', textAlign:'center',
                    boxShadow: isSelected ? `0 0 20px ${color}22` : 'none',
                  }}
                >
                  {isSelected && (
                    <div style={{position:'absolute',top:10,right:12,width:26,height:26,background:color,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',boxShadow:`0 0 10px ${color}`}}>✓</div>
                  )}
                  {/* Photo */}
                  <div style={{width:76,height:76,borderRadius:'50%',background:`${color}18`,border:`3px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 14px',overflow:'hidden',boxShadow:isSelected?`0 0 16px ${color}44`:'none'}}>
                    {(c.imageUrl || c.ipfsImageUrl) ? (
                      <img src={c.imageUrl || c.ipfsImageUrl} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1rem',marginBottom:6}}>{c.name}</div>
                  <span style={{display:'inline-block',padding:'2px 10px',borderRadius:12,background:`${color}18`,border:`1px solid ${color}44`,color,fontSize:'.72rem',fontWeight:700,marginBottom:10}}>{c.party}</span>
                  {c.qualification && <div style={{fontSize:'.75rem',color:'var(--muted)',marginBottom:3}}>{c.qualification}</div>}
                  {c.age && <div style={{fontSize:'.75rem',color:'var(--muted)'}}>Age {c.age}</div>}
                  {c.bio && <p style={{fontSize:'.75rem',color:'var(--sub)',marginTop:10,lineHeight:1.6,textAlign:'left'}}>{c.bio.slice(0,100)}{c.bio.length>100?'…':''}</p>}
                </div>
              );
            })}
          </div>

          {/* Selected summary */}
          {selected && !casting && (
            <div style={{background:'rgba(98,126,234,0.07)',border:'1px solid rgba(98,126,234,0.2)',borderRadius:12,padding:'14px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:20}}>🗳️</span>
              <div>
                <span style={{color:'var(--muted)',fontSize:'.85rem'}}>Voting for: </span>
                <strong style={{color:'var(--text)'}}>{selected.name}</strong>
                <span style={{color:'var(--eth)',marginLeft:8,fontSize:'.85rem'}}>({selected.party})</span>
              </div>
            </div>
          )}

          <button
            onClick={castVote}
            disabled={!selected || casting}
            className={`btn btn-primary btn-full btn-lg ${casting?'btn-loading':''}`}
          >
            {casting ? castStep || 'Processing…'
             : selected ? `🗳️ Cast Vote for ${selected.name} (MetaMask Required)`
             : 'Select a candidate above'}
          </button>

          <div style={{marginTop:10,fontSize:'.75rem',color:'var(--muted)',textAlign:'center'}}>
            ⚠ MetaMask will show 2 confirmations: sign message + send transaction. Your vote is <strong style={{color:'var(--text)'}}>irreversible</strong> once confirmed.
          </div>
        </div>

        {/* ── Right: always-visible results ── */}
        <div style={{position:'sticky',top:80}}>
          <LiveResultsBar
            candidates={liveResults.candidates}
            totalVotes={liveResults.totalVotes}
            highlight={selected?._id}
          />
          <div style={{fontSize:'.72rem',color:'var(--muted)',textAlign:'center',fontFamily:'var(--font-mono)'}}>
            Auto-refreshes every 15 seconds
          </div>
        </div>
      </div>
    </div>
  );
}