const express = require('express');
const router  = express.Router();
const db      = require('../services/ipfsDB');
const { protect, adminOnly } = require('../middleware/auth');
const upload  = require('../middleware/upload');
const { sendRegistrationApproved } = require('../services/emailService');

router.get('/status', protect, async (req, res) => {
  try {
    const user = await db.findById('users', req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ isRegistered: user.isRegistered, hasVoted: user.hasVoted });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

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
        console.log(`📌 ID doc → IPFS CID: ${docCid}`);
      } catch (e) { console.warn('IPFS doc upload failed:', e.message); }
    }

    const registration = await db.insert('voters', {
      userId: req.user.userId, dob, gender,
      address, city, state, pincode, idType, idNumber, walletAddress,
      docUrl, docCid, docIpfsUrl, status: 'approved',
    });
    console.log(`📌 Voter registration → IPFS CID: ${registration._cid}`);

    await db.update('users', req.user.userId, { isRegistered: true, walletAddress });

    // Send approval email
    const user = await db.findById('users', req.user.userId);
    try {
      await sendRegistrationApproved(user.email, user.name, { docCid, walletAddress });
    } catch (e) { console.warn('Approval email failed:', e.message); }

    res.status(201).json({
      message:        'Voter registration successful!',
      registrationId: registration._id,
      cid:            registration._cid,
      ipfsUrl:        db.ipfsUrl(registration._cid),
      docCid, docIpfsUrl,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Registration failed.' });
  }
});

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