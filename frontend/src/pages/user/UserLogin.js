import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../utils/api';

export default function UserLogin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm]       = useState({ email:'', password:'' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats]     = useState({ totalVotes:0, elections:0, candidates:0 });

  const successMsg = location.state?.msg;

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('userToken')) {
      navigate('/user/dashboard', { replace: true });
      return;
    }
    // Load public stats for display
    Promise.all([
      api.get('/api/elections/all-public').catch(()=>({data:[]})),
      api.get('/api/candidates/public').catch(()=>({data:[]})),
    ]).then(([elRes, candRes]) => {
      const els   = elRes.data  || [];
      const cands = candRes.data|| [];
      setStats({
        totalVotes: cands.reduce((s,c)=>s+(c.voteCount||0),0),
        elections:  els.length,
        candidates: cands.length,
      });
    }).catch(()=>{});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) return setError('Please enter your email and password.');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/user/login', {
        email:    form.email.trim().toLowerCase(),
        password: form.password.trim(),
      });
      localStorage.setItem('userToken', res.data.token);
      localStorage.setItem('userInfo',  JSON.stringify(res.data.user));
      // ✅ Always redirect to dashboard after login
      navigate('/user/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'grid',gridTemplateColumns:'1fr 420px',gap:0}}>

      {/* Left panel — public stats (visible without login) */}
      <div style={{background:'linear-gradient(135deg,rgba(98,126,234,0.07),rgba(6,11,24,0.95))',padding:'48px 40px',display:'flex',flexDirection:'column',justifyContent:'center',borderRight:'1px solid var(--border)'}}>
        <div style={{maxWidth:440}}>
          <div style={{display:'flex',alignItems:'center',gap:10,fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.5rem',marginBottom:36}}>
            <div style={{width:36,height:36,background:'var(--grad)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⛓</div>
            BlockVote
          </div>
          <h2 style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.8rem',lineHeight:1.2,marginBottom:12}}>
            Secure Blockchain<br/><span className="grad-text">E-Voting System</span>
          </h2>
          <p style={{color:'var(--sub)',lineHeight:1.8,marginBottom:28,fontSize:'.9rem'}}>
            Every vote is encrypted with ZK-SNARKs, stored on IPFS, and permanently recorded on Ethereum.
          </p>

          {/* Live stats visible on login page */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:28}}>
            {[
              {label:'Total Votes',value:stats.totalVotes,color:'#10B981'},
              {label:'Elections',  value:stats.elections,  color:'#627EEA'},
              {label:'Candidates', value:stats.candidates, color:'#8B5CF6'},
            ].map((s,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.04)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 10px',textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.4rem',color:s.color}}>{s.value}</div>
                <div style={{fontSize:'.7rem',color:'var(--muted)',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {['🔐 ZK-SNARK encrypted voting','⛓ Ethereum blockchain immutability','🌐 IPFS decentralized storage','🦊 MetaMask wallet signing','📋 Verifiable vote receipts'].map(f=>(
              <div key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:'.83rem',color:'var(--sub)'}}>
                <span style={{color:'var(--green)',flexShrink:0}}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 32px'}}>
        <div style={{width:'100%',maxWidth:360}}>
          <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.5rem',marginBottom:4}}>Voter Sign In</div>
          <div style={{color:'var(--muted)',fontSize:'.85rem',marginBottom:28}}>Sign in to access your voting dashboard</div>

          {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}
          {error      && <div className="alert alert-error"   role="alert">⚠ {error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address *</label>
              <input id="login-email" name="email" className="form-control" type="email"
                placeholder="your@email.com" value={form.email}
                onChange={e=>setForm({...form,email:e.target.value})}
                required autoFocus autoComplete="email"/>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password *</label>
              <input id="login-password" name="password" className="form-control" type="password"
                placeholder="Your password" value={form.password}
                onChange={e=>setForm({...form,password:e.target.value})}
                required autoComplete="current-password"/>
            </div>
            <button type="submit"
              className={`btn btn-primary btn-full btn-lg ${loading?'btn-loading':''}`}
              disabled={loading}>
              {loading ? 'Signing in…' : '🗳️ Sign In → Dashboard'}
            </button>
          </form>

          <div style={{marginTop:20,padding:'14px',background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',borderRadius:10}}>
            <div style={{fontSize:'.75rem',color:'var(--muted)',marginBottom:6,fontWeight:600}}>New to BlockVote?</div>
            <Link to="/user/signup" className="btn btn-outline btn-full btn-sm">📝 Create Account →</Link>
          </div>

          <div style={{marginTop:14,textAlign:'center',fontSize:'.82rem',color:'var(--muted)'}}>
            <Link to="/admin/login" style={{color:'var(--amber)'}}>🔑 Admin Login</Link>
            {' '}·{' '}
            <Link to="/" style={{color:'var(--muted)'}}>← Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}