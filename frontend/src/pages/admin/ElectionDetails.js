import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const getStatus = (s,e) => {
  const now=new Date();
  if(!s||!e) return 'unknown';
  if(now<new Date(s)) return 'upcoming';
  if(now>new Date(e)) return 'completed';
  return 'active';
};

export default function ElectionDetails() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [analyticsId, setAnalyticsId] = useState(null);
  const [analytics,   setAnalytics]   = useState(null);

  const token   = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchElections = useCallback(() => {
    setLoading(true);
    api.get('/api/elections', { headers })
      .then(res => setElections(res.data))
      .catch(() => setElections([
        { _id:'1', title:'Presidential Election 2024', description:'National election', startDate:'2024-12-01T08:00:00Z', endDate:'2024-12-15T18:00:00Z', totalVotes:186 },
        { _id:'2', title:'Municipal Elections',        description:'City council',      startDate:'2025-06-10T08:00:00Z', endDate:'2025-06-20T18:00:00Z', totalVotes:0   },
        { _id:'3', title:'Student Union Vote',         description:'University union',  startDate:'2024-11-01T08:00:00Z', endDate:'2024-11-05T18:00:00Z', totalVotes:320 },
      ]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchElections(); }, [fetchElections]);

  const openEdit = (el) => {
    setEditForm({
      title:       el.title,
      description: el.description||'',
      startDate:   el.startDate ? el.startDate.split('T')[0] : '',
      startTime:   el.startDate ? (el.startDate.split('T')[1]||'').slice(0,5)||'08:00' : '08:00',
      endDate:     el.endDate   ? el.endDate.split('T')[0]   : '',
      endTime:     el.endDate   ? (el.endDate.split('T')[1]||'').slice(0,5)||'18:00'   : '18:00',
    });
    setEditModal(el);
  };

  const saveEdit = async () => {
    setSaving(true); setMsg('');
    try {
      const startDate = editForm.startDate ? `${editForm.startDate}T${editForm.startTime||'08:00'}:00.000Z` : editForm.startDate;
      const endDate   = editForm.endDate   ? `${editForm.endDate}T${editForm.endTime||'18:00'}:00.000Z`     : editForm.endDate;
      await api.put(`/api/elections/${editModal._id}`, { ...editForm, startDate, endDate }, { headers });
      setMsg('✅ Election updated');
      fetchElections();
      setTimeout(() => { setEditModal(null); setMsg(''); }, 1500);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Update failed'));
    } finally { setSaving(false); }
  };

  const deleteEl = async (id, title) => {
    if (!window.confirm(`Delete election "${title}"?`)) return;
    try {
      await api.delete(`/api/elections/${id}`, { headers });
      setElections(elections.filter(e => e._id !== id));
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const loadAnalytics = async (id) => {
    if (analyticsId === id) { setAnalyticsId(null); setAnalytics(null); return; }
    setAnalyticsId(id);
    try {
      const res = await api.get(`/api/admin/analytics/${id}`, { headers });
      setAnalytics(res.data);
    } catch {
      setAnalytics({ totalVotes:0, turnout:0, candidates:[], voterCount:0 });
    }
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Elections</div>
            <div className="topbar-sub">{elections.length} elections — click Analytics to view detailed breakdown</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/create-election')}>+ Create Election</button>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading elections…</div>
        ) : elections.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>
            <div style={{fontSize:40,marginBottom:12}}>🗳️</div>
            No elections yet.
            <button className="btn btn-primary btn-sm" style={{marginLeft:12}} onClick={()=>navigate('/admin/create-election')}>Create First →</button>
          </div>
        ) : (
          elections.map(el => {
            const st = getStatus(el.startDate, el.endDate);
            const badgeClass = st==='active'?'badge-green':st==='upcoming'?'badge-blue':'badge-purple';
            const isOpen = analyticsId === el._id;
            return (
              <div key={el._id} className="card" style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                      <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.05rem'}}>{el.title}</div>
                      <span className={`badge ${badgeClass}`} style={{textTransform:'capitalize'}}>{st}</span>
                    </div>
                    {el.description&&<div style={{fontSize:'.83rem',color:'var(--sub)',marginBottom:8}}>{el.description}</div>}
                    <div style={{display:'flex',gap:16,fontSize:'.78rem',color:'var(--muted)',flexWrap:'wrap'}}>
                      <span>📅 Start: {el.startDate?new Date(el.startDate).toLocaleString():'—'}</span>
                      <span>🏁 End: {el.endDate?new Date(el.endDate).toLocaleString():'—'}</span>
                      <span style={{color:'var(--eth)',fontWeight:700}}>✅ {el.totalVotes||0} votes</span>
                    </div>
                    {el._cid&&<div style={{fontFamily:'var(--font-mono)',fontSize:'.7rem',color:'var(--muted)',marginTop:4}}>IPFS: {el._cid}</div>}
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0,flexWrap:'wrap'}}>
                    <button onClick={()=>loadAnalytics(el._id)} className={`btn btn-sm ${isOpen?'btn-primary':'btn-outline'}`}>
                      {isOpen?'Hide':'📊 Analytics'}
                    </button>
                    <button onClick={()=>openEdit(el)} className="btn btn-outline btn-sm">✏️ Edit</button>
                    <button onClick={()=>deleteEl(el._id,el.title)} className="btn btn-sm" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#EF4444'}}>🗑️</button>
                  </div>
                </div>

                {/* Analytics panel */}
                {isOpen && analytics && (
                  <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border)'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:16}}>
                      {[
                        {label:'Total Votes',value:analytics.totalVotes,color:'#627EEA'},
                        {label:'Registered Voters',value:analytics.voterCount,color:'#8B5CF6'},
                        {label:'Turnout',value:`${analytics.turnout}%`,color:'#10B981'},
                        {label:'Candidates',value:analytics.candidates?.length||0,color:'#F59E0B'},
                      ].map((s,i)=>(
                        <div key={i} style={{background:'var(--card2)',borderRadius:10,padding:'12px 14px',borderLeft:`3px solid ${s.color}`}}>
                          <div style={{fontSize:'.75rem',color:'var(--muted)',marginBottom:4}}>{s.label}</div>
                          <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.4rem',color:s.color}}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {analytics.candidates?.map((c,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                        <div style={{width:140,fontSize:'.83rem',fontWeight:600,flexShrink:0}}>{c.name}</div>
                        <div style={{flex:1,height:10,background:'rgba(255,255,255,0.05)',borderRadius:5,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:5,background:'#627EEA',width:`${c.percentage}%`,transition:'width 1s ease'}}/>
                        </div>
                        <div style={{width:60,textAlign:'right',fontWeight:700,color:'#627EEA',fontSize:'.83rem'}}>{c.percentage}%</div>
                        <div style={{width:50,textAlign:'right',fontSize:'.78rem',color:'var(--muted)'}}>{c.voteCount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Edit modal */}
        {editModal && (
          <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setEditModal(null); }}>
            <div className="modal-box">
              <div className="modal-title">Edit Election</div>
              {msg && <div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-error'}`}>{msg}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="ed-title">Title</label>
                <input id="ed-title" name="title" className="form-control" autoComplete="off" value={editForm.title||''} onChange={e=>setEditForm({...editForm,title:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ed-desc">Description</label>
                <textarea id="ed-desc" name="description" className="form-control" autoComplete="off" rows={2} value={editForm.description||''} onChange={e=>setEditForm({...editForm,description:e.target.value})}/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-start-date">Start Date</label>
                  <input id="ed-start-date" name="startDate" className="form-control" autoComplete="off" type="date" value={editForm.startDate||''} onChange={e=>setEditForm({...editForm,startDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-start-time">Start Time</label>
                  <input id="ed-start-time" name="startTime" className="form-control" autoComplete="off" type="time" value={editForm.startTime||'08:00'} onChange={e=>setEditForm({...editForm,startTime:e.target.value})}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-end-date">End Date</label>
                  <input id="ed-end-date" name="endDate" className="form-control" autoComplete="off" type="date" value={editForm.endDate||''} onChange={e=>setEditForm({...editForm,endDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-end-time">End Time</label>
                  <input id="ed-end-time" name="endTime" className="form-control" autoComplete="off" type="time" value={editForm.endTime||'18:00'} onChange={e=>setEditForm({...editForm,endTime:e.target.value})}/>
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={saveEdit} className={`btn btn-primary btn-full ${saving?'btn-loading':''}`} disabled={saving}>
                  {saving?'Saving…':'💾 Save'}
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