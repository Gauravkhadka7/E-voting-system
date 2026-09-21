import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import WalletSelector from "../../components/WalletSelector";
import { useAuth } from "../../App";
import { authAPI, voterAPI } from "../../utils/api";
import toast from "react-hot-toast";

export default function UserProfile() {
  const { user, loginUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({});
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authAPI.getMe();
      setProfile(res.data.user);
      setForm(res.data.user);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      const fields = ["name", "gender", "district", "municipality", "province"];
      fields.forEach((k) => { if (form[k]) fd.append(k, form[k]); });
      await voterAPI.updateProfile(fd);
      toast.success("Profile updated successfully");
      loadProfile();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error("Passwords do not match");
    if (passwords.new.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await authAPI.changePassword({ current_password: passwords.current, new_password: passwords.new });
      toast.success("Password changed successfully");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const tabs = ["profile", "security", "wallet"];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="card space-y-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 page-enter">
        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{profile?.name}</h1>
              <p className="text-slate-400">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge-blue">{profile?.primary_role}</span>
                {profile?.is_verified ? (
                  <span className="badge-green">✓ Verified</span>
                ) : (
                  <span className="badge-yellow">Pending</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${
                tab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === "profile" && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input-field" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select className="input-field" value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Province</label>
                  <input className="input-field" value={form.province || ""} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Province 3" />
                </div>
                <div>
                  <label className="label">District</label>
                  <input className="input-field" value={form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Kathmandu" />
                </div>
                <div>
                  <label className="label">Municipality</label>
                  <input className="input-field" value={form.municipality || ""} onChange={(e) => setForm({ ...form, municipality: e.target.value })} placeholder="Metropolitan" />
                </div>
              </div>

              {/* Role specific (read-only) */}
              {profile?.primary_role === "STUDENT" && (
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-3">Student Information (contact admin to update)</p>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <div>Institution: <span className="text-white">{profile.institution_name || "—"}</span></div>
                    <div>Class: <span className="text-white">{profile.class || "—"}</span></div>
                    <div>Batch: <span className="text-white">{profile.batch || "—"}</span></div>
                    <div>Roll: <span className="text-white">{profile.roll_number || "—"}</span></div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={saving} className="btn-primary py-2.5">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-6">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {["current", "new", "confirm"].map((field) => (
                <div key={field}>
                  <label className="label capitalize">{field.replace("_", " ")} Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={passwords[field]}
                    onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
              ))}
              <button type="submit" disabled={saving} className="btn-primary py-2.5">
                {saving ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        )}

        {/* Wallet tab */}
        {tab === "wallet" && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-2">Blockchain Wallet</h2>
            <p className="text-slate-400 text-sm mb-6">
              Connect your MetaMask wallet to enable blockchain vote verification.
            </p>
            {profile?.wallet_address && (
              <div className="mb-4 px-4 py-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Saved Wallet</p>
                <p className="font-mono text-sm text-white">{profile.wallet_address}</p>
              </div>
            )}
            <WalletSelector onConnected={(addr) => {
              if (addr) setProfile({ ...profile, wallet_address: addr });
            }} />
          </div>
        )}
      </div>
    </div>
  );
}