import React, { createContext, useContext, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Pages - Public
import Home from "./pages/Home";
import PrivacyPolicy from "./pages/Privacypolicy";
import TermsOfService from "./pages/TermsOfService";
import ForgotPassword from "./pages/ForgotPassword";

// Pages - User
import UserLogin from "./pages/user/UserLogin";
import UserSignup from "./pages/user/UserSignup";
import UserDashboard from "./pages/user/UserDashboard";
import UserProfile from "./pages/user/UserProfile";
import VoteCasting from "./pages/user/VoteCasting";
import VoteHistory from "./pages/user/VoteHistory";
import VoterRegistration from "./pages/user/VoterRegistration";

// Pages - Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateElection from "./pages/admin/CreateElection";
import ElectionDetails from "./pages/admin/ElectionDetails";
import AddCandidate from "./pages/admin/AddCandidate";
import CandidateDetails from "./pages/admin/CandidateDetails";
import AdminManagement from "./pages/admin/AdminManagement";
import UserAccounts from "./pages/admin/UserAccounts";
import ElectionHistory from "./pages/admin/ElectionHistory";
import AdminReports from "./pages/admin/AdminReports";

// Components
import CookieConsent from "./components/CookieConsent";

// ─── AUTH CONTEXT ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    const storedAdmin = localStorage.getItem("admin");

    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        setIsAdmin(false);
      } catch {}
    } else if (token && storedAdmin) {
      try {
        setUser(JSON.parse(storedAdmin));
        setIsAdmin(true);
      } catch {}
    }
    setLoading(false);
  }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.removeItem("admin");
    setUser(userData);
    setIsAdmin(false);
  };

  const loginAdmin = (token, adminData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("admin", JSON.stringify(adminData));
    localStorage.removeItem("user");
    setUser(adminData);
    setIsAdmin(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin");
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginUser, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── GUARDS ───────────────────────────────────────────────────────────────────
function UserRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user || isAdmin) return <Navigate to="/user/login" state={{ from: location }} replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user || !isAdmin) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return children;
}

function GuestRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  if (user) {
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/user/dashboard" replace />;
  }
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
        <CookieConsent />

        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* User Auth */}
          <Route
            path="/user/login"
            element={
              <GuestRoute>
                <UserLogin />
              </GuestRoute>
            }
          />
          <Route
            path="/user/register"
            element={
              <GuestRoute>
                <UserSignup />
              </GuestRoute>
            }
          />
          <Route
            path="/voter/register"
            element={
              <GuestRoute>
                <VoterRegistration />
              </GuestRoute>
            }
          />

          {/* User Protected */}
          <Route
            path="/user/dashboard"
            element={
              <UserRoute>
                <UserDashboard />
              </UserRoute>
            }
          />
          <Route
            path="/user/profile"
            element={
              <UserRoute>
                <UserProfile />
              </UserRoute>
            }
          />
          <Route
            path="/user/vote/:electionId"
            element={
              <UserRoute>
                <VoteCasting />
              </UserRoute>
            }
          />
          <Route
            path="/user/vote-history"
            element={
              <UserRoute>
                <VoteHistory />
              </UserRoute>
            }
          />

          {/* Admin Auth */}
          <Route
            path="/admin/login"
            element={
              <GuestRoute adminOnly>
                <AdminLogin />
              </GuestRoute>
            }
          />

          {/* Admin Protected */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/elections/create"
            element={
              <AdminRoute>
                <CreateElection />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/elections/:id"
            element={
              <AdminRoute>
                <ElectionDetails />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/elections/:id/add-candidate"
            element={
              <AdminRoute>
                <AddCandidate />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/candidates/:id"
            element={
              <AdminRoute>
                <CandidateDetails />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/management"
            element={
              <AdminRoute>
                <AdminManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <UserAccounts />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/history"
            element={
              <AdminRoute>
                <ElectionHistory />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AdminRoute>
                <AdminReports />
              </AdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}