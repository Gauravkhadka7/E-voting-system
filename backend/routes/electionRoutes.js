const express = require('express');
const router  = express.Router();
const db      = require('../services/ipfsDB');
const { adminOnly, optionalAuth } = require('../middleware/auth');

const computeStatus = (s,e) => {
  const now = new Date();
  if (!s||!e) return 'draft';
  if (now < new Date(s)) return 'upcoming';
  if (now > new Date(e)) return 'completed';
  return 'active';
};

// GET all elections (admin)
router.get('/', async (req, res) => {
  try {
    const elections = await db.find('elections');
    const result = elections.map(e => ({...e, status: computeStatus(e.startDate,e.endDate)}));
    res.json(result.sort((a,b) => new Date(b._created)-new Date(a._created)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET active elections (public)
router.get('/active', async (req, res) => {
  try {
    const all = await db.find('elections');
    const active = all
      .filter(e => computeStatus(e.startDate,e.endDate)==='active')
      .map(e=>({...e, status:'active'}));
    res.json(active);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET all elections with status (public — for transparency)
router.get('/all-public', async (req, res) => {
  try {
    const all = await db.find('elections');
    res.json(all.map(e => ({
      _id:       e._id,
      title:     e.title,
      description: e.description,
      startDate: e.startDate,
      endDate:   e.endDate,
      status:    computeStatus(e.startDate,e.endDate),
      totalVotes:e.totalVotes||0,
      cid:       e._cid,
    })).sort((a,b)=>new Date(b.startDate)-new Date(a.startDate)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single election
router.get('/:id', async (req, res) => {
  try {
    const el = await db.findById('elections', req.params.id);
    if (!el) return res.status(404).json({ message: 'Election not found' });
    res.json({...el, status: computeStatus(el.startDate,el.endDate)});
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create election
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, description, startDate, endDate, type } = req.body;
    if (!title||!startDate||!endDate)
      return res.status(400).json({ message: 'Title, start and end date are required' });
    if (new Date(endDate) <= new Date(startDate))
      return res.status(400).json({ message: 'End date must be after start date' });

    const election = await db.insert('elections', {
      title,
      description: description||'',
      startDate,
      endDate,
      type:       type||'single-choice',
      status:     computeStatus(startDate,endDate),
      totalVotes: 0,
      createdBy:  req.user?.username||'admin',
    });
    console.log(`📌 Election stored on IPFS — CID: ${election._cid}`);
    res.status(201).json({...election, status: computeStatus(election.startDate,election.endDate)});
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update election
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const el = await db.findById('elections', req.params.id);
    if (!el) return res.status(404).json({ message: 'Election not found' });
    const updated = await db.update('elections', req.params.id, {
      ...req.body,
      status: computeStatus(req.body.startDate||el.startDate, req.body.endDate||el.endDate),
    });
    res.json({...updated, status: computeStatus(updated.startDate,updated.endDate)});
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE election
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await db.remove('elections', req.params.id);
    res.json({ message: 'Election removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;