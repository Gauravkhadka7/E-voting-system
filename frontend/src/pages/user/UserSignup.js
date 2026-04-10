import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function UserSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'verify' | 'done'
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', phone:'' });
  const [otp, setOtp]   = useState(['','','','','','']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [devCode, setDevCode]   = useState('');
  const [requiresVerify, setRequiresVerify] = useState(false);

  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6)       return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/user/register', {
        name: form.name, email: form.email,
        password: form.password, phone: form.phone,
      });

      // Dev mode — no email needed, go straight to login
      if (!res.data.requiresVerification) {
        navigate('/user/login', {
          state: { msg: '✅ Account created! You can now sign in.' }
        });
        return;
      }

      // Email mode — show OTP verification
      setRequiresVerify(true);
      setInfo(res.data.message);
      if (res.data.devCode) setDevCode(res.data.devCode);
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };

  const handleOtpPaste = e => {
    const paste = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (paste.length === 6) setOtp(paste.split(''));
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) return setError('Enter all 6 digits.');
    setLoading(true); setError('');
    try {
      await api.post('/api/auth/user/verify-email', { email: form.email, code });
      navigate('/user/login', { state: { msg: '✅ Email verified! Sign in to continue.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Try again.');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setError('');
    try {
      const res = await api.post('/api/auth/user/resend-otp', { email: form.email });
      setInfo(res.data.message);
      if (res.data.devCode) setDevCode(res.data.devCode);
      setOtp(['','','','','','']);
    } catch { setInfo('Could not resend. Try again.'); }
  };

  const pw = (() => {
    if (!form.password) return { w:'0%', c:'transparent', l:'' };
    if (form.password.length < 6)  return { w:'30%', c:'var(--red)',   l:'Too short' };
    if (form.password.length < 10) return { w:'65%', c:'var(--amber)', l:'Fair' };
    return { w:'100%', c:'var(--green)', l:'Strong 💪' };
  })();

  return (
    <div className="auth-page">
      <div className="auth-card fade-up" style={{ maxWidth:480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">⛓</div>
          BlockVote
        </div>

        {step === 'form' ? (
          <>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(98,126,234,0.08)', border:'1px solid rgba(98,126,234,0.2)', borderRadius:20, padding:'4px 12px', fontSize:'.72rem', fontWeight:700, color:'var(--eth)', marginBottom:16, fontFamily:'var(--font-mono)' }}>
              👤 Create Voter Account
            </div>
            <div className="auth-title">Sign Up</div>
            <div className="auth-sub">Register to participate in blockchain elections</div>
            {error && <div className="alert alert-error">⚠ {error}</div>}

            <form onSubmit={handleRegister} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-name">Full Name <span>*</span></label>
                <input id="signup-name" name="name" className="form-control" type="text"
                  autoComplete="name" placeholder="Your legal full name"
                  value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">Email Address <span>*</span></label>
                <input id="signup-email" name="email" className="form-control" type="email"
                  autoComplete="email" placeholder="your@email.com"
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
                <div className="form-hint">Used for account verification</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-phone">Phone Number</label>
                <input id="signup-phone" name="phone" className="form-control" type="tel"
                  autoComplete="tel" placeholder="+977 980 000 0000"
                  value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">Password <span>*</span></label>
                <input id="signup-password" name="password" className="form-control" type="password"
                  autoComplete="new-password" placeholder="Minimum 6 characters"
                  value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
                {form.password && (
                  <div style={{ marginTop:6 }}>
                    <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                      <div style={{ height:'100%', borderRadius:2, background:pw.c, width:pw.w, transition:'all .3s' }} />
                    </div>
                    <div style={{ fontSize:'.72rem', color:pw.c, marginTop:3 }}>{pw.l}</div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-confirm">Confirm Password <span>*</span></label>
                <input id="signup-confirm" name="confirm" className="form-control" type="password"
                  autoComplete="new-password" placeholder="Re-enter password"
                  value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} required />
                {form.confirm && form.password !== form.confirm && (
                  <div style={{ fontSize:'.75rem', color:'var(--red)', marginTop:4 }}>Passwords don't match</div>
                )}
              </div>
              <button type="submit"
                className={`btn btn-primary btn-full btn-lg ${loading?'btn-loading':''}`}
                disabled={loading}>
                {loading ? 'Creating account…' : '🗳️ Create Account'}
              </button>
            </form>
            <div className="auth-footer">
              Already have an account? <Link to="/user/login">Sign In →</Link>
            </div>
            <div style={{ textAlign:'center', marginTop:8 }}>
              <Link to="/" style={{ fontSize:'.82rem', color:'var(--muted)' }}>← Home</Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
              <div className="auth-title">Check Your Email</div>
              <div className="auth-sub">
                6-digit code sent to <strong style={{ color:'var(--eth)' }}>{form.email}</strong>
              </div>
            </div>
            {info && <div className="alert alert-info">ℹ {info}</div>}
            {devCode && (
              <div style={{ background:'rgba(98,126,234,0.06)', border:'1px solid rgba(98,126,234,0.2)', borderRadius:9, padding:'10px 14px', marginBottom:14, fontFamily:'var(--font-mono)', fontSize:'.82rem', color:'var(--muted)' }}>
                Dev mode code: <span style={{ color:'var(--eth)', fontWeight:700, fontSize:'1rem' }}>{devCode}</span>
              </div>
            )}
            {error && <div className="alert alert-error">⚠ {error}</div>}

            <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:24 }} onPaste={handleOtpPaste}>
              {otp.map((d,i) => (
                <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                  value={d} onChange={e=>handleOtpChange(i,e.target.value)} autoComplete="off"
                  onKeyDown={e=>e.key==='Backspace'&&!d&&i>0&&document.getElementById(`otp-${i-1}`)?.focus()}
                  style={{ width:52, height:58, textAlign:'center', fontSize:'1.6rem', fontWeight:700,
                    background:'var(--card2)', border:`2px solid ${d?'var(--eth)':'var(--border2)'}`,
                    borderRadius:12, color:'var(--text)', outline:'none', fontFamily:'var(--font-mono)', transition:'border-color .2s' }} />
              ))}
            </div>
            <button onClick={handleVerify}
              className={`btn btn-primary btn-full btn-lg ${loading?'btn-loading':''}`}
              disabled={loading||otp.join('').length<6}>
              {loading ? 'Verifying…' : '✅ Verify Email'}
            </button>
            <div style={{ textAlign:'center', marginTop:16, fontSize:'.85rem', color:'var(--muted)' }}>
              Didn't receive it?{' '}
              <button onClick={resend} style={{ background:'none', border:'none', color:'var(--eth)', cursor:'pointer', fontWeight:600, fontSize:'.85rem' }}>Resend code</button>
            </div>
            <div style={{ textAlign:'center', marginTop:8 }}>
              <button onClick={()=>{setStep('form');setError('');}} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'.82rem' }}>← Change email</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}