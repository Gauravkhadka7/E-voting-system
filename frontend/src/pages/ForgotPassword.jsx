import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { authAPI } from "../utils/api";

export default function ForgotPassword() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState("forgot"); // forgot | reset
  const [isAdmin, setIsAdmin] = useState(params.get("type") === "admin");
  const [token] = useState(params.get("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email, isAdmin });
      setSent(true);
      toast.success("Reset link sent if email exists");
    } catch {
      toast.error("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password, type: isAdmin ? "admin" : "user" });
      toast.success("Password reset successfully!");
      setTimeout(() => window.location.href = isAdmin ? "/admin/login" : "/user/login", 1500);
    } catch {
      toast.error("Failed to reset password. Token may be expired.");
    } finally {
      setLoading(false);
    }
  };

  const isReset = token !== "";

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="w-full max-w-md page-enter">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              {isReset ? "Set New Password" : "Forgot Password"}
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {isReset
                ? "Enter your new password below"
                : "Enter your email and we'll send a reset link"}
            </p>
          </div>

          <div className="card">
            {!isReset && (
              <div className="flex rounded-lg bg-slate-700/50 p-1 mb-6">
                <button
                  onClick={() => setIsAdmin(false)}
                  className={`flex-1 py-2 text-sm rounded-md transition-all ${!isAdmin ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  User
                </button>
                <button
                  onClick={() => setIsAdmin(true)}
                  className={`flex-1 py-2 text-sm rounded-md transition-all ${isAdmin ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Admin
                </button>
              </div>
            )}

            {sent ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">📧</div>
                <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
                <p className="text-slate-400 text-sm">
                  If an account with that email exists, you'll receive a reset link shortly.
                </p>
                <Link to={isAdmin ? "/admin/login" : "/user/login"} className="mt-6 btn-primary block text-center">
                  Back to Login
                </Link>
              </div>
            ) : isReset ? (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="input-field" placeholder="At least 8 characters" required minLength={8} />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="input-field" placeholder="Repeat new password" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input-field" placeholder="your@email.com" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}

            {!sent && (
              <p className="mt-4 text-center text-sm text-slate-400">
                Remember your password?{" "}
                <Link to={isAdmin ? "/admin/login" : "/user/login"} className="text-indigo-400 hover:underline">
                  Login
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}