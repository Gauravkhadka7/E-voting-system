import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../App";
import { authAPI } from "../../utils/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.adminLogin({ email, password });
      loginAdmin(res.data.token, res.data.admin);
      toast.success(`Welcome, Admin ${res.data.admin.name}!`);
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md page-enter">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">BV</span>
            </div>
            <span className="font-display text-xl font-bold text-white">BlockVote</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 border border-amber-700/40 rounded-full text-sm text-amber-400 mb-4">
            🔐 Administrator Access
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage elections</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Admin Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="admin@example.com" required autoFocus />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password?type=admin" className="text-xs text-indigo-400 hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} className="input-field pr-10"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</>
              ) : "Sign In as Admin"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700 text-center">
            <p className="text-sm text-slate-400">
              Not an admin?{" "}
              <Link to="/user/login" className="text-indigo-400 hover:underline">User Login →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}