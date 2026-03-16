import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/admin/dashboard',     icon: '📊', label: 'Dashboard' },
  { path: '/admin/create-election', icon: '🗳️', label: 'Create Election' },
  { path: '/admin/elections',     icon: '📋', label: 'Election Details' },
  { path: '/admin/add-candidate', icon: '➕', label: 'Add Candidate' },
  { path: '/admin/candidates',    icon: '👥', label: 'Candidate Details' },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⛓</div>
        BlockVote
      </div>
      <nav className="sidebar-nav">
        <div style={{ fontSize: '.68rem', color: 'var(--muted)', padding: '0 14px 8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Admin Panel</div>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="si-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          onClick={logout}
          className="btn btn-outline btn-sm btn-full"
          style={{ justifyContent: 'flex-start', gap: 8 }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}