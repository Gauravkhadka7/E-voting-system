import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function VoterRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    dob: '', gender: '', address: '', city: '', state: '', pincode: '',
    idType: 'national_id', idNumber: '', walletAddress: '',
  });
  const [idDoc, setIdDoc] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('userToken');
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIdDoc(file);
    const reader = new FileReader();
    reader.onloadend = () => setIdPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.dob || !form.address || !form.idNumber) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(k => formData.append(k, form[k]));
      if (idDoc) formData.append('idDocument', idDoc);

      await api.post('/api/voter/register', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('✅ Voter registration successful! You can now cast your vote.');
      setTimeout(() => navigate('/user/vote'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const idTypes = [
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'driving_license', label: "Driver's License" },
    { value: 'voter_card', label: 'Voter Card' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-head)', fontWeight: 800 }}>
          <div style={{ width: 32, height: 32, background: 'var(--grad)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⛓</div>
          BlockVote
        </div>
        <Link to="/user/dashboard" className="btn btn-outline btn-sm">← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.7rem', fontWeight: 800, marginBottom: 6 }}>Voter Registration</h1>
          <p style={{ color: 'var(--muted)' }}>Complete your registration to participate in elections. Your ID document will be stored securely on IPFS.</p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
          {['Personal Info', 'Address', 'ID Verification', 'MetaMask Wallet'].map((step, i) => (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: '#fff' }}>{i + 1}</div>
                <span style={{ fontSize: '.7rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{step}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 2, background: 'var(--border)', margin: '0 6px', marginBottom: 20 }} />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Personal */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--grad)', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', color: '#fff', fontWeight: 700 }}>1</span>
              Personal Information
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="vr-name">Full Name</label>
                <input id="vr-name" name="name" className="form-control" value={userInfo.name || ''} disabled />
                <div className="form-hint">From your registered account</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="vr-email">Email</label>
                <input id="vr-email" name="email" className="form-control" value={userInfo.email || ''} disabled />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="vr-dob">Date of Birth <span>*</span></label>
                <input className="form-control" id="vr-dob" name="dob" type="date" autoComplete="bday" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]} required />
                <div className="form-hint">Must be 18+ to vote</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="vr-gender">Gender <span>*</span></label>
                <select id="vr-gender" name="gender" className="form-control" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} required>
                  <option value="">— Select —</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--grad)', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', color: '#fff', fontWeight: 700 }}>2</span>
              Residential Address
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vr-address">Street Address <span>*</span></label>
              <input className="form-control" id="vr-address" name="address" type="text" autoComplete="street-address" placeholder="House/Flat No, Street Name" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="vr-city">City <span>*</span></label>
                <input className="form-control" id="vr-city" name="city" type="text" autoComplete="address-level2" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="vr-state">State / Province</label>
                <input className="form-control" id="vr-state" name="state" type="text" autoComplete="address-level1" placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label" htmlFor="vr-pincode">Postal Code</label>
              <input className="form-control" id="vr-pincode" name="pincode" type="text" autoComplete="postal-code" placeholder="PIN / ZIP" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} />
            </div>
          </div>

          {/* Section 3: ID Verification */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--grad)', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', color: '#fff', fontWeight: 700 }}>3</span>
              ID Verification
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="vr-idType">ID Type <span>*</span></label>
                <select id="vr-idType" name="idType" className="form-control" value={form.idType} onChange={e => setForm({ ...form, idType: e.target.value })} required>
                  {idTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="vr-idNumber">ID Number <span>*</span></label>
                <input className="form-control" id="vr-idNumber" name="idNumber" type="text" autoComplete="off" placeholder="Enter ID number" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} required />
              </div>
            </div>
            {/* ID document upload */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Upload ID Document</label>
              <div
                style={{ border: '2px dashed var(--border2)', borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .2s' }}
                onClick={() => document.getElementById('idDocInput').click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(20,184,166,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
              >
                {idPreview ? (
                  <img src={idPreview} alt="ID Doc" style={{ maxWidth: 200, maxHeight: 130, borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                    <div style={{ fontSize: '.85rem', color: 'var(--muted)' }}>Click to upload ID document</div>
                  </>
                )}
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  Stored on IPFS · JPG, PNG, PDF
                </div>
              </div>
              <input id="idDocInput" type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
            </div>
          </div>

          {/* Section 4: MetaMask Wallet */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--grad)', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', color: '#fff', fontWeight: 700 }}>4</span>
              MetaMask Wallet
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" htmlFor="vr-wallet">Ethereum Wallet Address <span>*</span></label>
              <input className="form-control" id="vr-wallet" name="walletAddress" type="text" autoComplete="off" placeholder="0x..." value={form.walletAddress} onChange={e => setForm({ ...form, walletAddress: e.target.value })} style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem' }} />
              <div className="form-hint">Your MetaMask address — used to sign your vote on-chain</div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={async () => {
                if (window.ethereum) {
                  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                  setForm({ ...form, walletAddress: accounts[0] });
                } else {
                  alert('MetaMask not found. Please install it from metamask.io');
                }
              }}
            >
              🦊 Connect MetaMask
            </button>
          </div>

          <button type="submit" className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`} disabled={loading}>
            {loading ? 'Registering on blockchain…' : '✅ Complete Voter Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}