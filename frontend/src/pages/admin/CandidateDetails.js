import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function CandidateDetails() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  const token = () => localStorage.getItem('adminToken');

  const fetchCandidates = () => {
    setLoading(true);
    api.get('/api/candidates', { headers: { Authorization: `Bearer ${token()}` } })
      .then(res => setCandidates(res.data))
      .catch(() => setCandidates([
        { _id: '1', name: 'Alice Kumar', party: 'Progressive Alliance', electionTitle: 'Presidential 2024', age: 45, qualification: 'MBA', imageUrl: '', voteCount: 124, status: 'active' },
        { _id: '2', name: 'Bob Sherpa', party: 'Reform Coalition', electionTitle: 'Presidential 2024', age: 52, qualification: 'LLB', imageUrl: '', voteCount: 98, status: 'active' },
        { _id: '3', name: 'Clara Thapa', party: 'Green Future', electionTitle: 'Presidential 2024', age: 39, qualification: 'PhD', imageUrl: '', voteCount: 76, status: 'active' },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCandidates(); }, []);

  const openEdit = (c) => {
    setEditForm({ name: c.name, party: c.party, age: c.age, qualification: c.qualification, bio: c.bio || '' });
    setEditModal(c);
  };

  const saveEdit = async () => {
    setSaving(true); setMsg('');
    try {
      await api.put(`/api/candidates/${editModal._id}`, editForm, { headers: { Authorization: `Bearer ${token()}` } });
      setMsg('✅ Candidate updated successfully!');
      fetchCandidates();
      setTimeout(() => { setEditModal(null); setMsg(''); }, 1500);
    } catch { setMsg('❌ Update failed.'); }
    finally { setSaving(false); }
  };

  const deleteCandidate = async (id, name) => {
    if (!window.confirm(`Delete candidate "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/candidates/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      fetchCandidates();
    } catch { alert('Delete failed.'); }
  };

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.party.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Candidate Details</div>
            <div className="topbar-sub">View and update all candidates across elections</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-control" style={{ width: 200 }} id="cd-search" name="search" autoComplete="off" placeholder="🔍 Search candidates..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/add-candidate')}>+ Add Candidate</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading candidates…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {filtered.map(c => (
              <div key={c._id} className="card card-hover" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(98,126,234,0.25),rgba(139,92,246,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '2px solid var(--border)', overflow: 'hidden' }}>
                    {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 3 }}>{c.name}</div>
                    <span className="badge badge-blue">{c.party}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                  {[
                    ['Election', c.electionTitle || c.election?.title || '—'],
                    ['Age', c.age || '—'],
                    ['Qualification', c.qualification || '—'],
                    ['Votes', c.voteCount ?? 0],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.83rem' }}>
                      <span style={{ color: 'var(--muted)' }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(c)}>✏️ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteCandidate(c._id, c.name)}>🗑</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                No candidates found. <a href="/admin/add-candidate">Add one →</a>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
            <div className="modal-box">
              <div className="modal-title">Edit Candidate — {editModal.name}</div>
              {msg && <div className={`alert ${msg.includes('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="cd-edit-name">Full Name</label>
                  <input id="cd-edit-name" autoComplete="off" name="name" className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cd-edit-party">Party</label>
                  <input id="cd-edit-party" autoComplete="off" name="party" className="form-control" value={editForm.party} onChange={e => setEditForm({ ...editForm, party: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="cd-edit-age">Age</label>
                  <input id="cd-edit-age" autoComplete="off" name="age" className="form-control" type="number" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cd-edit-qual">Qualification</label>
                  <input id="cd-edit-qual" autoComplete="off" name="qualification" className="form-control" value={editForm.qualification} onChange={e => setEditForm({ ...editForm, qualification: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cd-edit-bio">Bio</label>
                <textarea id="cd-edit-bio" autoComplete="off" name="bio" className="form-control" rows={3} value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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