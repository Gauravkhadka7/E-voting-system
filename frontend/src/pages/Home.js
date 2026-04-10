import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  // If already logged in, show logged-in state buttons
  const adminToken = localStorage.getItem('adminToken');
  const userToken  = localStorage.getItem('userToken');
  const userInfo   = JSON.parse(localStorage.getItem('userInfo') || '{}');

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', position:'relative', overflow:'hidden' }}>

      {/* Background */}
      <div style={{ position:'fixed', inset:0, zIndex:0, background:'radial-gradient(ellipse at 20% 40%,rgba(98,126,234,0.13) 0%,transparent 60%),radial-gradient(ellipse at 80% 60%,rgba(139,92,246,0.10) 0%,transparent 55%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:'linear-gradient(rgba(98,126,234,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(98,126,234,0.04) 1px,transparent 1px)', backgroundSize:'50px 50px', pointerEvents:'none', opacity:.6 }} />

      <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:'780px', width:'100%' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:48 }}>
          <div style={{ width:52, height:52, background:'var(--grad)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, boxShadow:'0 0 40px rgba(98,126,234,0.4)' }}>⛓</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.6rem', color:'var(--text)' }}>BlockVote</div>
            <div style={{ fontSize:'.72rem', color:'var(--muted)', fontFamily:'var(--font-mono)', letterSpacing:'.5px' }}>Blockchain E-Voting System</div>
          </div>
        </div>

        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(98,126,234,0.08)', border:'1px solid rgba(98,126,234,0.2)', borderRadius:20, padding:'5px 16px', fontSize:'.75rem', fontWeight:700, color:'var(--eth)', marginBottom:20, fontFamily:'var(--font-mono)', letterSpacing:'.5px' }}>
          <span style={{ width:7, height:7, background:'var(--eth)', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }} />
          Final Year Project · Ethereum · ZK-SNARKs · IPFS
        </div>

        <h1 style={{ fontFamily:'var(--font-head)', fontSize:'clamp(2rem,5vw,3.2rem)', fontWeight:800, lineHeight:1.1, marginBottom:16 }}>
          Secure, Transparent<br />
          <span className="grad-text">Democratic Voting</span>
        </h1>
        <p style={{ fontSize:'1rem', color:'var(--sub)', maxWidth:500, margin:'0 auto 52px', lineHeight:1.8 }}>
          A decentralized e-voting platform built on Ethereum with ZK-SNARK encryption and IPFS storage.
        </p>

        {/* If admin is logged in */}
        {adminToken && (
          <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:14, padding:'18px 24px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <span style={{ color:'var(--amber)', fontWeight:600 }}>🔑 Admin session active</span>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => navigate('/admin/dashboard')} className="btn btn-primary btn-sm">Go to Dashboard →</button>
              <button onClick={() => { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); window.location.reload(); }} className="btn btn-outline btn-sm">Logout</button>
            </div>
          </div>
        )}

        {/* If user is logged in */}
        {userToken && !adminToken && (
          <div style={{ background:'rgba(98,126,234,0.07)', border:'1px solid rgba(98,126,234,0.25)', borderRadius:14, padding:'18px 24px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <span style={{ color:'var(--eth)', fontWeight:600 }}>👤 Welcome back, {userInfo.name || 'Voter'}!</span>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => navigate('/user/dashboard')} className="btn btn-primary btn-sm">Go to Dashboard →</button>
              <button onClick={() => { localStorage.removeItem('userToken'); localStorage.removeItem('userInfo'); window.location.reload(); }} className="btn btn-outline btn-sm">Logout</button>
            </div>
          </div>
        )}

        {/* TWO PORTALS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20, maxWidth:680, margin:'0 auto' }}>

          {/* Admin Portal */}
          <div
            onClick={() => navigate('/admin/login')}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:36, cursor:'pointer', transition:'all .3s', textAlign:'left', position:'relative', overflow:'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,158,11,0.4)'; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 50px rgba(0,0,0,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
          >
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#F59E0B,#EF4444)' }} />
            <div style={{ width:60, height:60, background:'rgba(245,158,11,0.12)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:20, border:'1px solid rgba(245,158,11,0.2)' }}>🔑</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:'1.2rem', fontWeight:700, marginBottom:10 }}>Admin Login</div>
            <div style={{ fontSize:'.9rem', color:'var(--sub)', lineHeight:1.75, marginBottom:20 }}>
              Manage elections, add candidates, and view the results dashboard.
            </div>
            <ul style={{ fontSize:'.83rem', color:'var(--muted)', lineHeight:2, paddingLeft:0, listStyle:'none' }}>
              <li>📊 Dashboard with live charts</li>
              <li>🗳️ Create &amp; manage elections</li>
              <li>👤 Add &amp; update candidates</li>
            </ul>
            <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:8, color:'var(--amber)', fontWeight:700, fontSize:'.9rem' }}>
              Admin Login <span>→</span>
            </div>
          </div>

          {/* User Portal */}
          <div
            onClick={() => navigate('/user/signup')}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:36, cursor:'pointer', transition:'all .3s', textAlign:'left', position:'relative', overflow:'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(98,126,234,0.4)'; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 50px rgba(0,0,0,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
          >
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'var(--grad)' }} />
            <div style={{ width:60, height:60, background:'rgba(98,126,234,0.12)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:20, border:'1px solid rgba(98,126,234,0.2)' }}>🗳️</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:'1.2rem', fontWeight:700, marginBottom:10 }}>Voter Portal</div>
            <div style={{ fontSize:'.9rem', color:'var(--sub)', lineHeight:1.75, marginBottom:20 }}>
              Register, view candidates, and cast your secure blockchain vote.
            </div>
            <ul style={{ fontSize:'.83rem', color:'var(--muted)', lineHeight:2, paddingLeft:0, listStyle:'none' }}>
              <li>👤 Sign up &amp; log in</li>
              <li>📋 Complete voter registration</li>
              <li>✅ Cast your secure vote</li>
            </ul>
            <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:8, color:'var(--eth)', fontWeight:700, fontSize:'.9rem' }}>
              Sign Up <span>→</span>
            </div>
          </div>
        </div>

        {/* Already have account — goes to LOGIN not homepage */}
        <p style={{ marginTop:28, fontSize:'.85rem', color:'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/user/login" style={{ color:'var(--eth)', fontWeight:600 }}>Sign In →</Link>
          {' '}·{' '}
          <Link to="/admin/login" style={{ color:'var(--amber)', fontWeight:600 }}>Admin Login →</Link>
        </p>

        {/* Tech badges */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:44, opacity:.6 }}>
          {['Ethereum','Solidity','ZK-SNARKs','IPFS','MetaMask','React.js','Node.js'].map(t => (
            <span key={t} style={{ fontFamily:'var(--font-mono)', fontSize:'.68rem', padding:'3px 10px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border2)', color:'var(--muted)' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}