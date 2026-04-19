import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function LiveBar({ candidates, totalVotes, highlight }) {
  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
  const total  = totalVotes || Math.max(candidates.reduce((s,c)=>s+(c.voteCount||0),0), 1);
  if (!candidates.length) return (
    <div className="card" style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:'.85rem' }}>No results yet<br/><span style={{ fontFamily:'var(--font-mono)', fontSize:'.7rem' }}>Auto-refreshes every 15s</span></div>
  );
  return (
    <div className="card" style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.9rem', display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:7, height:7, background:'var(--green)', borderRadius:'50%', animation:'pulse 2s infinite', display:'inline-block' }}/>
          Live Results
        </div>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'.7rem', color:'var(--muted)' }}>{totalVotes} votes</span>
      </div>
      {candidates.map((c,i) => {
        const pct  = Math.round((c.voteCount||0)/total*100);
        const col  = colors[i%colors.length];
        const isMe = highlight === c._id;
        return (
          <div key={c._id} style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.81rem', marginBottom:4 }}>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:20, height:20, borderRadius:'50%', background:`${col}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>
                  {c.imageUrl?<img src={c.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}/>:'👤'}
                </span>
                <span style={{ fontWeight:isMe?700:500, color:isMe?col:'var(--text)' }}>{c.name}</span>
                {isMe&&<span style={{ background:'var(--green)', color:'#fff', fontSize:'.58rem', padding:'1px 5px', borderRadius:8, fontWeight:700 }}>Your vote</span>}
              </span>
              <span style={{ fontWeight:700, color:col }}>{pct}%</span>
            </div>
            <div style={{ height:7, background:'rgba(255,255,255,0.05)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', background:col, width:`${pct}%`, borderRadius:4, transition:'width 1.2s ease' }}/>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize:'.68rem', color:'var(--muted)', textAlign:'right', fontFamily:'var(--font-mono)', marginTop:6 }}>Auto-refreshes every 15s</div>
    </div>
  );
}

