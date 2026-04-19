import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const getAdminRole = () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.adminRole || 'viewer';
  } catch { return null; }
};

const hasPermission = (perm) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const perms = payload.permissions || [];
    return perms.includes(perm) || payload.adminRole === 'super_admin';
  } catch { return false; }
};

export default function AdminSidebar() {
  const navigate   = useNavigate();
  const adminUser  = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const adminRole  = getAdminRole();

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const links = [
    { path: '/admin/dashboard',       icon: '📊', label: 'Dashboard',    always: true },
    { path: '/admin/elections',       icon: '🗳️', label: 'Elections',    perm: 'view_all' },
    { path: '/admin/create-election', icon: '➕', label: 'New Election', perm: 'create_election' },
    { path: '/admin/candidates',      icon: '👤', label: 'Candidates',   perm: 'view_all' },
    { path: '/admin/add-candidate',   icon: '➕', label: 'Add Candidate',perm: 'add_candidate' },
    { path: '/admin/management',      icon: '👑', label: 'Admin Mgmt',   superOnly: true },
  ];

  const roleColors = {
    super_admin:       '#EF4444',
    election_manager:  '#627EEA',
    candidate_manager: '#8B5CF6',
    viewer:            '#14B8A6',
  };

  const roleColor = roleColors[adminRole] || '#627EEA';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ width:32, height:32, background:'var(--grad)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>⛓</div>
        <span>BlockVote</span>
      </div>

      {/* Admin info */}
      <div style={{ padding:'12px 14px', margin:'0 8px 8px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:'1px solid var(--border)' }}>
        <div style={{ fontSize:'.72rem', color:'var(--muted)', marginBottom:4 }}>Signed in as</div>
        <div style={{ fontWeight:700, fontSize:'.85rem', marginBottom:4 }}>{adminUser.username || 'Admin'}</div>
        <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:10, background:`${roleColor}18`, color:roleColor, fontSize:'.68rem', fontWeight:700 }}>
          {adminRole?.replace('_',' ') || 'admin'}
        </span>
      </div>

      {/* Nav links — filtered by permissions */}
      <nav className="sidebar-nav">
        {links.map(link => {
          if (link.superOnly && adminRole !== 'super_admin') return null;
          if (link.perm && !hasPermission(link.perm) && !link.always) return null;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
              {link.superOnly && <span style={{ fontSize:'.6rem', marginLeft:'auto', color:'#EF4444' }}>SUPER</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button onClick={logout} className="sidebar-link" style={{ background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left' }}>
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}