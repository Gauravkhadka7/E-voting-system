import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import axios from 'axios';

export default function CreateElection() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '', startTime: '08:00', endTime: '18:00' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const start = new Date(`${form.startDate}T${form.startTime}`);
    const end   = new Date(`${form.endDate}T${form.endTime}`);
    if (end <= start) { setError('End date/time must be after start date/time.'); return; }
    if (start < new Date()) { setError('Start date cannot be in the past.'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload = {
        title: form.title,
        description: form.description,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
      const res = await axios.post('/api/elections', payload, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`✅ Election "${form.title}" created! Election ID: ${res.data._id}. Users can now vote between the set dates.`);
      setForm({ title: '', description: '', startDate: '', endDate: '', startTime: '08:00', endTime: '18:00' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create election.');
    } finally {
      setLoading(false);
    }
  };

  // Date helper
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Create Election</div>
            <div className="topbar-sub">Set up a new election. Users can only vote within the start and end date window.</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/elections')}>View Elections →</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

          {/* Form */}
          <div className="card">
            {error && <div className="alert alert-error">⚠ {error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Election Title <span>*</span></label>
                <input className="form-control" type="text" placeholder="e.g. Presidential Election 2024" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} placeholder="Brief description of this election..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div style={{ background: 'rgba(98,126,234,0.05)', border: '1px solid rgba(98,126,234,0.15)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  📅 Voting Window
                </div>
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Start Date <span>*</span></label>
                    <input className="form-control" type="date" min={today} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Start Time</label>
                    <input className="form-control" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 14, marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">End Date <span>*</span></label>
                    <input className="form-control" type="date" min={form.startDate || today} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">End Time</label>
                    <input className="form-control" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                  </div>
                </div>
              </div>

              <button type="submit" className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`} disabled={loading}>
                {loading ? 'Creating election on blockchain…' : '🗳️ Create Election'}
              </button>
            </form>
          </div>

          {/* Info Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Live preview */}
            <div className="card">
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 14 }}>Election Preview</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{form.title || 'Election Title'}</div>
              <div style={{ fontSize: '.83rem', color: 'var(--sub)', marginBottom: 12, lineHeight: 1.6 }}>{form.description || 'Description will appear here...'}</div>
              {form.startDate && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Voting Opens</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>{form.startDate} {form.startTime}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Voting Closes</span>
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>{form.endDate} {form.endTime}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rules */}
            <div className="card card-sm" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--amber)', marginBottom: 10 }}>⚠ Election Rules</div>
              <ul style={{ fontSize: '.8rem', color: 'var(--sub)', lineHeight: 2, paddingLeft: 0, listStyle: 'none' }}>
                <li>✓ Users can only vote after admin creates election</li>
                <li>✓ Votes accepted only between start & end date</li>
                <li>✓ Each registered voter can vote exactly once</li>
                <li>✓ Election stored immutably on blockchain</li>
                <li>✓ IPFS audit log created on finalization</li>
              </ul>
            </div>

            <div className="card card-sm" style={{ background: 'rgba(98,126,234,0.05)', borderColor: 'rgba(98,126,234,0.15)' }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--eth)', marginBottom: 8 }}>⛓ On-Chain Storage</div>
              <div style={{ fontSize: '.8rem', color: 'var(--sub)', lineHeight: 1.7 }}>
                Election metadata is stored both in <strong style={{ color: 'var(--text)' }}>MongoDB</strong> and the <strong style={{ color: 'var(--text)' }}>Ethereum smart contract</strong>. IPFS CID is linked after creation.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}