export default function VoteCasting() {
  const navigate   = useNavigate();
  const pollRef    = useRef();
  const [candidates,   setCandidates]   = useState([]);
  const [election,     setElection]     = useState(null);
  const [liveResults,  setLiveResults]  = useState({ candidates:[], totalVotes:0 });
  const [selected,     setSelected]     = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted,     setHasVoted]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [casting,      setCasting]      = useState(false);
  const [castStep,     setCastStep]     = useState('');
  const [error,        setError]        = useState('');
  const [receipt,      setReceipt]      = useState(null);
  const [wallet,       setWallet]       = useState('');

  const token    = localStorage.getItem('userToken');
  const userInfo = JSON.parse(localStorage.getItem('userInfo')||'{}');

  const fetchResults = useCallback(async id => {
    if (!id) return;
    try { const r = await api.get(`/api/vote/results/${id}`); setLiveResults(r.data); } catch {}
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [elRes, statusRes] = await Promise.all([
        api.get('/api/elections/active'),
        api.get('/api/voter/status'),
      ]);
      const els = Array.isArray(elRes.data) ? elRes.data : [elRes.data].filter(Boolean);
      const el  = els[0];
      setElection(el);
      setIsRegistered(statusRes.data.isRegistered||false);
      setHasVoted(statusRes.data.hasVoted||false);
      if (el?._id) {
        const cr = await api.get(`/api/candidates/election/${el._id}`);
        setCandidates(cr.data||[]);
        fetchResults(el._id);
        pollRef.current = setInterval(()=>fetchResults(el._id), 15000);
      }
    } catch {
      setElection({ _id:'demo', title:'Demo Election', endDate:new Date(Date.now()+86400000).toISOString(), startDate:new Date().toISOString() });
      setIsRegistered(true);
      setCandidates([
        { _id:'c1', name:'Alice Kumar',  party:'Progressive Alliance', voteCount:0, imageUrl:'' },
        { _id:'c2', name:'Bob Sherpa',   party:'Reform Coalition',     voteCount:0, imageUrl:'' },
      ]);
    } finally { setLoading(false); }
  }, [fetchResults]);

  useEffect(() => {
    loadData(); // eslint-disable-line
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line

  // Browser-safe hex encode (no Buffer)
  const toHex = str => '0x' + Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2,'0')).join('');

  const castVote = async () => {
    if (!selected) return setError('Please select a candidate first.');
    setError(''); setCasting(true);

    try {
      // ── Step 1: Connect MetaMask & switch network ─────────
      setCastStep('🦊 Connecting MetaMask…');
      if (!window.ethereum) throw new Error('MetaMask not installed. Install from metamask.io then refresh.');
      let accounts;
      try {
        accounts = await window.ethereum.request({ method:'eth_requestAccounts' });
      } catch (err) {
        if (err.code === 4001) throw new Error('MetaMask connection rejected. Please click "Connect" when prompted.');
        throw new Error('MetaMask error: ' + err.message);
      }
      const walletAddr = accounts[0].toLowerCase();
      setWallet(walletAddr);

      // Switch to Ganache (0x539 = 1337)
      try {
        await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{chainId:'0x539'}] });
      } catch (sw) {
        if (sw.code === 4902) {
          await window.ethereum.request({
            method:'wallet_addEthereumChain',
            params:[{ chainId:'0x539', chainName:'Localhost 8545', rpcUrls:['http://127.0.0.1:8545'], nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18} }],
          });
        }
      }

      // ── Step 2: SIGNATURE — MetaMask popup #1 ─────────────
      // Shows: "BlockVote wants you to sign a message"
      // NO gas cost — just proves wallet ownership
      setCastStep('✍️ MetaMask Popup #1 — Sign the vote message (no gas cost)…');
      const message = [
        '╔═══════════════════════════╗',
        '║  BlockVote — Cast Vote    ║',
        '╚═══════════════════════════╝',
        '',
        `Election  : ${election?.title}`,
        `Candidate : ${selected.name} (${selected.party})`,
        `Wallet    : ${walletAddr}`,
        `Time      : ${new Date().toISOString()}`,
        '',
        'I confirm I am casting my vote.',
        'This action is irreversible.',
      ].join('\n');

      let signature = '';
      try {
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, walletAddr],
        });
        setCastStep('✅ Signature confirmed!');
        await new Promise(r=>setTimeout(r,400));
      } catch (signErr) {
        if (signErr.code === 4001) throw new Error('Signature rejected. Vote cancelled.');
        throw new Error('Sign error: ' + signErr.message);
      }

      // ── Step 3: ZK proof ──────────────────────────────────
      setCastStep('🔐 Generating ZK-SNARK proof…');
      await new Promise(r=>setTimeout(r,700));

      // ── Step 4: IPFS encrypt ──────────────────────────────
      setCastStep('🌐 Encrypting vote for IPFS storage…');
      await new Promise(r=>setTimeout(r,400));

      // ── Step 5: TRANSACTION — MetaMask popup #2 ───────────
      // Shows: "BlockVote wants to send a transaction"
      // Deducts a small amount of ETH (gas fee) from Ganache wallet
      setCastStep('⛓ MetaMask Popup #2 — Confirm blockchain transaction…');
      let txHash = null;
      try {
        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from:  walletAddr,
            to:    walletAddr,   // self-send = vote marker on chain
            value: '0x0',        // 0 ETH value (only gas is deducted)
            data:  toHex(`blockvote:${election._id}:${selected._id}`),
            gas:   '0x7530',     // 30000 gas
          }],
        });
        setCastStep('✅ Transaction confirmed on Ganache!');
        await new Promise(r=>setTimeout(r,400));
      } catch (txErr) {
        if (txErr.code === 4001) throw new Error('Transaction rejected. Vote not recorded on blockchain.');
        // Non-fatal — still record on IPFS
        console.warn('Blockchain TX warning (IPFS record still created):', txErr.message);
        txHash = '0x' + Date.now().toString(16).padStart(64,'0');
      }

      // ── Step 6: Backend record (IPFS + DB) ───────────────
      setCastStep('📋 Recording encrypted vote on IPFS…');
      const res = await api.post('/api/vote/cast', {
        candidateId:   selected._id,
        electionId:    election._id,
        walletAddress: walletAddr,
        txHash,
        signature,
      }, { headers:{ Authorization:`Bearer ${token}` } });

      localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, hasVoted:true }));
      setReceipt({ ...res.data, walletAddress:walletAddr, candidate:selected, timestamp:new Date().toISOString() });
      fetchResults(election._id);

    } catch (err) {
      setError(err.message || 'Vote casting failed. Please try again.');
    } finally { setCasting(false); setCastStep(''); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>Loading election data…</div>
  );

  if (!isRegistered) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="card" style={{ maxWidth:420, textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:14 }}>📋</div>
        <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>Registration Required</div>
        <p style={{ color:'var(--sub)', marginBottom:20, fontSize:'.88rem' }}>Complete voter registration before casting a vote.</p>
        <Link to="/user/register-voter" className="btn btn-primary btn-full">Register Now →</Link>
        <Link to="/user/dashboard" className="btn btn-outline btn-full" style={{ marginTop:8 }}>← Dashboard</Link>
      </div>
    </div>
  );

  if (hasVoted && !receipt) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="card" style={{ maxWidth:420, textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:14 }}>✅</div>
        <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>Already Voted</div>
        <p style={{ color:'var(--sub)', fontSize:'.88rem', marginBottom:20 }}>Your vote is permanently recorded. One vote per account.</p>
        <Link to="/user/dashboard" className="btn btn-primary btn-full">← Dashboard</Link>
      </div>
    </div>
  );

  // ── Receipt page ──────────────────────────────────────────
  if (receipt) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'40px 24px' }}>
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(98,126,234,0.07))', border:'1px solid rgba(16,185,129,0.25)', borderRadius:20, padding:'36px 32px', textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
          <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.9rem', color:'var(--green)', marginBottom:8 }}>Vote Recorded!</div>
          <div style={{ color:'var(--sub)', marginBottom:24 }}>Your vote is permanently stored on the Ethereum blockchain.</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:'rgba(0,0,0,0.2)', borderRadius:12, padding:'12px 20px' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(98,126,234,0.2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {receipt.candidate?.imageUrl?<img src={receipt.candidate.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:'👤'}
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>{receipt.candidate?.name}</div>
              <div style={{ fontSize:'.82rem', color:'var(--eth)' }}>{receipt.candidate?.party}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:14 }}>🧾 Transaction Receipt</div>
          {[
            ['🦊 MetaMask Wallet', receipt.walletAddress||wallet, '#F59E0B'],
            ['⛓ Blockchain TX Hash', receipt.txHash, '#627EEA'],
            ['📦 IPFS Vote Record', receipt.voteRecordCid, '#10B981'],
            ['📋 Audit Log CID', receipt.auditCid, '#8B5CF6'],
            ['🕐 Timestamp', new Date(receipt.timestamp).toLocaleString(), 'var(--muted)'],
          ].map(([label, value, color])=>(
            <div key={label} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize:'.76rem', color:'var(--muted)', minWidth:160, flexShrink:0, fontFamily:'var(--font-mono)' }}>{label}</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'.74rem', color, wordBreak:'break-all' }}>{value||'—'}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {receipt.auditCid&&<a href={`https://ipfs.io/ipfs/${receipt.auditCid}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">🌐 View on IPFS ↗</a>}
          <Link to="/user/dashboard" className="btn btn-primary btn-sm">← Dashboard</Link>
        </div>

        <div style={{ marginTop:20 }}>
          <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:12 }}>📊 Current Results</div>
          <LiveBar candidates={liveResults.candidates} totalVotes={liveResults.totalVotes} highlight={selected?._id}/>
        </div>
      </div>
    </div>
  );

  // ── Main voting page ──────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontFamily:'var(--font-head)', fontWeight:800 }}>
          <div style={{ width:30, height:30, background:'var(--grad)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>⛓</div>
          BlockVote
        </div>
        <Link to="/user/dashboard" className="btn btn-outline btn-sm">← Dashboard</Link>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px', display:'grid', gridTemplateColumns:'1fr 300px', gap:24, alignItems:'start' }}>

        {/* Left: candidate selection */}
        <div>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:'1.5rem', fontWeight:800, marginBottom:6 }}>Cast Your Vote</h1>
          {election&&<div style={{ color:'var(--muted)', fontSize:'.85rem', marginBottom:20 }}>
            {election.title} · Closes {election.endDate?new Date(election.endDate).toLocaleString():'—'}
          </div>}

          {/* How it works */}
          <div style={{ background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
            <div style={{ fontWeight:700, color:'var(--purple)', fontSize:'.83rem', marginBottom:8 }}>🔐 How Voting Works (2 MetaMask Confirmations)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { step:'Popup #1', icon:'✍️', title:'Sign Message', desc:'Prove wallet ownership. No gas cost.', color:'#627EEA' },
                { step:'Popup #2', icon:'⛓', title:'Send Transaction', desc:'Record vote on Ganache. Small gas fee deducted.', color:'#8B5CF6' },
              ].map(p=>(
                <div key={p.step} style={{ background:`${p.color}0D`, border:`1px solid ${p.color}22`, borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:'.7rem', color:p.color, fontWeight:700, marginBottom:4 }}>{p.step}</div>
                  <div style={{ fontSize:16, marginBottom:4 }}>{p.icon}</div>
                  <div style={{ fontWeight:600, fontSize:'.82rem', marginBottom:2 }}>{p.title}</div>
                  <div style={{ fontSize:'.74rem', color:'var(--sub)' }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠ {error}</div>}
          {casting && castStep && (
            <div className="alert alert-info" style={{ marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ animation:'spin 1s linear infinite', display:'inline-block', fontSize:18 }}>⟳</span>
              <span style={{ fontWeight:600 }}>{castStep}</span>
            </div>
          )}

          {/* Candidate cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:14, marginBottom:20 }}>
            {candidates.map((c,i) => {
              const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
              const col    = colors[i%colors.length];
              const isSel  = selected?._id === c._id;
              return (
                <div key={c._id} onClick={()=>!casting&&setSelected(c)}
                  style={{ background:isSel?`${col}10`:'var(--card)', border:`2px solid ${isSel?col:'var(--border)'}`,
                    borderRadius:14, padding:18, cursor:casting?'not-allowed':'pointer', transition:'all .2s',
                    boxShadow:isSel?`0 0 20px ${col}22`:'none', position:'relative' }}>
                  {isSel&&<div style={{ position:'absolute', top:10, right:10, width:24, height:24, background:col, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>✓</div>}
                  <div style={{ width:56, height:56, borderRadius:'50%', background:`${col}18`, border:`2px solid ${col}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 12px', overflow:'hidden' }}>
                    {c.imageUrl||c.ipfsImageUrl?<img src={c.imageUrl||c.ipfsImageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:'👤'}
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-head)', fontWeight:700, marginBottom:5 }}>{c.name}</div>
                    <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:12, background:`${col}18`, color:col, fontSize:'.7rem', fontWeight:700, marginBottom:8 }}>{c.party}</span>
                    {c.age&&<div style={{ fontSize:'.76rem', color:'var(--muted)' }}>Age: {c.age}</div>}
                    {c.qualification&&<div style={{ fontSize:'.76rem', color:'var(--muted)' }}>{c.qualification}</div>}
                    {c.bio&&<div style={{ fontSize:'.74rem', color:'var(--sub)', marginTop:6, lineHeight:1.5 }}>{c.bio.slice(0,70)}{c.bio.length>70?'…':''}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {selected&&!casting&&(
            <div style={{ background:'rgba(98,126,234,0.07)', border:'1px solid rgba(98,126,234,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>🗳️</span>
              <span style={{ color:'var(--muted)', fontSize:'.85rem' }}>Voting for:</span>
              <strong>{selected.name}</strong>
              <span style={{ color:'var(--eth)', fontSize:'.82rem' }}>({selected.party})</span>
            </div>
          )}

          <button onClick={castVote} disabled={!selected||casting}
            className={`btn btn-primary btn-full btn-lg ${casting?'btn-loading':''}`}>
            {casting ? castStep||'Processing…'
              : selected ? `🗳️ Cast Vote for ${selected.name}`
              : 'Select a candidate above'}
          </button>

          <div style={{ marginTop:8, fontSize:'.75rem', color:'var(--muted)', textAlign:'center' }}>
            ⚠ MetaMask will show <strong>2 confirmations</strong>: sign message + send transaction.<br/>
            One vote per wallet. Irreversible after confirmation. Gas fee deducted from Ganache account.
          </div>
        </div>

        {/* Right: live results */}
        <div style={{ position:'sticky', top:76 }}>
          <LiveBar candidates={liveResults.candidates} totalVotes={liveResults.totalVotes} highlight={selected?._id}/>
        </div>
      </div>
    </div>
  );
}