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
  const [elections,  setElections]  = useState([]);
  const [users,      setUsers]      = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editModal,  setEditModal]  = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [assignEl,   setAssignEl]   = useState(null);
  const [assignIds,  setAssignIds]  = useState([]);

  const token   = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/elections', { headers }),
      api.get('/api/voter/all', { headers }).catch(()=>({data:[]})),
      api.get('/api/candidates', { headers }),
    ]).then(([elRes, voterRes, candRes]) => {
      setElections(elRes.data||[]);
      setUsers(voterRes.data||[]);
      setCandidates(candRes.data||[]);
    }).catch(()=>{
      setElections([
        { _id:'1', title:'Presidential Election 2024', startDate:'2025-01-01', endDate:'2025-12-31', totalVotes:186, assignedUsers:[] },
      ]);
    }).finally(()=>setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const openEdit = el => {
    setEditForm({
      title:     el.title,
      startDate: el.startDate ? el.startDate.split('T')[0] : '',
      endDate:   el.endDate   ? el.endDate.split('T')[0]   : '',
      startTime: el.startDate ? (el.startDate.split('T')[1]||'').slice(0,5)||'08:00' : '08:00',
      endTime:   el.endDate   ? (el.endDate.split('T')[1]||'').slice(0,5)||'18:00'   : '18:00',
    });
    setEditModal(el);
    setMsg('');
  };

  const saveEdit = async () => {
    setSaving(true); setMsg('');
    try {
      const startDate = `${editForm.startDate}T${editForm.startTime||'08:00'}:00.000Z`;
      const endDate   = `${editForm.endDate}T${editForm.endTime||'18:00'}:00.000Z`;
      await api.put(`/api/elections/${editModal._id}`, { title:editForm.title, startDate, endDate }, { headers });
      setMsg('✅ Election updated');
      load();
      setTimeout(()=>{ setEditModal(null); setMsg(''); }, 1500);
    } catch (err) { setMsg('❌ '+(err.response?.data?.message||'Update failed')); }
    finally { setSaving(false); }
  };

  const deleteEl = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try { await api.delete(`/api/elections/${id}`, { headers }); load(); }
    catch (err) { alert(err.response?.data?.message||'Delete failed'); }
  };

  // Open assign modal — pre-check already-assigned users ✅
  const openAssign = el => {
    // Load current assignedUsers from election data
    const current = el.assignedUsers || [];
    // Also check each user's assignedElections array
    const assigned = users
      .filter(u => {
        const uid = u.userId || u._id;
        return current.includes(uid) || (u.assignedElections||[]).includes(el._id);
      })
      .map(u => u.userId || u._id);
    setAssignIds([...new Set(assigned)]);
    setAssignEl(el);
    setMsg('');
  };

  const saveAssign = async () => {
    if (!assignEl) return;
    setSaving(true); setMsg('');
    try {
      await api.post(`/api/elections/${assignEl._id}/assign-users`, { userIds: assignIds }, { headers });
      setMsg(`✅ ${assignIds.length} voter(s) assigned to "${assignEl.title}"`);
      load(); // reload to update checkmarks
      setTimeout(()=>{ setAssignEl(null); setMsg(''); }, 2000);
    } catch (err) { setMsg('❌ '+(err.response?.data?.message||'Assignment failed')); }
    finally { setSaving(false); }
  };

  const toggleUser = id =>
    setAssignIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);

  return (
    <div className="dashboard-layout">
      <AdminSidebar/>
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Elections</div>
            <div className="topbar-sub">Manage elections and assign voters</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>navigate('/admin/create-election')}>+ Create Election</button>
        </div>

        {loading ? <div style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>Loading…</div>
        : elections.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗳️</div>
            No elections yet.
            <button className="btn btn-primary btn-sm" style={{ marginLeft:12 }} onClick={()=>navigate('/admin/create-election')}>Create First →</button>
          </div>
        ) : elections.map(el => {
          const st = getStatus(el.startDate, el.endDate);
          const bc = candidates.filter(c=>c.election===el._id).length;
          // Count assigned voters for this election (check both sources)
          const assignedCount = users.filter(u => {
            const uid = u.userId||u._id;
            return (el.assignedUsers||[]).includes(uid) || (u.assignedElections||[]).includes(el._id);
          }).length;
          const badgeClass = st==='active'?'badge-green':st==='upcoming'?'badge-blue':'badge-purple';

          return (
            <div key={el._id} className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                    <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'1.02rem' }}>{el.title}</div>
                    <span className={`badge ${badgeClass}`} style={{ textTransform:'capitalize' }}>{st}</span>
                  </div>
                  <div style={{ display:'flex', gap:16, fontSize:'.78rem', color:'var(--muted)', flexWrap:'wrap', alignItems:'center' }}>
                    <span>📅 {el.startDate?new Date(el.startDate).toLocaleDateString():'—'} → {el.endDate?new Date(el.endDate).toLocaleDateString():'—'}</span>
                    <span style={{ color:'var(--purple)', fontWeight:600 }}>👤 {bc} candidate{bc!==1?'s':''}</span>
                    <span style={{ color:'var(--teal)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                      📋 {assignedCount} voter{assignedCount!==1?'s':''} assigned
                      {assignedCount > 0 && <span style={{ color:'var(--green)' }}>✓</span>}
                    </span>
                    <span style={{ color:'var(--eth)', fontWeight:600 }}>✅ {el.totalVotes||0} votes</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
                  <button onClick={()=>openAssign(el)} className="btn btn-primary btn-sm">
                    👥 {assignedCount>0?`Manage (${assignedCount})` : 'Assign Voters'}
                  </button>
                  <button onClick={()=>openEdit(el)} className="btn btn-outline btn-sm">✏️ Edit</button>
                  <button onClick={()=>deleteEl(el._id,el.title)} className="btn btn-sm" style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444' }}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Edit Modal */}
        {editModal && (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setEditModal(null);}}>
            <div className="modal-box">
              <div className="modal-title">Edit — {editModal.title}</div>
              {msg&&<div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-error'}`} style={{ marginBottom:12 }}>{msg}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="ed-title">Title</label>
                <input id="ed-title" name="title" className="form-control" autoComplete="off" value={editForm.title||''} onChange={e=>setEditForm({...editForm,title:e.target.value})}/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-sd">Start Date</label>
                  <input id="ed-sd" name="startDate" className="form-control" autoComplete="off" type="date" value={editForm.startDate||''} onChange={e=>setEditForm({...editForm,startDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-st">Start Time</label>
                  <input id="ed-st" name="startTime" className="form-control" autoComplete="off" type="time" value={editForm.startTime||'08:00'} onChange={e=>setEditForm({...editForm,startTime:e.target.value})}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-ed">End Date</label>
                  <input id="ed-ed" name="endDate" className="form-control" autoComplete="off" type="date" value={editForm.endDate||''} onChange={e=>setEditForm({...editForm,endDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ed-et">End Time</label>
                  <input id="ed-et" name="endTime" className="form-control" autoComplete="off" type="time" value={editForm.endTime||'18:00'} onChange={e=>setEditForm({...editForm,endTime:e.target.value})}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button onClick={saveEdit} className={`btn btn-primary btn-full ${saving?'btn-loading':''}`} disabled={saving}>{saving?'Saving…':'💾 Save'}</button>
                <button onClick={()=>setEditModal(null)} className="btn btn-outline">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Voters Modal — checkboxes pre-ticked for assigned users */}
        {assignEl && (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setAssignEl(null);}}>
            <div className="modal-box" style={{ maxWidth:520 }}>
              <div className="modal-title">👥 Assign Voters — {assignEl.title}</div>
              <div style={{ fontSize:'.82rem', color:'var(--sub)', marginBottom:12, lineHeight:1.65 }}>
                <strong style={{ color:'var(--green)' }}>✅ Ticked</strong> = currently assigned. 
                Untick to remove access. Tick to add access. Users only see elections they're assigned to.
              </div>
              {msg&&<div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-error'}`} style={{ marginBottom:12 }}>{msg}</div>}

              <div style={{ maxHeight:340, overflowY:'auto', border:'1px solid var(--border)', borderRadius:10, padding:4, marginBottom:14 }}>
                {users.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:'.85rem' }}>
                    No registered voters yet. Ask voters to sign up first.
                  </div>
                ) : users.map(u => {
                  const uid  = u.userId || u._id;
                  const name = u.userName || u.name || 'Unknown';
                  const email= u.userEmail || u.email || '—';
                  const sel  = assignIds.includes(uid);
                  return (
                    <label key={uid} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:8, cursor:'pointer', background:sel?'rgba(16,185,129,0.07)':'transparent', transition:'background .15s', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <input type="checkbox" checked={sel} onChange={()=>toggleUser(uid)}
                          style={{ width:18, height:18, accentColor:'var(--green)', cursor:'pointer' }}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:'.85rem', display:'flex', alignItems:'center', gap:6 }}>
                          {name}
                          {sel && <span style={{ fontSize:'.7rem', color:'var(--green)', fontWeight:700 }}>✅ Assigned</span>}
                        </div>
                        <div style={{ fontSize:'.74rem', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                <div style={{ fontSize:'.8rem', color:'var(--muted)' }}>
                  <span style={{ color:'var(--green)', fontWeight:700 }}>{assignIds.length}</span> voter{assignIds.length!==1?'s':''} will be assigned
                  {assignIds.length===0&&<span style={{ color:'var(--amber)' }}> — no one assigned (all can see)</span>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setAssignEl(null)} className="btn btn-outline btn-sm">Cancel</button>
                  <button onClick={saveAssign} className={`btn btn-primary btn-sm ${saving?'btn-loading':''}`} disabled={saving}>
                    {saving?'Saving…':'✅ Save Assignment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}