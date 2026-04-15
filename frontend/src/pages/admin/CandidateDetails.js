import React, { useState, useEffect, useCallback } from 'react';
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

  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCandidates = useCallback(() => {
    setLoading(true);
    api.get('/api/candidates', { headers })
      .then(res => setCandidates(res.data))
      .catch(() => setCandidates([
        { _id:'1', name:'Alice Kumar',  party:'Progressive Alliance', electionTitle:'Presidential 2024', age:45, qualification:'MBA',  imageUrl:'', voteCount:124 },
        { _id:'2', name:'Bob Sherpa',   party:'Reform Coalition',     electionTitle:'Presidential 2024', age:52, qualification:'LLB',  imageUrl:'', voteCount:98  },
        { _id:'3', name:'Clara Thapa',  party:'Green Future',         electionTitle:'Presidential 2024', age:39, qualification:'PhD',  imageUrl:'', voteCount:76  },
      ]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const openEdit = (c) => {
    setEditForm({ name:c.name, party:c.party, age:c.age, qualification:c.qualification, bio:c.bio||'' });
    setEditModal(c);
  };

  const saveEdit = async () => {
    setSaving(true); setMsg('');
    try {
      await api.put(`/api/candidates/${editModal._id}`, editForm, { headers });
      setMsg('✅ Candidate updated');
      fetchCandidates();
      setTimeout(() => { setEditModal(null); setMsg(''); }, 1500);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Update failed'));
    } finally { setSaving(false); }
  };

  const deleteCand = async (id, name) => {
    if (!window.confirm(`Delete candidate "${name}"?`)) return;
    try {
      await api.delete(`/api/candidates/${id}`, { headers });
      setCandidates(candidates.filter(c => c._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = candidates.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.party?.toLowerCase().includes(search.toLowerCase())
  );

  const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Candidates</div>
            <div className="topbar-sub">{candidates.length} total candidates across all elections</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/add-candidate')}>+ Add Candidate</button>
        </div>

        <div className="card" style={{marginBottom:20}}>
          <input id="cd-search" name="search" className="form-control" autoComplete="off"
            style={{maxWidth:320}} placeholder="🔍 Search by name or party…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading candidates…</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'40px 0',color:'var(--muted)'}}>
            {search ? `No candidates matching "${search}"` : 'No candidates yet. Add your first candidate!'}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {filtered.map((c, i) => {
              const color = colors[i % colors.length];
              return (
                <div key={c._id} className="card" style={{position:'relative',overflow:'hidden',borderTop:`3px solid ${color}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <div style={{width:52,height:52,borderRadius:'50%',background:`${color}18`,border:`2px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',fontSize:22,flexShrink:0}}>
                      {c.imageUrl ? <img src={c.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : '👤'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                      <span style={{display:'inline-block',padding:'2px 10px',borderRadius:12,background:`${color}18`,border:`1px solid ${color}44`,color,fontSize:'.7rem',fontWeight:700}}>{c.party}</span>
                    </div>
                  </div>
                  {c.electionTitle && <div style={{fontSize:'.78rem',color:'var(--muted)',marginBottom:6}}>🗳️ {c.electionTitle}</div>}
                  {c.age && <div style={{fontSize:'.78rem',color:'var(--muted)',marginBottom:4}}>Age: {c.age} {c.qualification ? `· ${c.qualification}` : ''}</div>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
                    <div style={{fontWeight:700,color,fontSize:'.9rem'}}>{c.voteCount || 0} votes</div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={() => openEdit(c)} className="btn btn-outline btn-sm">✏️ Edit</button>
                      <button onClick={() => deleteCand(c._id, c.name)} className="btn btn-sm" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#EF4444'}}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit modal */}
        {editModal && (
          <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setEditModal(null); }}>
            <div className="modal-box">
              <div className="modal-title">Edit — {editModal.name}</div>
              {msg && <div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-error'}`}>{msg}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="ed-cand-name">Full Name</label>
                <input id="ed-cand-name" name="name" className="form-control" autoComplete="off" value={editForm.name||''} onChange={e=>setEditForm({...editForm,name:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ed-cand-party">Party</label>
                <input id="ed-cand-party" name="party" className="form-control" autoComplete="off" value={editForm.party||''} onChange={e=>setEditForm({...editForm,party:e.target.value})}/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-cand-age">Age</label>
                  <input id="ed-cand-age" name="age" className="form-control" autoComplete="off" type="number" value={editForm.age||''} onChange={e=>setEditForm({...editForm,age:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-cand-qual">Qualification</label>
                  <input id="ed-cand-qual" name="qualification" className="form-control" autoComplete="off" value={editForm.qualification||''} onChange={e=>setEditForm({...editForm,qualification:e.target.value})}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ed-cand-bio">Bio</label>
                <textarea id="ed-cand-bio" name="bio" className="form-control" autoComplete="off" rows={3} value={editForm.bio||''} onChange={e=>setEditForm({...editForm,bio:e.target.value})}/>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={saveEdit} className={`btn btn-primary btn-full ${saving?'btn-loading':''}`} disabled={saving}>
                  {saving?'Saving…':'💾 Save Changes'}
                </button>
                <button onClick={()=>setEditModal(null)} className="btn btn-outline">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}