import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ username:'', password:'' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats]     = useState({ elections:0, votes:0, candidates:0 });

  useEffect(() => {
    if (localStorage.getItem('adminToken')) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    // Load public stats
    api.get('/api/elections/all-public').then(r => {
      const els = r.data || [];
      const totalVotes = els.reduce((s,e)=>s+(e.totalVotes||0),0);
      setStats(prev => ({ ...prev, elections: els.length, votes: totalVotes }));
    }).catch(()=>{});
    api.get('/api/candidates/public').then(r => {
      setStats(prev => ({ ...prev, candidates: (r.data||[]).length }));
    }).catch(()=>{});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) return setError('Enter username and password.');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/admin/login', {
        username: form.username.trim(),
        password: form.password.trim(),
      });
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminUser',  JSON.stringify(res.data.admin));
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'grid',gridTemplateColumns:'1fr 420px',gap:0}}>

      {/* Left panel */}
      <div style={{background:'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(6,11,24,0.97))',padding:'48px 40px',display:'flex',flexDirection:'column',justifyContent:'center',borderRight:'1px solid var(--border)'}}>
        <div style={{maxWidth:440}}>
          <div style={{display:'flex',alignItems:'center',gap:10,fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.5rem',marginBottom:36}}>
            <div style={{width:36,height:36,background:'linear-gradient(135deg,#F59E0B,#EF4444)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🔑</div>
            BlockVote Admin
          </div>
          <h2 style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.8rem',lineHeight:1.2,marginBottom:12}}>
            Election<br/><span style={{color:'var(--amber)'}}>Control Center</span>
          </h2>
          <p style={{color:'var(--sub)',lineHeight:1.8,marginBottom:28,fontSize:'.9rem'}}>
            Manage elections, add candidates, monitor live results, and audit blockchain records.
          </p>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:28}}>
            {[
              {label:'Elections',  value:stats.elections,  color:'#F59E0B'},
              {label:'Total Votes',value:stats.votes,       color:'#10B981'},
              {label:'Candidates', value:stats.candidates,  color:'#8B5CF6'},
            ].map((s,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.04)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 10px',textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.4rem',color:s.color}}>{s.value}</div>
                <div style={{fontSize:'.7rem',color:'var(--muted)',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {['📊 Real-time election dashboard','👤 Add and manage candidates','🗳️ Create and schedule elections','📋 Blockchain audit logs','📧 OTP-secured sensitive actions'].map(f=>(
              <div key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:'.83rem',color:'var(--sub)'}}>
                <span style={{color:'var(--amber)',flexShrink:0}}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 32px'}}>
        <div style={{width:'100%',maxWidth:360}}>
          <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.5rem',marginBottom:4}}>Admin Sign In</div>
          <div style={{color:'var(--muted)',fontSize:'.85rem',marginBottom:28}}>Access the election management dashboard</div>

          {error && <div className="alert alert-error" role="alert">⚠ {error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-username">Username *</label>
              <input id="admin-username" name="username" className="form-control" type="text"
                placeholder="admin" value={form.username}
                onChange={e=>setForm({...form,username:e.target.value})}
                required autoFocus autoComplete="username"/>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Password *</label>
              <input id="admin-password" name="password" className="form-control" type="password"
                placeholder="••••••••" value={form.password}
                onChange={e=>setForm({...form,password:e.target.value})}
                required autoComplete="current-password"/>
            </div>
            <button type="submit"
              className={`btn btn-full btn-lg ${loading?'btn-loading':''}`}
              style={{background:'linear-gradient(135deg,#F59E0B,#EF4444)',color:'#fff',border:'none',marginTop:4}}
              disabled={loading}>
              {loading ? 'Signing in…' : '🔑 Sign In → Dashboard'}
            </button>
          </form>

          <div style={{marginTop:16,padding:'12px 14px',background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:9,fontSize:'.78rem',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>
            Default: <span style={{color:'var(--amber)'}}>admin</span> / <span style={{color:'var(--amber)'}}>admin123</span>
          </div>

          <div style={{marginTop:14,textAlign:'center',fontSize:'.82rem'}}>
            <Link to="/" style={{color:'var(--muted)'}}>← Back to Home</Link>
            {' '}·{' '}
            <Link to="/user/login" style={{color:'var(--eth)'}}>Voter Login →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}