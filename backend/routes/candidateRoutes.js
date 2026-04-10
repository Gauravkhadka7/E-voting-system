const express = require('express');
const router  = express.Router();
const db      = require('../services/ipfsDB');
const { adminOnly, protect } = require('../middleware/auth');
const upload  = require('../middleware/upload');
const { verifyAdminOTP } = require('../services/emailService');

// GET all candidates
router.get('/', protect, async (req, res) => {
  try {
    const candidates = await db.find('candidates');
    const enriched = await Promise.all(candidates.map(async c => {
      try {
        const el = await db.findById('elections', c.election);
        return { ...c, electionTitle: el?.title || '—' };
      } catch { return c; }
    }));
    res.json(enriched.sort((a, b) => new Date(b._created) - new Date(a._created)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET candidates public (for user dashboard)
router.get('/public', async (req, res) => {
  try {
    const candidates = await db.find('candidates');
    res.json(candidates.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET by election
router.get('/election/:electionId', async (req, res) => {
  try {
    const candidates = await db.find('candidates', c => c.election === req.params.electionId);
    res.json(candidates);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create candidate (admin + OTP confirmation)
router.post('/', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, party, age, qualification, bio, electionId, adminOTP } = req.body;
    if (!name || !party || !electionId)
      return res.status(400).json({ message: 'Name, party and election are required' });

    // Verify admin OTP
    if (!adminOTP) return res.status(400).json({ message: 'Admin confirmation OTP required', needsOTP: true });
    const otpResult = verifyAdminOTP(adminOTP);
    if (!otpResult.valid) return res.status(400).json({ message: otpResult.reason });

    let imageUrl = '', imageCid = '', ipfsImageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/candidates/${req.file.filename}`;
      try {
        imageCid     = await db.pinFile(req.file.path, req.file.originalname);
        ipfsImageUrl = db.ipfsUrl(imageCid);
        console.log(`📌 Photo → IPFS CID: ${imageCid}`);
      } catch (e) { console.warn('IPFS photo upload failed:', e.message); }
    }

    const candidate = await db.insert('candidates', {
      name, party, age: age || null, qualification: qualification || '',
      bio: bio || '', election: electionId,
      imageUrl, imageCid, ipfsImageUrl, voteCount: 0,
    });
    console.log(`📌 Candidate metadata → IPFS CID: ${candidate._cid}`);
    res.status(201).json(candidate);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update candidate (admin, no OTP needed for updates)
router.put('/:id', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.adminOTP;
    if (req.file) {
      updates.imageUrl = `/uploads/candidates/${req.file.filename}`;
      try {
        updates.imageCid     = await db.pinFile(req.file.path, req.file.originalname);
        updates.ipfsImageUrl = db.ipfsUrl(updates.imageCid);
      } catch {}
    }
    const updated = await db.update('candidates', req.params.id, updates);
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE candidate (admin + OTP)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { adminOTP } = req.body;
    if (!adminOTP) return res.status(400).json({ message: 'Admin OTP required', needsOTP: true });
    const result = verifyAdminOTP(adminOTP);
    if (!result.valid) return res.status(400).json({ message: result.reason });
    await db.remove('candidates', req.params.id);
    res.json({ message: 'Candidate removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;