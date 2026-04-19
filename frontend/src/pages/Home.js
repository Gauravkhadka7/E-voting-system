import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const adminToken = localStorage.getItem('adminToken');
  const userToken  = localStorage.getItem('userToken');

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', position:'relative', overflow:'hidden' }}>

      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 20% 50%, rgba(98,126,234,0.10) 0%,transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.08) 0%,transparent 55%)' }}/>

      {/* Top nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, height:56, background:'rgba(7,9,15,0.85)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.05rem' }}>
          <div style={{ width:30, height:30, background:'var(--grad)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>⛓</div>
          BlockVote
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {adminToken
            ? <button onClick={()=>navigate('/admin/dashboard')} className="btn btn-outline btn-sm">Admin Dashboard →</button>
            : userToken
            ? <button onClick={()=>navigate('/user/dashboard')} className="btn btn-primary btn-sm">My Dashboard →</button>
            : <>
                <Link to="/user/login"  className="btn btn-outline btn-sm">Sign In</Link>
                <Link to="/user/signup" className="btn btn-primary btn-sm">Create Account</Link>
              </>
          }
        </div>
      </nav>

      {/* Main content */}
      <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:560, width:'100%', paddingTop:56 }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:44 }}>
          <div style={{ width:56, height:56, background:'var(--grad)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, boxShadow:'0 0 40px rgba(98,126,234,0.4)' }}>⛓</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.8rem', color:'var(--text)', letterSpacing:'-1px' }}>BlockVote</div>
            <div style={{ fontSize:'.75rem', color:'var(--muted)', fontFamily:'var(--font-mono)' }}>Blockchain E-Voting System</div>
          </div>
        </div>

        <h1 style={{ fontFamily:'var(--font-head)', fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, lineHeight:1.15, marginBottom:16, letterSpacing:'-1px' }}>
          Secure, Transparent<br/><span className="grad-text">Democratic Voting</span>
        </h1>
        <p style={{ color:'var(--sub)', fontSize:'1rem', maxWidth:420, margin:'0 auto 48px', lineHeight:1.85 }}>
          A decentralized e-voting platform powered by Ethereum blockchain, ZK-SNARKs, and IPFS.
        </p>

        {/* Portal cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
          <div onClick={()=>navigate('/user/login')}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'28px 20px', cursor:'pointer', transition:'all .25s', textAlign:'center', position:'relative', overflow:'hidden' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(98,126,234,0.5)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 36px rgba(98,126,234,0.15)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'var(--grad)' }}/>
            <div style={{ fontSize:32, marginBottom:12 }}>🗳️</div>
            <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'1.05rem', marginBottom:8 }}>Voter Login</div>
            <div style={{ fontSize:'.82rem', color:'var(--sub)', marginBottom:16 }}>Sign in to vote in your assigned elections</div>
            <div style={{ color:'var(--eth)', fontWeight:600, fontSize:'.85rem' }}>Sign In →</div>
          </div>

          <div onClick={()=>navigate('/admin/login')}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'28px 20px', cursor:'pointer', transition:'all .25s', textAlign:'center', position:'relative', overflow:'hidden' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(245,158,11,0.5)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 36px rgba(245,158,11,0.12)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'var(--grad-amber)' }}/>
            <div style={{ fontSize:32, marginBottom:12 }}>🔑</div>
            <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'1.05rem', marginBottom:8 }}>Admin Login</div>
            <div style={{ fontSize:'.82rem', color:'var(--sub)', marginBottom:16 }}>Manage elections and assign voters</div>
            <div style={{ color:'var(--amber)', fontWeight:600, fontSize:'.85rem' }}>Admin Panel →</div>
          </div>
        </div>

        <div style={{ fontSize:'.88rem', color:'var(--muted)' }}>
          New voter?{' '}
          <Link to="/user/signup" style={{ color:'var(--eth)', fontWeight:600 }}>Create Account →</Link>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:44, opacity:.4 }}>
          {['Ethereum','ZK-SNARKs','IPFS','MetaMask','Ganache'].map(t=>(
            <span key={t} style={{ fontFamily:'var(--font-mono)', fontSize:'.65rem', padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', color:'var(--muted)' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}