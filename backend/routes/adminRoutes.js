const express = require('express');
const router  = express.Router();
const db      = require('../services/ipfsDB');
const { adminOnly } = require('../middleware/auth');

// GET dashboard stats — all from IPFS
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const [candidates, voters] = await Promise.all([
      db.find('candidates'),
      db.find('voters'),
    ]);
    const totalVotes = candidates.reduce((s, c) => s + (c.voteCount || 0), 0);
    const parties    = [...new Set(candidates.map(c => c.party))];

    res.json({
      elections:  db.count('elections'),
      candidates: db.count('candidates'),
      voters:     voters.length,
      parties:    parties.length,
      totalVotes,
      // IPFS proof: all collection CIDs
      ipfsCIDs: {
        elections:  db.getCIDs('elections').length,
        candidates: db.getCIDs('candidates').length,
        voters:     db.getCIDs('voters').length,
        votes:      db.getCIDs('votes').length,
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET party stats for donut chart
router.get('/party-stats', adminOnly, async (req, res) => {
  try {
    const candidates = await db.find('candidates');
    const partyCounts = {};
    candidates.forEach(c => { partyCounts[c.party] = (partyCounts[c.party] || 0) + 1; });
    const colors = ['var(--eth)', 'var(--purple)', 'var(--green)', 'var(--amber)', 'var(--teal)', 'var(--red)'];
    const result = Object.entries(partyCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET IPFS audit trail — all CIDs for a collection
router.get('/ipfs-trail/:collection', adminOnly, (req, res) => {
  const { collection } = req.params;
  const cids = db.getCIDs(collection);
  res.json({
    collection,
    count: cids.length,
    cids,
    gateway: 'https://ipfs.io/ipfs/',
    // Each CID can be verified at https://ipfs.io/ipfs/<cid>
  });
});

module.exports = router;