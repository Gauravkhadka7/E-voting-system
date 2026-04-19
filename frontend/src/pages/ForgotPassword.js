import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('token');
  const typeFromUrl  = params.get('type') || 'user';

  const [step, setStep]       = useState(tokenFromUrl ? 'reset' : 'email');
  const [email, setEmail]     = useState('');
  const [userType, setUserType] = useState(typeFromUrl);
  const [token, setToken]     = useState(tokenFromUrl || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [devToken, setDevToken] = useState('');

  const handleRequestReset = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim().toLowerCase(), userType });
      setSuccess(res.data.message);
      if (res.data.devToken) { setDevToken(res.data.devToken); setToken(res.data.devToken); }
      if (!res.data.devToken) setStep('check-email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleReset = async e => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 6)  return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password, userType });
      setSuccess('✅ Password reset successful!');
      setTimeout(() => navigate(userType === 'admin' ? '/admin/login' : '/user/login', { state: { msg: '✅ Password reset! Sign in with your new password.' } }), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The token may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-up" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">⛓</div>
          BlockVote
        </div>

        {step === 'email' && (
          <>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🔑</div>
            <div className="auth-title">Forgot Password</div>
            <div className="auth-sub">Enter your registered email and we'll send a reset link</div>

            {error   && <div className="alert alert-error">⚠ {error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            {devToken && (
              <div style={{ background: 'rgba(98,126,234,0.06)', border: '1px solid rgba(98,126,234,0.2)', borderRadius: 9, padding: '10px 14px', marginBottom: 14, fontFamily: 'var(--font-mono)', fontSize: '.82rem' }}>
                Dev mode token: <strong style={{ color: 'var(--eth)' }}>{devToken}</strong>
                <button onClick={() => setStep('reset')} className="btn btn-primary btn-sm" style={{ marginTop: 8, width: '100%' }}>Enter Reset Form →</button>
              </div>
            )}

            <form onSubmit={handleRequestReset} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-type">Account Type</label>
                <select id="fp-type" name="userType" className="form-control" autoComplete="off"
                  value={userType} onChange={e => setUserType(e.target.value)}>
                  <option value="user">Voter Account</option>
                  <option value="admin">Admin Account</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">Email Address *</label>
                <input id="fp-email" name="email" className="form-control" type="email"
                  placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  required autoFocus autoComplete="email" />
              </div>
              <button type="submit" className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`} disabled={loading}>
                {loading ? 'Sending…' : '📧 Send Reset Link'}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop: 20 }}>
              <Link to="/user/login">← Back to Sign In</Link>
              {' '} · {' '}
              <Link to="/">Home</Link>
            </div>
          </>
        )}

        {step === 'check-email' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <div className="auth-title">Check Your Email</div>
            <div className="auth-sub" style={{ marginBottom: 20 }}>
              A password reset link has been sent to <strong style={{ color: 'var(--eth)' }}>{email}</strong>. The link expires in 30 minutes.
            </div>
            <button onClick={() => setStep('reset')} className="btn btn-outline btn-full" style={{ marginBottom: 12 }}>
              I have a reset token →
            </button>
            <Link to="/user/login" className="btn btn-primary btn-full">← Back to Sign In</Link>
          </div>
        )}

        {step === 'reset' && (
          <>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🔐</div>
            <div className="auth-title">Reset Password</div>
            <div className="auth-sub">Enter your reset token and new password</div>

            {error   && <div className="alert alert-error">⚠ {error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleReset} noValidate>
              {!tokenFromUrl && (
                <div className="form-group">
                  <label className="form-label" htmlFor="rp-token">Reset Token *</label>
                  <input id="rp-token" name="token" className="form-control" type="text"
                    placeholder="Paste token from email" value={token}
                    onChange={e => setToken(e.target.value)}
                    required autoComplete="off"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '.82rem' }} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="rp-password">New Password *</label>
                <input id="rp-password" name="password" className="form-control" type="password"
                  placeholder="Minimum 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rp-confirm">Confirm Password *</label>
                <input id="rp-confirm" name="confirm" className="form-control" type="password"
                  placeholder="Re-enter new password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required autoComplete="new-password" />
                {confirm && password !== confirm && <div style={{ fontSize: '.75rem', color: 'var(--red)', marginTop: 4 }}>Passwords don't match</div>}
              </div>
              <button type="submit" className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`} disabled={loading || !token}>
                {loading ? 'Resetting…' : '✅ Reset Password'}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop: 16 }}>
              <button onClick={() => setStep('email')} style={{ background: 'none', border: 'none', color: 'var(--eth)', cursor: 'pointer', fontSize: '.85rem' }}>← Request new token</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}