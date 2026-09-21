import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const ADMIN_ROLES = {
  super_admin:       { label: 'Super Admin',        color: '#EF4444', perms: ['All permissions'] },
  election_manager:  { label: 'Election Manager',   color: '#627EEA', perms: ['Create elections','Update elections','View all'] },
  candidate_manager: { label: 'Candidate Manager',  color: '#8B5CF6', perms: ['Add candidates','Update candidates','Delete candidates','View all'] },
  viewer:            { label: 'Viewer',              color: '#14B8A6', perms: ['View all (read-only)'] },
};

export default function AdminManagement() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState('admins');   // admins | users | assign
  const [admins, setAdmins]     = useState([]);
  const [users,  setUsers]      = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [error, setError]       = useState('');

  // New admin form
  const [newAdmin, setNewAdmin] = useState({ username:'', email:'', password:'', adminRole:'viewer' });
  // Assign elections form
  const [assignUserId, setAssignUserId] = useState('');
  const [assignElections, setAssignElections] = useState([]);

  const token   = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  // Only super_admin can access this page
  useEffect(() => {
    if (adminUser.adminRole && adminUser.adminRole !== 'super_admin') {
      navigate('/admin/dashboard');
    }
  }, [adminUser.adminRole, navigate]);

  const loadAdmins = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/list-admins', { headers })
      .then(r => setAdmins(r.data || []))
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const loadUsers = useCallback(() => {
    setLoading(true);
    api.get('/api/voter/all', { headers })
      .then(r => setUsers(r.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const loadElections = useCallback(() => {
    api.get('/api/elections', { headers })
      .then(r => setElections(r.data || []))
      .catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (tab === 'admins') loadAdmins();
    if (tab === 'users' || tab === 'assign') { loadUsers(); loadElections(); }
  }, [tab, loadAdmins, loadUsers, loadElections]);

  const createAdmin = async e => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await api.post('/api/auth/admin/register', newAdmin, { headers });
      setMsg(`✅ Admin "${newAdmin.username}" created with role: ${newAdmin.adminRole}`);
      setNewAdmin({ username:'', email:'', password:'', adminRole:'viewer' });
      loadAdmins();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create admin'); }
  };

  const assignUserElections = async () => {
    if (!assignUserId) return setError('Select a user first');
    setError(''); setMsg('');
    try {
      await api.post('/api/candidates/assign-user', { userId: assignUserId, assignedElections: assignElections }, { headers });
      setMsg(`✅ User election access updated. ${assignElections.length === 0 ? 'User can see ALL elections.' : `User can only see ${assignElections.length} election(s).`}`);
    } catch (err) { setError(err.response?.data?.message || 'Assignment failed'); }
  };

  const toggleElectionAssign = (id) => {
    setAssignElections(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">👑 Admin Management</div>
            <div className="topbar-sub">Manage admin roles, user permissions, and election access control</div>
          </div>
        </div>

        {/* Role guide */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 12 }}>📋 Role Permissions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {Object.entries(ADMIN_ROLES).map(([key, r]) => (
              <div key={key} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--card2)', borderLeft: `3px solid ${r.color}` }}>
                <div style={{ fontWeight: 700, color: r.color, marginBottom: 6, fontSize: '.85rem' }}>{r.label}</div>
                {r.perms.map(p => <div key={p} style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 2 }}>✓ {p}</div>)}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--card)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[
            { key: 'admins', label: '👑 Admins' },
            { key: 'users',  label: '👥 Users' },
            { key: 'assign', label: '🎯 Assign Access' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.83rem', transition: 'all .2s',
                background: tab === t.key ? 'var(--eth)' : 'transparent', color: tab === t.key ? '#fff' : 'var(--muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
        {msg   && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}

        {/* ── ADMINS TAB ── */}
        {tab === 'admins' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
            {/* List */}
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 14 }}>Registered Admins</div>
                {loading ? <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
                : admins.length === 0 ? <div style={{ color: 'var(--muted)', padding: 20 }}>No sub-admins yet. Create one →</div>
                : admins.map(a => {
                  const roleInfo = ADMIN_ROLES[a.adminRole] || ADMIN_ROLES.viewer;
                  return (
                    <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${roleInfo.color}22`, border: `2px solid ${roleInfo.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: roleInfo.color, flexShrink: 0 }}>
                        {(a.username||'A')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{a.username}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{a.email}</div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 12, background: `${roleInfo.color}18`, color: roleInfo.color, fontSize: '.72rem', fontWeight: 700 }}>{roleInfo.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create admin form */}
            <div className="card">
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 16 }}>➕ Create Sub-Admin</div>
              <form onSubmit={createAdmin} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="na-user">Username *</label>
                  <input id="na-user" name="username" className="form-control" autoComplete="off"
                    placeholder="admin_username" value={newAdmin.username}
                    onChange={e => setNewAdmin({...newAdmin,username:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="na-email">Email *</label>
                  <input id="na-email" name="email" className="form-control" type="email" autoComplete="off"
                    placeholder="admin@domain.com" value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin,email:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="na-pass">Password *</label>
                  <input id="na-pass" name="password" className="form-control" type="password" autoComplete="new-password"
                    placeholder="Min 6 characters" value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin,password:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="na-role">Admin Role *</label>
                  <select id="na-role" name="adminRole" className="form-control" autoComplete="off"
                    value={newAdmin.adminRole} onChange={e => setNewAdmin({...newAdmin,adminRole:e.target.value})}>
                    {Object.entries(ADMIN_ROLES).filter(([k]) => k !== 'super_admin').map(([k,r]) => (
                      <option key={k} value={k}>{r.label}</option>
                    ))}
                  </select>
                  <div className="form-hint">{ADMIN_ROLES[newAdmin.adminRole]?.perms.join(' · ')}</div>
                </div>
                <button type="submit" className="btn btn-primary btn-full">Create Admin →</button>
              </form>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div className="card">
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 14 }}>Registered Voters</div>
            {loading ? <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
            : users.length === 0 ? <div style={{ color: 'var(--muted)', padding: 20 }}>No users yet</div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Name','Email','Role','Registered','Voted','Assigned Elections'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '.74rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u,i) => (
                      <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '.85rem' }}>{u.userName||u.name||'—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '.82rem', color: 'var(--muted)' }}>{u.userEmail||u.email||'—'}</td>
                        <td style={{ padding: '10px 12px' }}><span className="badge badge-blue">{u.userRole||'voter'}</span></td>
                        <td style={{ padding: '10px 12px' }}>{u.isRegistered ? <span className="badge badge-green">Yes</span> : <span className="badge">No</span>}</td>
                        <td style={{ padding: '10px 12px' }}>{u.hasVoted ? <span className="badge badge-purple">Voted</span> : <span className="badge">No</span>}</td>
                        <td style={{ padding: '10px 12px', fontSize: '.78rem', color: 'var(--muted)' }}>
                          {u.assignedElections?.length > 0 ? `${u.assignedElections.length} elections` : 'All elections'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ASSIGN ACCESS TAB ── */}
        {tab === 'assign' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            <div className="card">
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 14 }}>🎯 Restrict User Election Access</div>
              <div style={{ fontSize: '.83rem', color: 'var(--sub)', marginBottom: 16, lineHeight: 1.7 }}>
                Select a user and choose which elections they can participate in. If no elections are selected, the user can see <strong style={{ color: 'var(--text)' }}>all elections</strong>.
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="assign-user">Select User *</label>
                <select id="assign-user" name="userId" className="form-control" autoComplete="off"
                  value={assignUserId} onChange={e => { setAssignUserId(e.target.value); setAssignElections(users.find(u=>u._id===e.target.value||u.userId===e.target.value)?.assignedElections||[]); }}>
                  <option value="">— Select a user —</option>
                  {users.map(u => <option key={u._id||u.userId} value={u.userId||u._id}>{u.userName||u.name} ({u.userEmail||u.email})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Allowed Elections (leave empty = access all)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {elections.map(el => (
                    <label key={el._id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: assignElections.includes(el._id) ? 'rgba(98,126,234,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${assignElections.includes(el._id) ? 'rgba(98,126,234,0.3)' : 'var(--border)'}`, transition: 'all .2s' }}>
                      <input type="checkbox" checked={assignElections.includes(el._id)} onChange={() => toggleElectionAssign(el._id)} style={{ accentColor: 'var(--eth)', width: 16, height: 16 }} />
                      <span style={{ fontSize: '.83rem' }}>{el.title}</span>
                    </label>
                  ))}
                  {elections.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '.82rem' }}>No elections yet</div>}
                </div>
              </div>

              <button onClick={assignUserElections} className="btn btn-primary btn-full" disabled={!assignUserId}>
                🎯 Apply Access Restriction
              </button>

              {assignUserId && (
                <div style={{ marginTop: 10, fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center' }}>
                  {assignElections.length === 0 ? '⚠ No elections selected — user will see ALL elections' : `✅ User will only see ${assignElections.length} election(s)`}
                </div>
              )}
            </div>

            <div className="card" style={{ background: 'rgba(20,184,166,0.04)', borderColor: 'rgba(20,184,166,0.2)' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--teal)', marginBottom: 12 }}>📖 How it works</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '🎯', title: 'Assign elections', desc: 'Select which elections a user can see and vote in. Unassigned elections are completely hidden from them.' },
                  { icon: '🔒', title: 'Backend enforced', desc: 'The API filters candidates and elections based on user assignment. Frontend hiding alone is not enough.' },
                  { icon: '👁️', title: 'Empty = see all', desc: 'If you assign zero elections to a user, they can participate in all elections (default behavior).' },
                  { icon: '⛓', title: 'Smart contract', desc: 'The Voting.sol contract also enforces one-vote-per-wallet per election on-chain.' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.83rem', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--sub)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}