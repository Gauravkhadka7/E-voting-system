import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../App";
import { authAPI } from "../../utils/api";

const ROLES = ["STUDENT", "EMPLOYEE", "PUBLIC"];

export default function UserSignup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
    primary_role: "PUBLIC", gender: "",
    // Student
    institution_name: "", class: "", section: "", roll_number: "", batch: "", institution_id: "",
    // Employee
    company_name: "", company_id: "", branch: "", job_role: "",
    // Public
    citizenship_number: "", ward_number: "",
    // Location
    district: "", municipality: "", province: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!form.name || !form.email || !form.password) return toast.error("Please fill all required fields");
      if (form.password !== form.confirm) return toast.error("Passwords do not match");
      if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, user_roles: [form.primary_role] };
      delete payload.confirm;
      const res = await authAPI.userRegister(payload);
      loginUser(res.data.token, res.data.user);
      toast.success("Registration successful! Awaiting admin verification.");
      navigate("/user/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, name, type = "text", placeholder, required = false, options }) => (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
      {options ? (
        <select value={form[name]} onChange={set(name)} className="input-field" required={required}>
          <option value="">Select {label}</option>
          {options.map((o) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[name]} onChange={set(name)}
          className="input-field" placeholder={placeholder} required={required} />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg page-enter">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">BV</span>
            </div>
            <span className="font-display text-xl font-bold text-white">BlockVote</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Register as a voter</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step >= s ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400"
              }`}>{s}</div>
              {s < 3 && <div className={`h-px w-12 transition-all ${step > s ? "bg-indigo-600" : "bg-slate-700"}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-center gap-16 mb-8 text-xs text-slate-400">
          <span className={step >= 1 ? "text-indigo-400" : ""}>Account</span>
          <span className={step >= 2 ? "text-indigo-400" : ""}>Role</span>
          <span className={step >= 3 ? "text-indigo-400" : ""}>Details</span>
        </div>

        <div className="card">
          {/* Step 1: Basic info */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              <InputField label="Full Name" name="name" placeholder="John Doe" required />
              <InputField label="Email Address" name="email" type="email" placeholder="you@example.com" required />
              <InputField label="Password" name="password" type="password" placeholder="Min. 8 characters" required />
              <InputField label="Confirm Password" name="confirm" type="password" placeholder="Repeat password" required />
              <InputField label="Gender" name="gender" options={[
                { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" }, { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" }
              ]} />
              <button type="submit" className="btn-primary w-full py-3">Next →</button>
            </form>
          )}

          {/* Step 2: Role selection */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Select Your Role</h3>
              <div className="grid grid-cols-1 gap-3">
                {ROLES.map((role) => {
                  const icons = { STUDENT: "🎓", EMPLOYEE: "💼", PUBLIC: "🏛️" };
                  const descs = {
                    STUDENT: "Student at a school or college",
                    EMPLOYEE: "Employee of an organization",
                    PUBLIC: "General public voter",
                  };
                  return (
                    <button
                      key={role}
                      onClick={() => setForm((f) => ({ ...f, primary_role: role }))}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        form.primary_role === role
                          ? "border-indigo-500 bg-indigo-600/10"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <span className="text-2xl">{icons[role]}</span>
                      <div>
                        <div className="font-medium text-white">{role}</div>
                        <div className="text-xs text-slate-400">{descs[role]}</div>
                      </div>
                      {form.primary_role === role && (
                        <svg className="w-5 h-5 text-indigo-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">← Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3">Next →</button>
              </div>
            </div>
          )}

          {/* Step 3: Role-specific details */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {form.primary_role === "STUDENT" && (
                <>
                  <InputField label="Institution Name" name="institution_name" placeholder="School/College name" required />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Class" name="class" placeholder="Grade 10" />
                    <InputField label="Section" name="section" placeholder="A" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Roll Number" name="roll_number" placeholder="001" />
                    <InputField label="Batch" name="batch" placeholder="2080" />
                  </div>
                  <InputField label="Institution ID" name="institution_id" placeholder="Student ID" />
                </>
              )}
              {form.primary_role === "EMPLOYEE" && (
                <>
                  <InputField label="Company Name" name="company_name" placeholder="Company name" required />
                  <InputField label="Company ID" name="company_id" placeholder="Employee ID" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Branch" name="branch" placeholder="Kathmandu" />
                    <InputField label="Job Role" name="job_role" placeholder="Engineer" />
                  </div>
                </>
              )}
              {form.primary_role === "PUBLIC" && (
                <>
                  <InputField label="Citizenship Number" name="citizenship_number" placeholder="123-456-789" required />
                  <InputField label="Ward Number" name="ward_number" placeholder="Ward 5" />
                </>
              )}

              {/* Location - common */}
              <div className="pt-2 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-3">Location</p>
                <div className="grid grid-cols-1 gap-3">
                  <InputField label="Province" name="province" placeholder="Province 3" />
                  <InputField label="District" name="district" placeholder="Kathmandu" />
                  <InputField label="Municipality" name="municipality" placeholder="Kathmandu Metropolitan" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">← Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/user/login" className="text-indigo-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}