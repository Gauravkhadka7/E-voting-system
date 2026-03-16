const express = require('express');
const router  = express.Router();
const db      = require('../services/ipfsDB');
const { adminOnly, protect } = require('../middleware/auth');

// Helper: compute status from dates
function computeStatus(startDate, endDate) {
  const now = new Date();
  if (now < new Date(startDate)) return 'upcoming';
  if (now > new Date(endDate))   return 'completed';
  return 'active';
}

// GET all elections
router.get('/', protect, async (req, res) => {
  try {
    const elections = await db.find('elections');
    // Auto-update status
    const updated = elections.map(e => ({ ...e, status: computeStatus(e.startDate, e.endDate) }));
    res.json(updated.sort((a, b) => new Date(b._created) - new Date(a._created)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET active elections (public — for user dashboard)
router.get('/active', async (req, res) => {
  try {
    const all = await db.find('elections');
    const active = all.filter(e => computeStatus(e.startDate, e.endDate) === 'active');
    res.json(active);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single election
router.get('/:id', protect, async (req, res) => {
  try {
    const el = await db.findById('elections', req.params.id);
    if (!el) return res.status(404).json({ message: 'Election not found' });
    res.json({ ...el, status: computeStatus(el.startDate, el.endDate) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create election (admin) — stored on IPFS
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, description, startDate, endDate } = req.body;
    if (!title || !startDate || !endDate)
      return res.status(400).json({ message: 'Title, start date and end date are required' });

    const election = await db.insert('elections', {
      title, description: description || '',
      startDate, endDate,
      status:     computeStatus(startDate, endDate),
      totalVotes: 0,
    });
    console.log(`📌 Election stored on IPFS — CID: ${election._cid}`);
    res.status(201).json(election);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update election (admin) — creates new IPFS CID
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const el = await db.findById('elections', req.params.id);
    if (!el) return res.status(404).json({ message: 'Election not found' });
    const updated = await db.update('elections', req.params.id, {
      ...req.body,
      status: computeStatus(req.body.startDate || el.startDate, req.body.endDate || el.endDate),
    });
    console.log(`📌 Election updated on IPFS — new CID: ${updated._cid}`);
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE election (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await db.remove('elections', req.params.id);
    res.json({ message: 'Election removed from index' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;