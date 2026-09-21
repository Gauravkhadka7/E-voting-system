import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AddCandidate() {
  const { electionId } = useParams();
  const navigate = useNavigate();

  /* ── form state ────────────────────────────────────────────────────────── */
  const [form, setForm] = useState({ name: "", party: "", bio: "" });
  const [photo, setPhoto]   = useState(null);       // File object
  const [preview, setPreview] = useState(null);     // data URL
  const [drag, setDrag]     = useState(false);

  /* ── OTP confirm modal ─────────────────────────────────────────────────── */
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const otpRefs = Array.from({ length: 6 }, () => useRef(null));

  /* ── ui state ──────────────────────────────────────────────────────────── */
  const [loading, setLoad]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr]         = useState("");

  const fileInputRef = useRef(null);

  /* ── photo handling ────────────────────────────────────────────────────── */
  function handlePhoto(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    handlePhoto(e.dataTransfer.files[0]);
  }

  /* ── OTP input handling ─────────────────────────────────────────────────── */
  function handleOtpChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs[i + 1].current?.focus();
  }

  function handleOtpKey(i, e) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs[i - 1].current?.focus();
    }
  }

  /* ── step 1: validate form, request admin OTP ────────────────────────── */
  async function handleSubmitForm(e) {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) return setErr("Candidate name is required.");
    if (!photo) return setErr("Please upload a candidate photo.");

    try {
      setLoad(true);
      // Request an OTP to confirm the action
      await api.post("/auth/admin-otp");
      setOtpStep(true);
    } catch (ex) {
      setErr(ex.response?.data?.message || "Could not send OTP.");
    } finally {
      setLoad(false);
    }
  }

  /* ── step 2: confirm with OTP + submit ──────────────────────────────── */
  async function handleConfirm() {
    const code = otp.join("");
    if (code.length < 6) return setErr("Enter the 6-digit OTP.");
    setErr("");

    try {
      setLoad(true);
      const fd = new FormData();
      fd.append("name",  form.name.trim());
      fd.append("party", form.party.trim());
      fd.append("bio",   form.bio.trim());
      fd.append("otp",   code);
      if (photo) fd.append("photo", photo);

      await api.post(`/elections/${electionId}/candidates`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
    } catch (ex) {
      setErr(ex.response?.data?.message || "Submission failed.");
    } finally {
      setLoad(false);
    }
  }

  /* ── success screen ──────────────────────────────────────────────────── */
  if (success) {
    return (
      <div style={{ ...sc.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={sc.successCard}>
          <div style={sc.successIcon}>✓</div>
          <h2 style={sc.successTitle}>Candidate Added</h2>
          <p style={sc.successSub}>The candidate has been registered to the election.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => { setSuccess(false); setForm({ name: "", party: "", bio: "" }); setPhoto(null); setPreview(null); setOtp(["","","","","",""]); setOtpStep(false); }} style={sc.ghostBtn}>Add Another</button>
            <button onClick={() => navigate(-1)} style={sc.primaryBtn}>Back to Election</button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={sc.page}>
      <div style={sc.gridBg} />

      {/* ── header ──────────────────────────────────────────────────── */}
      <div style={sc.header}>
        <button onClick={() => navigate(-1)} style={sc.backBtn}>← Back</button>
        <div>
          <p style={sc.eyebrow}>Election Management</p>
          <h1 style={sc.title}>Add Candidate</h1>
        </div>
      </div>

      {/* ── main layout ─────────────────────────────────────────────── */}
      <div style={sc.layout}>

        {/* LEFT — photo upload ────────────────────────────────────── */}
        <div style={sc.photoPanel}>
          <p style={sc.panelLabel}>Candidate Photo</p>
          <div
            style={{ ...sc.dropZone, ...(drag ? sc.dropZoneActive : {}), ...(preview ? { padding: 0, border: "2px solid #00e5a055" } : {}) }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={sc.uploadIcon}>📷</div>
                <p style={sc.uploadText}>Drag & drop or click to upload</p>
                <p style={sc.uploadSub}>PNG, JPG, WEBP · max 5 MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhoto(e.target.files[0])} />
          </div>

          {preview && (
            <button onClick={() => { setPhoto(null); setPreview(null); }} style={sc.removePhotoBtn}>
              Remove photo
            </button>
          )}

          {/* preview card */}
          {form.name && (
            <div style={sc.previewCard}>
              <p style={sc.previewCardLabel}>Preview</p>
              <div style={sc.previewInner}>
                {preview
                  ? <img src={preview} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover" }} />
                  : <div style={{ ...sc.previewAvatar }}>{form.name.charAt(0).toUpperCase()}</div>
                }
                <div>
                  <p style={{ color: "#e2f0ea", fontWeight: 600, margin: "0 0 2px", fontSize: 15 }}>{form.name}</p>
                  {form.party && <p style={{ color: "#00e5a0", fontSize: 12, margin: 0 }}>{form.party}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — form ───────────────────────────────────────────── */}
        <div style={sc.formPanel}>
          {!otpStep ? (
            <form onSubmit={handleSubmitForm} style={{ display: "flex", flexDirection: "column", gap: 22 }}>

              <Field label="Full Name *" hint="Official name as it will appear on ballots">
                <input
                  style={sc.input}
                  placeholder="e.g. Ramesh Kumar Shrestha"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>

              <Field label="Party / Affiliation" hint="Leave blank for independent candidates">
                <input
                  style={sc.input}
                  placeholder="e.g. Democratic Alliance"
                  value={form.party}
                  onChange={(e) => setForm({ ...form, party: e.target.value })}
                />
              </Field>

              <Field label="Biography" hint="Short candidate description visible to voters">
                <textarea
                  style={{ ...sc.input, minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
                  placeholder="Briefly describe the candidate's background, experience, and platform…"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </Field>

              {err && <div style={sc.errBox}>{err}</div>}

              <button type="submit" disabled={loading} style={sc.primaryBtn}>
                {loading ? <Spinner /> : "Continue to Confirm →"}
              </button>
            </form>
          ) : (
            /* OTP confirm panel */
            <div style={sc.otpPanel}>
              <div style={sc.otpIcon}>🔐</div>
              <h2 style={sc.otpTitle}>Admin Confirmation</h2>
              <p style={sc.otpSub}>A 6-digit OTP was sent to your registered email. Enter it below to add <strong style={{ color: "#00e5a0" }}>{form.name}</strong>.</p>

              <div style={sc.otpBoxes}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    style={sc.otpBox}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    inputMode="numeric"
                  />
                ))}
              </div>

              {err && <div style={sc.errBox}>{err}</div>}

              <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
                <button onClick={handleConfirm} disabled={loading} style={sc.primaryBtn}>
                  {loading ? <Spinner /> : "✓ Confirm & Add Candidate"}
                </button>
                <button onClick={() => { setOtpStep(false); setErr(""); }} style={sc.ghostBtn}>← Back to form</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div>
      <label style={sc.label}>{label}</label>
      {hint && <p style={sc.hint}>{hint}</p>}
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #05100a88", borderTopColor: "#05100a", borderRadius: "50%", animation: "spin .7s linear infinite", verticalAlign: "middle" }} />
    </>
  );
}

/* ── styles ──────────────────────────────────────────────────────────────── */
const sc = {
  page: { minHeight: "100vh", background: "#080f14", fontFamily: "'DM Sans', sans-serif", position: "relative", paddingBottom: 60 },
  gridBg: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(#1e3a2f18 1px, transparent 1px),linear-gradient(90deg,#1e3a2f18 1px,transparent 1px)`, backgroundSize: "48px 48px" },
  header: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 20, padding: "28px 36px", borderBottom: "1px solid #1e3a2f" },
  backBtn: { background: "#1e3a2f55", border: "1px solid #1e3a2f", color: "#6b8f7a", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13 },
  eyebrow: { color: "#00e5a0", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" },
  title: { color: "#e2f0ea", fontSize: 26, fontWeight: 700, margin: 0 },
  layout: { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "340px 1fr", gap: 32, padding: "36px", alignItems: "start" },

  /* photo panel */
  photoPanel: { display: "flex", flexDirection: "column", gap: 16 },
  panelLabel: { color: "#6b8f7a", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", margin: 0 },
  dropZone: { width: "100%", aspectRatio: "1", border: "2px dashed #1e3a2f", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s", background: "#0d1f1788", overflow: "hidden", boxSizing: "border-box" },
  dropZoneActive: { borderColor: "#00e5a0", background: "#00e5a008" },
  uploadIcon: { fontSize: 36, marginBottom: 12 },
  uploadText: { color: "#c0d4c8", fontSize: 14, margin: "0 0 4px" },
  uploadSub: { color: "#6b8f7a", fontSize: 12, margin: 0 },
  removePhotoBtn: { background: "none", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  previewCard: { background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 14, padding: "16px 20px" },
  previewCardLabel: { color: "#6b8f7a", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 12px" },
  previewInner: { display: "flex", alignItems: "center", gap: 14 },
  previewAvatar: { width: 52, height: 52, borderRadius: 10, background: "#00e5a022", color: "#00e5a0", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  /* form panel */
  formPanel: { background: "#0d1f17", border: "1px solid #1e3a2f", borderRadius: 20, padding: "36px" },
  label: { display: "block", color: "#c0d4c8", fontWeight: 600, marginBottom: 4, fontSize: 14 },
  hint: { color: "#6b8f7a", fontSize: 12, margin: "0 0 8px" },
  input: { width: "100%", background: "#080f14", border: "1px solid #1e3a2f", borderRadius: 10, padding: "12px 16px", color: "#e2f0ea", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color .2s" },
  errBox: { background: "#2d0f0f", border: "1px solid #ef444455", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 },
  primaryBtn: { width: "100%", background: "#00e5a0", color: "#050f0a", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, cursor: "pointer", fontSize: 15, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  ghostBtn: { width: "100%", background: "transparent", color: "#6b8f7a", border: "1px solid #1e3a2f", borderRadius: 12, padding: "12px", fontWeight: 500, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },

  /* OTP */
  otpPanel: { display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" },
  otpIcon: { fontSize: 48, marginBottom: 4 },
  otpTitle: { color: "#e2f0ea", fontSize: 22, fontWeight: 700, margin: 0 },
  otpSub: { color: "#6b8f7a", fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 380 },
  otpBoxes: { display: "flex", gap: 10 },
  otpBox: { width: 52, height: 60, textAlign: "center", fontSize: 24, fontWeight: 700, background: "#080f14", border: "2px solid #1e3a2f", borderRadius: 12, color: "#00e5a0", fontFamily: "'DM Mono', monospace", outline: "none" },

  /* success */
  successCard: { background: "#0d1f17", border: "1px solid #00e5a033", borderRadius: 24, padding: "48px 44px", textAlign: "center", maxWidth: 420, width: "100%" },
  successIcon: { width: 64, height: 64, borderRadius: "50%", background: "#00e5a022", color: "#00e5a0", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "2px solid #00e5a055" },
  successTitle: { color: "#e2f0ea", fontSize: 24, fontWeight: 700, margin: "0 0 8px" },
  successSub: { color: "#6b8f7a", fontSize: 14, margin: "0 0 28px" },
};