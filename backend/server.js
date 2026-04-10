const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const path       = require('path');
const multer     = require('multer');
const fs         = require('fs');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
// Allow React dev server :3000 and direct requests
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // permissive in dev — tighten in production
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors()); // Handle preflight for all routes
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

['uploads/candidates', 'uploads/voter-docs', 'db'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const db = require('./services/ipfsDB');
console.log('✅ IPFS DB initialized');
console.log(`   Users:${db.count('users')} | Elections:${db.count('elections')} | Candidates:${db.count('candidates')} | Votes:${db.count('votes')}`);
console.log(`   Pinata: ${process.env.PINATA_API_KEY ? '✅' : '⚠ dev mode'}`);
console.log(`   Email:  ${process.env.EMAIL_USER ? '✅ ' + process.env.EMAIL_USER : '⚠ not configured (OTP printed to console)'}`);

app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/elections',  require('./routes/electionRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes'));
app.use('/api/voter',      require('./routes/voterRoutes'));
app.use('/api/vote',       require('./routes/voteRoutes'));
app.use('/api/admin',      require('./routes/adminRoutes'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', database: 'IPFS',
  pinata: !!process.env.PINATA_API_KEY,
  email:  !!process.env.EMAIL_USER,
  counts: { users: db.count('users'), elections: db.count('elections'), candidates: db.count('candidates'), votes: db.count('votes') },
}));

app.get('/api/ipfs/snapshot', async (req, res) => {
  try { const cid = await db.pinIndex(); res.json({ cid, url: db.ipfsUrl(cid) }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/ipfs/cids/:collection', (req, res) => {
  res.json({ collection: req.params.collection, cids: db.getCIDs(req.params.collection) });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError)
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 BlockVote API → http://localhost:${PORT} | DB: IPFS`));