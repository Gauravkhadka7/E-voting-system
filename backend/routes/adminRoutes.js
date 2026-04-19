const express = require('express');
const router  = express.Router();
const db      = require('../services/ipfsDB');
const { adminOnly } = require('../middleware/auth');

const getStatus = (s,e) => {
  const now = new Date();
  if (!s||!e) return 'unknown';
  if (now < new Date(s)) return 'upcoming';
  if (now > new Date(e)) return 'completed';
  return 'active';
};

// GET dashboard stats
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const [candidates, voters, elections] = await Promise.all([
      db.find('candidates'), db.find('voters'), db.find('elections')
    ]);
    const totalVotes = candidates.reduce((s,c) => s+(c.voteCount||0), 0);
    const parties    = [...new Set(candidates.map(c => c.party))];
    const active     = elections.filter(e => getStatus(e.startDate,e.endDate)==='active');
    const completed  = elections.filter(e => getStatus(e.startDate,e.endDate)==='completed');
    res.json({
      elections:  db.count('elections'),
      candidates: db.count('candidates'),
      voters:     voters.length,
      parties:    parties.length,
      totalVotes,
      activeElections:    active.length,
      completedElections: completed.length,
      voterTurnout: voters.length ? Math.round((totalVotes/voters.length)*100) : 0,
      ipfsCIDs: {
        elections: db.getCIDs('elections').length,
        votes:     db.getCIDs('votes').length,
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET party stats for chart
router.get('/party-stats', adminOnly, async (req, res) => {
  try {
    const candidates = await db.find('candidates');
    const partyCounts = {};
    candidates.forEach(c => { partyCounts[c.party] = (partyCounts[c.party]||0)+1; });
    const colors = ['#627EEA','#8B5CF6','#10B981','#F59E0B','#14B8A6','#EF4444'];
    const result = Object.entries(partyCounts)
      .sort((a,b)=>b[1]-a[1])
      .map(([label,value],i)=>({ label, value, color: colors[i%colors.length] }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET public audit trail
router.get('/audit', async (req, res) => {
  try {
    const votes = await db.find('votes');
    const elections = await db.find('elections');
    res.json({
      totalVotes: votes.length,
      elections:  elections.map(e => ({
        _id:   e._id,
        title: e.title,
        status: getStatus(e.startDate, e.endDate),
        totalVotes: e.totalVotes || 0,
        cid:   e._cid,
      })),
      // Only public proof data — no candidate IDs
      voteProofs: votes.map(v => ({
        nullifierHash: v.nullifierHash,
        commitment:    v.commitment,
        electionId:    v.electionId,
        timestamp:     v._created,
        txHash:        v.txHash,
        cid:           v._cid,
      })),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET election analytics
router.get('/analytics/:electionId', adminOnly, async (req, res) => {
  try {
    const { electionId } = req.params;
    const [election, candidates, votes] = await Promise.all([
      db.findById('elections', electionId),
      db.find('candidates', c => c.election === electionId),
      db.find('votes', v => v.electionId === electionId),
    ]);
    if (!election) return res.status(404).json({ message: 'Election not found' });
    const total = votes.length;
    const voters = await db.find('voters');
    const turnoutPct = voters.length ? Math.round((total/voters.length)*100) : 0;
    res.json({
      election: { ...election, status: getStatus(election.startDate, election.endDate) },
      totalVotes:   total,
      voterCount:   voters.length,
      turnout:      turnoutPct,
      candidates:   candidates.map(c => ({
        name:      c.name,
        party:     c.party,
        voteCount: c.voteCount || 0,
        percentage: total ? Math.round(((c.voteCount||0)/total)*100) : 0,
      })).sort((a,b)=>b.voteCount-a.voteCount),
      timeline: votes.reduce((acc, v) => {
        const day = (v._created||'').slice(0,10);
        if (day) acc[day] = (acc[day]||0)+1;
        return acc;
      }, {}),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET IPFS audit trail
router.get('/ipfs-trail/:collection', adminOnly, (req, res) => {
  const cids = db.getCIDs(req.params.collection);
  res.json({ collection: req.params.collection, count: cids.length, cids });
});

// POST bulk candidate upload (CSV data)
router.post('/bulk-candidates', adminOnly, async (req, res) => {
  try {
    const { candidates, electionId } = req.body;
    if (!Array.isArray(candidates) || !electionId)
      return res.status(400).json({ message: 'candidates array and electionId required' });
    const results = [];
    for (const c of candidates) {
      if (!c.name || !c.party) continue;
      const created = await db.insert('candidates', {
        name: c.name, party: c.party, age: c.age||null,
        qualification: c.qualification||'', bio: c.bio||'',
        election: electionId, imageUrl:'', imageCid:'', voteCount:0,
      });
      results.push({ name: c.name, id: created._id, cid: created._cid });
    }
    res.json({ message: `${results.length} candidates added`, results });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET list all sub-admins (super admin only)
router.get('/list-admins', adminOnly, async (req, res) => {
  try {
    const admins = await db.find('admins');
    res.json(admins.map(a => ({ _id: a._id, username: a.username, email: a.email, adminRole: a.adminRole, permissions: a.permissions })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;