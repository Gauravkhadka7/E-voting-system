import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../utils/api';

export default function AddCandidate() {
  const navigate = useNavigate();
  const fileRef  = useRef();
  const [elections, setElections] = useState([]);
  const [form, setForm] = useState({ name:'', party:'', bio:'', electionId:'', age:'', qualification:'' });
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragging, setDragging]       = useState(false);

  // Admin OTP flow
  const [otpModal, setOtpModal]  = useState(false);
  const [otpCode, setOtpCode]    = useState('');
  const [otpSent, setOtpSent]    = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devCode, setDevCode]    = useState('');

  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    api.get('/api/elections', { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => setElections(r.data))
      .catch(() => setElections([{ _id:'demo', title:'Presidential Election 2024' }]));
  }, [token]);

  // ── Image handling ──────────────────────────────────────────
  const processImage = file => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const onDrop = e => {
    e.preventDefault(); setDragging(false);
    processImage(e.dataTransfer.files[0]);
  };

  // ── Step 1: validate form → request admin OTP ───────────────
  const handleSubmitForm = e => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.party || !form.electionId)
      return setError('Please fill all required fields.');
    if (!imageFile)
      return setError('Please select a candidate photo.');
    // Request admin OTP
    openOTPModal();
  };

  const openOTPModal = async () => {
    setOtpModal(true);
    setOtpSent(false); setOtpCode(''); setDevCode('');
    setOtpLoading(true);
    try {
      const res = await api.post('/api/auth/admin/request-otp', {
        action: `Add Candidate: ${form.name}`,
        details: `Party: ${form.party} | Election: ${elections.find(e=>e._id===form.electionId)?.title || form.electionId}`,
      }, { headers:{ Authorization:`Bearer ${token}` } });
      setOtpSent(true);
      if (res.data.devCode) setDevCode(res.data.devCode);
    } catch { setError('Could not send confirmation email.'); setOtpModal(false); }
    finally { setOtpLoading(false); }
  };

  // ── Step 2: verify OTP → submit candidate ───────────────────
  const handleConfirmSubmit = async () => {
    if (!otpCode) return setError('Enter the confirmation code.');
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      Object.keys(form).forEach(k => formData.append(k, form[k]));
      formData.append('image', imageFile);
      formData.append('adminOTP', otpCode);

      const res = await api.post('/api/candidates', formData, {
        headers: { Authorization:`Bearer ${token}`, 'Content-Type':'multipart/form-data' },
      });
      setSuccess(`✅ Candidate "${form.name}" added! IPFS CID: ${res.data._cid}`);
      setOtpModal(false);
      setForm({ name:'', party:'', bio:'', electionId:'', age:'', qualification:'' });
      setImageFile(null); setImagePreview(null); setOtpCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add candidate.');
    } finally { setLoading(false); }
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Add Candidate</div>
            <div className="topbar-sub">Add a new candidate with photo. Admin email confirmation required.</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={()=>navigate('/admin/candidates')}>View All →</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24,alignItems:'start'}}>

          {/* ── Form ── */}
          <div className="card">
            {error  && <div className="alert alert-error">⚠ {error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmitForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="cand-election">Election <span>*</span></label>
                <select id="cand-election" name="electionId" className="form-control" value={form.electionId} onChange={e=>setForm({...form,electionId:e.target.value})} required>
                  <option value="">— Select Election —</option>
                  {elections.map(el=><option key={el._id} value={el._id}>{el.title}</option>)}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="cand-name">Full Name <span>*</span></label>
                  <input className="form-control" type="text" id="cand-name" name="name" autoComplete="off" placeholder="Candidate full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cand-party">Party Name <span>*</span></label>
                  <input className="form-control" type="text" id="cand-party" name="party" autoComplete="organization" placeholder="Political party" value={form.party} onChange={e=>setForm({...form,party:e.target.value})} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="cand-age">Age</label>
                  <input className="form-control" type="number" min="21" max="99" id="cand-age" name="age" autoComplete="off" placeholder="Age" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cand-qual">Qualification</label>
                  <input className="form-control" type="text" id="cand-qual" name="qualification" autoComplete="off" placeholder="e.g. MSc Computer Science" value={form.qualification} onChange={e=>setForm({...form,qualification:e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cand-bio">Bio / Manifesto</label>
                <textarea className="form-control" rows={3} id="cand-bio" name="bio" placeholder="Candidate bio and election manifesto..." value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} />
              </div>

              {/* ── Photo upload ── */}
              <div className="form-group">
                <label className="form-label" htmlFor="cand-photo">Candidate Photo <span>*</span></label>
                <div
                  onDragOver={e=>{e.preventDefault();setDragging(true)}}
                  onDragLeave={()=>setDragging(false)}
                  onDrop={onDrop}
                  onClick={()=>fileRef.current?.click()}
                  style={{
                    border:`2px dashed ${dragging ? 'var(--eth)' : imageFile ? 'var(--green)' : 'var(--border2)'}`,
                    borderRadius:14, padding:'28px 20px', textAlign:'center', cursor:'pointer',
                    background: dragging ? 'rgba(98,126,234,0.04)' : 'rgba(255,255,255,0.01)',
                    transition:'all .25s', position:'relative',
                  }}
                >
                  {imagePreview ? (
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                      <img src={imagePreview} alt="Preview" style={{width:90,height:90,borderRadius:'50%',objectFit:'cover',border:'3px solid var(--eth)',boxShadow:'0 0 20px rgba(98,126,234,0.3)'}} />
                      <div style={{fontSize:'.85rem',color:'var(--green)',fontWeight:600}}>✅ {imageFile?.name}</div>
                      <div style={{fontSize:'.75rem',color:'var(--muted)'}}>Click or drag to change</div>
                    </div>
                  ) : (
                    <>
                      <div style={{fontSize:44,marginBottom:10}}>📷</div>
                      <div style={{fontWeight:700,color:'var(--text)',marginBottom:4}}>Drop photo here or click to browse</div>
                      <div style={{fontSize:'.8rem',color:'var(--muted)'}}>JPG, PNG, WebP · Max 10MB</div>
                      <div style={{fontSize:'.72rem',color:'var(--muted)',marginTop:6,fontFamily:'var(--font-mono)'}}>Stored permanently on IPFS</div>
                    </>
                  )}
                </div>
                <input ref={fileRef} id="cand-photo" name="photo" type="file" accept="image/*" autoComplete="off" style={{display:'none'}} onChange={e=>processImage(e.target.files[0])} />
                {!imageFile && <div className="form-hint" style={{color:'var(--red)'}}>Photo is required for the candidate card</div>}
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg">
                ➕ Add Candidate (Requires Email Confirmation)
              </button>
            </form>
          </div>

          {/* ── Right panel ── */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Preview card */}
            <div className="card" style={{textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,marginBottom:16,textAlign:'left'}}>Preview</div>
              <div style={{width:76,height:76,borderRadius:'50%',background:'linear-gradient(135deg,rgba(98,126,234,0.25),rgba(139,92,246,0.25))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 12px',overflow:'hidden',border:'3px solid var(--border)'}}>
                {imagePreview ? <img src={imagePreview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : '👤'}
              </div>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:'1.05rem',marginBottom:4}}>{form.name||'Candidate Name'}</div>
              <span className="badge badge-blue">{form.party||'Party'}</span>
              {form.qualification && <div style={{marginTop:8}}><span className="badge badge-purple">{form.qualification}</span></div>}
              {form.age && <div style={{fontSize:'.82rem',color:'var(--muted)',marginTop:8}}>Age: {form.age}</div>}
              {form.bio && <p style={{fontSize:'.8rem',color:'var(--sub)',marginTop:10,lineHeight:1.6,textAlign:'left'}}>{form.bio.slice(0,120)}{form.bio.length>120?'…':''}</p>}
            </div>

            {/* OTP explanation */}
            <div className="card card-sm" style={{background:'rgba(245,158,11,0.05)',borderColor:'rgba(245,158,11,0.2)'}}>
              <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--amber)',marginBottom:8}}>🔐 Admin Confirmation</div>
              <div style={{fontSize:'.78rem',color:'var(--sub)',lineHeight:1.7}}>
                Adding a candidate requires admin email confirmation. A 6-digit code will be sent to <strong style={{color:'var(--text)'}}>{process.env.ADMIN_EMAIL || 'admin email'}</strong> before the candidate is stored on IPFS.
              </div>
            </div>

            <div className="card card-sm" style={{background:'rgba(20,184,166,0.05)',borderColor:'rgba(20,184,166,0.2)'}}>
              <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--teal)',marginBottom:8}}>🌐 IPFS Storage</div>
              <div style={{fontSize:'.78rem',color:'var(--sub)',lineHeight:1.7}}>
                Photo is uploaded to <strong style={{color:'var(--text)'}}>IPFS via Pinata</strong>. The CID is stored on the smart contract — permanently accessible via any IPFS gateway.
              </div>
            </div>
          </div>
        </div>

        {/* ── Admin OTP Modal ── */}
        {otpModal && (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setOtpModal(false);}}}>
            <div className="modal-box" style={{maxWidth:420}}>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:40,marginBottom:8}}>🔐</div>
                <div className="modal-title" style={{marginBottom:4}}>Admin Confirmation Required</div>
                <div style={{fontSize:'.85rem',color:'var(--muted)'}}>
                  {otpLoading ? 'Sending confirmation code to admin email…' :
                   otpSent ? `Code sent to admin email. Enter it below.` : 'Preparing…'}
                </div>
              </div>

              {devCode && (
                <div style={{background:'rgba(98,126,234,0.06)',border:'1px solid rgba(98,126,234,0.2)',borderRadius:9,padding:'10px 14px',marginBottom:14,fontFamily:'var(--font-mono)',fontSize:'.82rem',color:'var(--muted)',textAlign:'center'}}>
                  Dev mode code: <strong style={{color:'var(--eth)',fontSize:'1.1rem'}}>{devCode}</strong>
                </div>
              )}

              {error && <div className="alert alert-error">⚠ {error}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="admin-otp">6-Digit Confirmation Code</label>
                <input
                  className="form-control"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  id="admin-otp" name="adminOTP" placeholder="Enter code from email"
                  value={otpCode}
                  onChange={e=>setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  style={{textAlign:'center',fontSize:'1.5rem',fontFamily:'var(--font-mono)',letterSpacing:8}}
                  autoFocus
                />
              </div>

              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button
                  className={`btn btn-primary btn-full ${loading?'btn-loading':''}`}
                  onClick={handleConfirmSubmit}
                  disabled={loading || otpLoading || otpCode.length < 6}
                >
                  {loading ? 'Uploading to IPFS…' : '✅ Confirm & Add Candidate'}
                </button>
                <button className="btn btn-outline" onClick={()=>setOtpModal(false)}>Cancel</button>
              </div>

              <div style={{textAlign:'center',marginTop:12,fontSize:'.78rem',color:'var(--muted)'}}>
                <button onClick={openOTPModal} style={{background:'none',border:'none',color:'var(--eth)',cursor:'pointer',fontSize:'.78rem'}}>Resend code</button>
                {' '}·{' '}use <code style={{color:'var(--eth)'}}>DEV_SKIP</code> if email not configured
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}