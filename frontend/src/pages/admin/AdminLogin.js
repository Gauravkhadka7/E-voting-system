import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/admin/login', form);
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminUser', JSON.stringify(res.data.admin));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">⛓</div>
          BlockVote
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: '.72rem', fontWeight: 700, color: 'var(--amber)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
          🔑 Admin Portal
        </div>

        <div className="auth-title">Admin Login</div>
        <div className="auth-sub">Sign in to manage elections and candidates</div>

        {error && (
          <div className="alert alert-error">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username <span>*</span></label>
            <input
              className="form-control"
              type="text"
              placeholder="Enter admin username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password <span>*</span></label>
            <input
              className="form-control"
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)', marginTop: 8 }}
          >
            {loading ? 'Signing in…' : '🔑 Sign In as Admin'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/">← Back to Home</Link>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 9, fontSize: '.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Demo: <span style={{ color: 'var(--eth)' }}>admin</span> / <span style={{ color: 'var(--eth)' }}>admin123</span>
        </div>
      </div>
    </div>
  );
}