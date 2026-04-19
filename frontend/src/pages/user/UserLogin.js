import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../utils/api';

export default function UserLogin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm]       = useState({ email:'', password:'' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const successMsg = location.state?.msg;

  useEffect(() => {
    if (localStorage.getItem('userToken')) navigate('/user/dashboard', { replace:true });
  }, [navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/user/login', { email: form.email.trim().toLowerCase(), password: form.password.trim() });
      localStorage.setItem('userToken', res.data.token);
      localStorage.setItem('userInfo',  JSON.stringify(res.data.user));
      navigate('/user/dashboard', { replace:true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* Top nav */}
      <nav style={{ height:56, background:'var(--bg2)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px' }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:9, fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1rem', color:'var(--text)', textDecoration:'none' }}>
          <div style={{ width:28, height:28, background:'var(--grad)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>⛓</div>
          BlockVote
        </Link>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Link to="/user/login"  className="btn btn-primary btn-sm">Sign In</Link>
          <Link to="/user/signup" className="btn btn-outline btn-sm">Create Account</Link>
        </div>
      </nav>

      {/* Form */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 24px', minHeight:'calc(100vh - 56px)' }}>
        <div style={{ width:'100%', maxWidth:400 }}>

          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ width:52, height:52, background:'var(--grad)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 14px', boxShadow:'0 8px 24px rgba(98,126,234,0.3)' }}>🗳️</div>
            <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.5rem', marginBottom:5, letterSpacing:'-0.5px' }}>Voter Sign In</div>
            <div style={{ color:'var(--muted)', fontSize:'.88rem' }}>Sign in to access your assigned elections</div>
          </div>

          <div className="card">
            {successMsg && <div className="alert alert-success" style={{ marginBottom:20 }}>{successMsg}</div>}
            {error      && <div className="alert alert-error"   style={{ marginBottom:20 }}>⚠ {error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <input id="login-email" name="email" className="form-control" type="email"
                  placeholder="your@email.com" value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})}
                  required autoFocus autoComplete="email"/>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <input id="login-password" name="password" className="form-control" type="password"
                  placeholder="Your password" value={form.password}
                  onChange={e=>setForm({...form,password:e.target.value})}
                  required autoComplete="current-password"/>
                <div style={{ textAlign:'right', marginTop:6 }}>
                  <Link to="/forgot-password" style={{ fontSize:'.78rem', color:'var(--muted)' }}>Forgot password?</Link>
                </div>
              </div>
              <button type="submit" className={`btn btn-primary btn-full btn-lg ${loading?'btn-loading':''}`} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          </div>

          <div style={{ textAlign:'center', marginTop:18, fontSize:'.85rem', color:'var(--muted)' }}>
            Don't have an account?{' '}
            <Link to="/user/signup" style={{ color:'var(--eth)', fontWeight:600 }}>Create Account →</Link>
          </div>
          <div style={{ textAlign:'center', marginTop:10, fontSize:'.82rem' }}>
            <Link to="/" style={{ color:'var(--muted)' }}>← Home</Link>
            {'  ·  '}
            <Link to="/admin/login" style={{ color:'var(--amber)' }}>Admin Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}