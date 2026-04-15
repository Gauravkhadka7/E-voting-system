const express = require('express');
const router  = express.Router();
const db      = require('../services/ipfsDB');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const upload  = require('../middleware/upload');
const { sendRegistrationApproved } = require('../services/emailService');

// GET voter status — returns safe defaults if not logged in
router.get('/status', optionalAuth, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.json({ isRegistered: false, hasVoted: false });
    }
    const user = await db.findById('users', req.user.userId);
    if (!user) return res.json({ isRegistered: false, hasVoted: false });
    res.json({ isRegistered: user.isRegistered || false, hasVoted: user.hasVoted || false });
  } catch { res.json({ isRegistered: false, hasVoted: false }); }
});

// POST register voter
router.post('/register', protect, upload.single('idDocument'), async (req, res) => {
  try {
    const existing = await db.findOne('voters', v => v.userId === req.user.userId);
    if (existing) return res.status(409).json({ message: 'Already registered as a voter.' });

    const { dob, gender, address, city, state, pincode, idType, idNumber, walletAddress } = req.body;
    if (!dob || !address || !idNumber || !walletAddress)
      return res.status(400).json({ message: 'All required fields must be filled.' });

    let docUrl = '', docCid = '', docIpfsUrl = '';
    if (req.file) {
      docUrl = `/uploads/voter-docs/${req.file.filename}`;
      try {
        docCid     = await db.pinFile(req.file.path, req.file.originalname);
        docIpfsUrl = db.ipfsUrl(docCid);
      } catch (e) { console.warn('IPFS doc upload failed:', e.message); }
    }

    const registration = await db.insert('voters', {
      userId: req.user.userId, dob, gender,
      address, city, state, pincode, idType, idNumber, walletAddress,
      docUrl, docCid, docIpfsUrl, status: 'approved',
    });

    await db.update('users', req.user.userId, { isRegistered: true, walletAddress });

    const user = await db.findById('users', req.user.userId);
    try { await sendRegistrationApproved(user.email, user.name, { docCid, walletAddress }); }
    catch (e) { console.warn('Approval email failed:', e.message); }

    res.status(201).json({
      message: 'Voter registration successful!',
      registrationId: registration._id,
      cid: registration._cid,
    });
  } catch (err) {
    console.error('voter register error:', err);
    res.status(500).json({ message: err.message || 'Registration failed.' });
  }
});

// GET all registrations (admin)
router.get('/all', adminOnly, async (req, res) => {
  try {
    const voters = await db.find('voters');
    const enriched = await Promise.all(voters.map(async v => {
      try {
        const user = await db.findById('users', v.userId);
        return { ...v, userName: user?.name, userEmail: user?.email };
      } catch { return v; }
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;