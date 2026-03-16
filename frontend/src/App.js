import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Home from './pages/Home';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AddCandidate from './pages/admin/AddCandidate';
import CreateElection from './pages/admin/CreateElection';
import CandidateDetails from './pages/admin/CandidateDetails';
import ElectionDetails from './pages/admin/ElectionDetails';

// User pages
import UserSignup from './pages/user/UserSignup';
import UserLogin from './pages/user/UserLogin';
import UserDashboard from './pages/user/UserDashboard';
import VoterRegistration from './pages/user/VoterRegistration';
import VoteCasting from './pages/user/VoteCasting';

import './style.css';

// Protected route helper
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" replace />;
};

const UserRoute = ({ children }) => {
  const token = localStorage.getItem('userToken');
  return token ? children : <Navigate to="/user/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Home — two options */}
        <Route path="/" element={<Home />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/add-candidate" element={<AdminRoute><AddCandidate /></AdminRoute>} />
        <Route path="/admin/create-election" element={<AdminRoute><CreateElection /></AdminRoute>} />
        <Route path="/admin/candidates" element={<AdminRoute><CandidateDetails /></AdminRoute>} />
        <Route path="/admin/elections" element={<AdminRoute><ElectionDetails /></AdminRoute>} />

        {/* User routes */}
        <Route path="/user/signup" element={<UserSignup />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/dashboard" element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/user/register-voter" element={<UserRoute><VoterRegistration /></UserRoute>} />
        <Route path="/user/vote" element={<UserRoute><VoteCasting /></UserRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;