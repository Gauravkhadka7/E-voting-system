import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Home              from './pages/Home';
import AdminLogin        from './pages/admin/AdminLogin';
import AdminDashboard    from './pages/admin/AdminDashboard';
import AddCandidate      from './pages/admin/AddCandidate';
import CreateElection    from './pages/admin/CreateElection';
import CandidateDetails  from './pages/admin/CandidateDetails';
import ElectionDetails   from './pages/admin/ElectionDetails';
import UserSignup        from './pages/user/UserSignup';
import UserLogin         from './pages/user/UserLogin';
import UserDashboard     from './pages/user/UserDashboard';
import VoterRegistration from './pages/user/VoterRegistration';
import VoteCasting       from './pages/user/VoteCasting';
import './style.css';

// Admin must be logged in
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" replace />;
};

// User must be logged in
const UserRoute = ({ children }) => {
  const token = localStorage.getItem('userToken');
  return token ? children : <Navigate to="/user/login" replace />;
};

// If user already logged in, redirect away from login/signup pages
const GuestOnlyUser = ({ children }) => {
  const token = localStorage.getItem('userToken');
  return token ? <Navigate to="/user/dashboard" replace /> : children;
};

const GuestOnlyAdmin = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? <Navigate to="/admin/dashboard" replace /> : children;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/"                      element={<Home />} />

        {/* Admin routes */}
        <Route path="/admin/login"           element={<GuestOnlyAdmin><AdminLogin /></GuestOnlyAdmin>} />
        <Route path="/admin/dashboard"       element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/add-candidate"   element={<AdminRoute><AddCandidate /></AdminRoute>} />
        <Route path="/admin/create-election" element={<AdminRoute><CreateElection /></AdminRoute>} />
        <Route path="/admin/candidates"      element={<AdminRoute><CandidateDetails /></AdminRoute>} />
        <Route path="/admin/elections"       element={<AdminRoute><ElectionDetails /></AdminRoute>} />

        {/* User routes */}
        <Route path="/user/signup"           element={<GuestOnlyUser><UserSignup /></GuestOnlyUser>} />
        <Route path="/user/login"            element={<GuestOnlyUser><UserLogin /></GuestOnlyUser>} />
        <Route path="/user/dashboard"        element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/user/register-voter"   element={<UserRoute><VoterRegistration /></UserRoute>} />
        <Route path="/user/vote"             element={<UserRoute><VoteCasting /></UserRoute>} />

        {/* Catch all */}
        <Route path="*"                      element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;