import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ username:'', password:'' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('adminToken')) navigate('/admin/dashboard', { replace:true });
  }, [navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/admin/login', { username: form.username.trim(), password: form.password.trim() });
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminUser',  JSON.stringify(res.data.admin));
      navigate('/admin/dashboard', { replace:true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
          <Link to="/user/login"  className="btn btn-outline btn-sm">Sign In</Link>
          <Link to="/user/signup" className="btn btn-primary btn-sm">Create Account</Link>
        </div>
      </nav>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 24px', minHeight:'calc(100vh - 56px)' }}>
        <div style={{ width:'100%', maxWidth:400 }}>

          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ width:52, height:52, background:'linear-gradient(135deg,#F59E0B,#EF4444)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 14px', boxShadow:'0 8px 24px rgba(245,158,11,0.3)' }}>🔑</div>
            <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.5rem', marginBottom:5, letterSpacing:'-0.5px' }}>Admin Sign In</div>
            <div style={{ color:'var(--muted)', fontSize:'.88rem' }}>Access the election management dashboard</div>
          </div>

          <div className="card">
            {error && <div className="alert alert-error" style={{ marginBottom:20 }}>⚠ {error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-username">Username</label>
                <input id="admin-username" name="username" className="form-control" type="text"
                  placeholder="admin" value={form.username}
                  onChange={e=>setForm({...form,username:e.target.value})}
                  required autoFocus autoComplete="username"/>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">Password</label>
                <input id="admin-password" name="password" className="form-control" type="password"
                  placeholder="••••••••" value={form.password}
                  onChange={e=>setForm({...form,password:e.target.value})}
                  required autoComplete="current-password"/>
                <div style={{ textAlign:'right', marginTop:6 }}>
                  <Link to="/forgot-password?type=admin" style={{ fontSize:'.78rem', color:'var(--muted)' }}>Forgot password?</Link>
                </div>
              </div>
              <button type="submit"
                className={`btn btn-full btn-lg ${loading?'btn-loading':''}`}
                style={{ background:'linear-gradient(135deg,#F59E0B,#EF4444)', color:'#fff', border:'none', marginTop:4 }}
                disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          </div>

          <div style={{ textAlign:'center', marginTop:18, fontSize:'.82rem' }}>
            <Link to="/" style={{ color:'var(--muted)' }}>← Home</Link>
            {'  ·  '}
            <Link to="/user/login" style={{ color:'var(--eth)' }}>Voter Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}