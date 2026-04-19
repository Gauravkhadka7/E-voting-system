import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home              from './pages/Home';
import ForgotPassword    from './pages/ForgotPassword';
import AdminLogin        from './pages/admin/AdminLogin';
import AdminDashboard    from './pages/admin/AdminDashboard';
import AddCandidate      from './pages/admin/AddCandidate';
import CreateElection    from './pages/admin/CreateElection';
import CandidateDetails  from './pages/admin/CandidateDetails';
import ElectionDetails   from './pages/admin/ElectionDetails';
import AdminManagement   from './pages/admin/AdminManagement';
import UserSignup        from './pages/user/UserSignup';
import UserLogin         from './pages/user/UserLogin';
import UserDashboard     from './pages/user/UserDashboard';
import VoterRegistration from './pages/user/VoterRegistration';
import VoteCasting       from './pages/user/VoteCasting';
import './style.css';

const AdminRoute = ({ children }) => localStorage.getItem('adminToken') ? children : <Navigate to="/admin/login" replace/>;
const UserRoute  = ({ children }) => localStorage.getItem('userToken')  ? children : <Navigate to="/user/login"  replace/>;

const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/admin/login" replace/>;
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    if (p.adminRole !== 'super_admin') return <Navigate to="/admin/dashboard" replace/>;
  } catch { return <Navigate to="/admin/login" replace/>; }
  return children;
};

export default function App() {
  return (
    <Router future={{ v7_startTransition:true, v7_relativeSplatPath:true }}>
      <Routes>
        {/* Public — NO election data */}
        <Route path="/"                      element={<Home/>}/>
        <Route path="/forgot-password"       element={<ForgotPassword/>}/>
        <Route path="/reset-password"        element={<ForgotPassword/>}/>
        <Route path="/user/signup"           element={<UserSignup/>}/>
        <Route path="/user/login"            element={<UserLogin/>}/>
        <Route path="/admin/login"           element={<AdminLogin/>}/>

        {/* Admin — protected */}
        <Route path="/admin/dashboard"       element={<AdminRoute><AdminDashboard/></AdminRoute>}/>
        <Route path="/admin/elections"       element={<AdminRoute><ElectionDetails/></AdminRoute>}/>
        <Route path="/admin/create-election" element={<AdminRoute><CreateElection/></AdminRoute>}/>
        <Route path="/admin/candidates"      element={<AdminRoute><CandidateDetails/></AdminRoute>}/>
        <Route path="/admin/add-candidate"   element={<AdminRoute><AddCandidate/></AdminRoute>}/>
        <Route path="/admin/management"      element={<SuperAdminRoute><AdminManagement/></SuperAdminRoute>}/>

        {/* User — protected */}
        <Route path="/user/dashboard"        element={<UserRoute><UserDashboard/></UserRoute>}/>
        <Route path="/user/register-voter"   element={<UserRoute><VoterRegistration/></UserRoute>}/>
        <Route path="/user/vote"             element={<UserRoute><VoteCasting/></UserRoute>}/>

        <Route path="*"                      element={<Navigate to="/" replace/>}/>
      </Routes>
    </Router>
  );
}