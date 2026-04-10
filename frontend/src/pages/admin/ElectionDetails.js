import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../utils/api';

export default function ElectionDetails() {
  // Live status from dates
  const computeStatus = (startDate, endDate) => {
    const now = new Date();
    if (!startDate || !endDate) return 'unknown';
    if (now < new Date(startDate)) return 'upcoming';
    if (now > new Date(endDate))   return 'completed';
    return 'active';
  };

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const token = () => localStorage.getItem('adminToken');

  const fetchElections = () => {
    setLoading(true);
    api.get('/api/elections', { headers: { Authorization: `Bearer ${token()}` } })
      .then(res => setElections(res.data))
      .catch(() => setElections([
        { _id: '1', title: 'Presidential Election 2024', description: 'National presidential election', status: 'active', startDate: '2024-12-01T08:00:00Z', endDate: '2024-12-15T18:00:00Z', totalVotes: 186, candidateCount: 3 },
        { _id: '2', title: 'Municipal Elections', description: 'City council elections', status: 'upcoming', startDate: '2025-01-10T08:00:00Z', endDate: '2025-01-20T18:00:00Z', totalVotes: 0, candidateCount: 6 },
        { _id: '3', title: 'Student Union Vote', description: 'University student union', status: 'completed', startDate: '2024-11-01T08:00:00Z', endDate: '2024-11-05T18:00:00Z', totalVotes: 320, candidateCount: 4 },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchElections(); }, []);

  const openEdit = (el) => {
    setEditForm({
      title: el.title,
      description: el.description || '',
      startDate: el.startDate ? el.startDate.split('T')[0] : '',
      startTime: el.startDate ? el.startDate.split('T')[1]?.slice(0,5) : '08:00',
      endDate: el.endDate ? el.endDate.split('T')[0] : '',
      endTime: el.endDate ? el.endDate.split('T')[1]?.slice(0,5) : '18:00',
    });
    setEditModal(el);
  };

  const saveEdit = async () => {
    setSaving(true); setMsg('');
    const start = new Date(`${editForm.startDate}T${editForm.startTime}`);
    const end   = new Date(`${editForm.endDate}T${editForm.endTime}`);
    if (end <= start) { setMsg('❌ End date must be after start date.'); setSaving(false); return; }
    try {
      await api.put(`/api/elections/${editModal._id}`, {
        title: editForm.title,
        description: editForm.description,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }, { headers: { Authorization: `Bearer ${token()}` } });
      setMsg('✅ Election updated successfully!');
      fetchElections();
      setTimeout(() => { setEditModal(null); setMsg(''); }, 1500);
    } catch { setMsg('❌ Update failed. Try again.'); }
    finally { setSaving(false); }
  };

  const statusBadge = (s) => {
    const map = { active: 'badge-green', upcoming: 'badge-blue', completed: 'badge-amber' };
    return <span className={`badge ${map[s] || 'badge-blue'}`}>{s?.toUpperCase()}</span>;
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Election Details</div>
            <div className="topbar-sub">View and update all elections — change start/end dates, status, and description</div>
          </div>
          <a href="/admin/create-election" className="btn btn-primary btn-sm">+ Create Election</a>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading elections…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {elections.map(el => (
              <div key={el._id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Status stripe */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: computeStatus(el.startDate, el.endDate) === 'active' ? 'var(--green)' : computeStatus(el.startDate, el.endDate) === 'upcoming' ? 'var(--eth)' : 'var(--muted)' }} />
                <div style={{ paddingLeft: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.05rem' }}>{el.title}</span>
                        {statusBadge(el.status)}
                      </div>
                      {el.description && <div style={{ fontSize: '.85rem', color: 'var(--sub)' }}>{el.description}</div>}
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(el)} style={{ flexShrink: 0 }}>✏️ Edit</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                    {[
                      { label: '▶ Start', value: fmtDate(el.startDate), color: 'var(--green)' },
                      { label: '⏹ End', value: fmtDate(el.endDate), color: 'var(--red)' },
                      { label: '🗳 Total Votes', value: el.totalVotes ?? 0, color: 'var(--eth)' },
                      { label: '👤 Candidates', value: el.candidateCount ?? 0, color: 'var(--purple)' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 9, padding: '10px 14px' }}>
                        <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--font-mono)' }}>{item.label}</div>
                        <div style={{ fontWeight: 700, color: item.color, fontSize: '.9rem' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {elections.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>No elections created yet. <a href="/admin/create-election">Create one →</a></div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
            <div className="modal-box">
              <div className="modal-title">Edit Election</div>
              {msg && <div className={`alert ${msg.includes('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="ed-title">Title</label>
                <input id="ed-title" name="title" autoComplete="off" className="form-control" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ed-desc">Description</label>
                <textarea id="ed-desc" name="description" autoComplete="off" className="form-control" rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div style={{ background: 'rgba(98,126,234,0.05)', border: '1px solid rgba(98,126,234,0.15)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--eth)', marginBottom: 12 }}>📅 Update Voting Window</div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="ed-start-date">Start Date</label>
                    <input id="ed-start-date" name="startDate" autoComplete="off" className="form-control" type="date" value={editForm.startDate} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="ed-start-time">Start Time</label>
                    <input id="ed-start-time" name="startTime" autoComplete="off" className="form-control" type="time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 12, marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="ed-end-date">End Date</label>
                    <input id="ed-end-date" name="endDate" autoComplete="off" className="form-control" type="date" value={editForm.endDate} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="ed-end-time">End Time</label>
                    <input id="ed-end-time" name="endTime" autoComplete="off" className="form-control" type="time" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className={`btn btn-primary btn-full ${saving ? 'btn-loading' : ''}`} onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
                <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}