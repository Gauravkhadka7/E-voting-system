import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import { electionAPI } from "../../utils/api";
import toast from "react-hot-toast";

const SCOPE_TYPES = ["SCHOOL", "COLLEGE", "MUNICIPALITY", "DISTRICT", "PROVINCE", "COMPANY", "CUSTOM"];
const VOTING_TYPES = ["SINGLE", "MULTIPLE", "TOP_N", "WEIGHTED", "RANKED"];
const USER_ROLES = ["STUDENT", "EMPLOYEE", "PUBLIC", "CUSTOM"];

const emptyPosition = {
  position_name: "",
  number_of_winners: 1,
  voting_type: "SINGLE",
  write_in_enabled: false,
  eligible_voters: {
    roles: [],
    batch: [],
    gender: [],
    class: [],
    occupation: [],
    location: { district: [], municipality: [], province: [] },
    custom_filters: {},
  },
};

export default function CreateElection() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    scope_type: "CUSTOM",
    scope_id: "",
    visibility: "PUBLIC",
    allowed_user_roles: ["PUBLIC"],
    start_date: "",
    end_date: "",
    positions: [{ ...emptyPosition }],
    settings: {},
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updatePosition = (idx, key, value) => {
    const newPositions = [...form.positions];
    newPositions[idx] = { ...newPositions[idx], [key]: value };
    setField("positions", newPositions);
  };

  const addPosition = () => {
    setField("positions", [...form.positions, { ...emptyPosition }]);
  };

  const removePosition = (idx) => {
    if (form.positions.length === 1) return toast.error("At least one position required");
    setField("positions", form.positions.filter((_, i) => i !== idx));
  };

  const toggleRole = (role) => {
    const roles = form.allowed_user_roles.includes(role)
      ? form.allowed_user_roles.filter((r) => r !== role)
      : [...form.allowed_user_roles, role];
    setField("allowed_user_roles", roles);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      return toast.error("Name, start date and end date are required");
    }
    if (new Date(form.start_date) >= new Date(form.end_date)) {
      return toast.error("End date must be after start date");
    }
    if (form.positions.some((p) => !p.position_name)) {
      return toast.error("All positions must have a name");
    }

    setLoading(true);
    try {
      const res = await electionAPI.create(form);
      toast.success("Election created successfully!");
      navigate(`/admin/elections/${res.data.election.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-64"} p-6 lg:p-8`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Create Election</h1>
            <p className="text-slate-400 text-sm">Configure a new election</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {["Basic Info", "Scope & Roles", "Positions"].map((label, i) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setStep(i + 1)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  step === i + 1 ? "bg-indigo-600 text-white" : step > i + 1 ? "bg-emerald-900/30 text-emerald-400" : "bg-slate-800 text-slate-400"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  step > i + 1 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
                }`}>{step > i + 1 ? "✓" : i + 1}</span>
                {label}
              </button>
              {i < 2 && <div className="h-px w-8 bg-slate-700" />}
            </React.Fragment>
          ))}
        </div>

        <div className="max-w-3xl">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="card space-y-5">
              <h2 className="text-lg font-semibold text-white">Basic Information</h2>
              <div>
                <label className="label">Election Name <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={(e) => setField("name", e.target.value)}
                  className="input-field" placeholder="e.g. Student Council Election 2024" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={form.description} onChange={(e) => setField("description", e.target.value)}
                  className="input-field min-h-[100px] resize-none" placeholder="Brief description of this election..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date & Time <span className="text-red-400">*</span></label>
                  <input type="datetime-local" value={form.start_date}
                    onChange={(e) => setField("start_date", e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">End Date & Time <span className="text-red-400">*</span></label>
                  <input type="datetime-local" value={form.end_date}
                    onChange={(e) => setField("end_date", e.target.value)} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Visibility</label>
                <div className="grid grid-cols-3 gap-3">
                  {["PRIVATE", "RESTRICTED", "PUBLIC"].map((v) => (
                    <button key={v} onClick={() => setField("visibility", v)}
                      className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                        form.visibility === v ? "border-indigo-500 bg-indigo-600/10 text-indigo-400" : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}>{v}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => setStep(2)} className="btn-primary py-2.5 px-8">Next →</button>
            </div>
          )}

          {/* Step 2: Scope & Roles */}
          {step === 2 && (
            <div className="card space-y-5">
              <h2 className="text-lg font-semibold text-white">Scope & Eligibility</h2>
              <div>
                <label className="label">Scope Type</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {SCOPE_TYPES.map((s) => (
                    <button key={s} onClick={() => setField("scope_type", s)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                        form.scope_type === s ? "border-indigo-500 bg-indigo-600/10 text-indigo-400" : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              {form.scope_type !== "CUSTOM" && (
                <div>
                  <label className="label">Scope ID / Name</label>
                  <input value={form.scope_id} onChange={(e) => setField("scope_id", e.target.value)}
                    className="input-field" placeholder={`e.g. ${form.scope_type === "SCHOOL" ? "Tribhuvan School" : "Kathmandu"}`} />
                  <p className="text-xs text-slate-500 mt-1">Only users matching this scope will be eligible.</p>
                </div>
              )}
              <div>
                <label className="label">Allowed User Roles</label>
                <div className="flex flex-wrap gap-2">
                  {USER_ROLES.map((role) => (
                    <button key={role} onClick={() => toggleRole(role)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        form.allowed_user_roles.includes(role) ? "border-indigo-500 bg-indigo-600/10 text-indigo-400" : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}>{role}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary py-2.5 px-8">← Back</button>
                <button onClick={() => setStep(3)} className="btn-primary py-2.5 px-8">Next →</button>
              </div>
            </div>
          )}

          {/* Step 3: Positions */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Election Positions</h2>
                <button onClick={addPosition} className="btn-secondary text-sm py-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Position
                </button>
              </div>

              {form.positions.map((pos, idx) => (
                <div key={idx} className="card border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-white">Position {idx + 1}</h3>
                    {form.positions.length > 1 && (
                      <button onClick={() => removePosition(idx)} className="text-red-400 hover:text-red-300 p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Position Name <span className="text-red-400">*</span></label>
                        <input value={pos.position_name} onChange={(e) => updatePosition(idx, "position_name", e.target.value)}
                          className="input-field" placeholder="e.g. President" />
                      </div>
                      <div>
                        <label className="label">Number of Winners</label>
                        <input type="number" min={1} value={pos.number_of_winners}
                          onChange={(e) => updatePosition(idx, "number_of_winners", parseInt(e.target.value))}
                          className="input-field" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Voting Type</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {VOTING_TYPES.map((vt) => (
                          <button key={vt} onClick={() => updatePosition(idx, "voting_type", vt)}
                            className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                              pos.voting_type === vt ? "border-indigo-500 bg-indigo-600/10 text-indigo-400" : "border-slate-700 text-slate-400 hover:border-slate-500"
                            }`}>{vt}</button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-10 h-6 rounded-full transition-all ${pos.write_in_enabled ? "bg-indigo-600" : "bg-slate-700"}`}
                        onClick={() => updatePosition(idx, "write_in_enabled", !pos.write_in_enabled)}>
                        <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-all ${pos.write_in_enabled ? "ml-5" : "ml-1"}`} />
                      </div>
                      <span className="text-sm text-slate-300">Allow write-in candidates</span>
                    </label>
                  </div>
                </div>
              ))}

              <div className="card">
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-2.5">← Back</button>
                  <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 py-2.5">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : "Create Election ✓"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}