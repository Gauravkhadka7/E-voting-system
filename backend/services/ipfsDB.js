/**
 * ═══════════════════════════════════════════════════════════
 * ipfsDB.js  —  IPFS as the Primary Database
 * ═══════════════════════════════════════════════════════════
 *
 * Architecture:
 *   - Every record (user, election, candidate, voter, vote) is
 *     stored as a JSON object pinned on IPFS via Pinata.
 *   - A local index file (db/index.json) maps collection names
 *     to arrays of { id, cid } entries — like a CID registry.
 *   - The index itself is also periodically pinned to IPFS.
 *   - No MongoDB. No SQL. Pure IPFS content-addressed storage.
 *
 * Collections: users | elections | candidates | voters | votes
 *
 * IPFS CID structure per record:
 *   {
 *     _id:       "uuid",
 *     _type:     "user" | "election" | ...,
 *     _created:  ISO timestamp,
 *     _updated:  ISO timestamp,
 *     ...data fields
 *   }
 */

const fs      = require('fs');
const path    = require('path');
const axios   = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

// ── Config ───────────────────────────────────────────────────
const PINATA_KEY    = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;
const USE_PINATA    = !!(PINATA_KEY && PINATA_SECRET);

const DB_DIR   = path.join(__dirname, '../db');
const IDX_FILE = path.join(DB_DIR, 'index.json');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// ── In-memory index: { users: [{id, cid, preview}], elections: [...], ... }
let INDEX = {};

// ── Boot: load index from disk ───────────────────────────────
function loadIndex() {
  try {
    if (fs.existsSync(IDX_FILE)) {
      INDEX = JSON.parse(fs.readFileSync(IDX_FILE, 'utf8'));
    } else {
      INDEX = { users: [], elections: [], candidates: [], voters: [], votes: [] };
      saveIndex();
    }
  } catch {
    INDEX = { users: [], elections: [], candidates: [], voters: [], votes: [] };
  }
}

function saveIndex() {
  fs.writeFileSync(IDX_FILE, JSON.stringify(INDEX, null, 2));
}

loadIndex();

// ═══════════════════════════════════════════════════════════
// PINATA helpers
// ═══════════════════════════════════════════════════════════

async function pinJSON(data, name) {
  if (!USE_PINATA) {
    // Dev mode: store to local file and return fake CID
    const id = data._id || uuidv4();
    const filePath = path.join(DB_DIR, `${name}-${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    // Generate deterministic-looking CID
    const hash = Buffer.from(JSON.stringify(data).slice(0, 40)).toString('hex');
    return `QmDev${hash.slice(0, 40)}`;
  }
  const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    pinataContent:  data,
    pinataMetadata: { name, keyvalues: { type: data._type || 'record', id: data._id || '' } },
    pinataOptions:  { cidVersion: 1 },
  }, {
    headers: {
      'Content-Type':        'application/json',
      pinata_api_key:        PINATA_KEY,
      pinata_secret_api_key: PINATA_SECRET,
    },
    timeout: 15000,
  });
  return res.data.IpfsHash;
}

async function pinFile(filePath, fileName) {
  if (!USE_PINATA) {
    const hash = Buffer.from(fileName + Date.now()).toString('hex');
    return `QmFile${hash.slice(0, 40)}`;
  }
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { filename: fileName });
  form.append('pinataMetadata', JSON.stringify({ name: fileName }));
  form.append('pinataOptions',  JSON.stringify({ cidVersion: 1 }));
  const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
    maxBodyLength: Infinity,
    headers: { ...form.getHeaders(), pinata_api_key: PINATA_KEY, pinata_secret_api_key: PINATA_SECRET },
    timeout: 30000,
  });
  return res.data.IpfsHash;
}

async function fetchCID(cid) {
  // Try local cache first (dev mode)
  const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DB_DIR, f), 'utf8'));
      if (data._cid === cid || f.includes(cid.slice(-8))) return data;
    } catch {}
  }
  // Try IPFS gateways
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];
  for (const url of gateways) {
    try {
      const res = await axios.get(url, { timeout: 8000 });
      return res.data;
    } catch {}
  }
  throw new Error(`Cannot fetch CID ${cid} from IPFS`);
}

// ═══════════════════════════════════════════════════════════
// IPFS DB API  —  insert / find / update / delete
// ═══════════════════════════════════════════════════════════

/**
 * INSERT a new record into a collection
 * Returns the saved record with _id and _cid
 */
async function insert(collection, data) {
  if (!INDEX[collection]) INDEX[collection] = [];

  const record = {
    ...data,
    _id:      data._id      || uuidv4(),
    _type:    collection,
    _created: data._created || new Date().toISOString(),
    _updated: new Date().toISOString(),
  };

  const cid = await pinJSON(record, `${collection}-${record._id}`);
  record._cid = cid;

  // Update index
  INDEX[collection].push({
    id:      record._id,
    cid,
    preview: buildPreview(collection, record),
    created: record._created,
  });
  saveIndex();

  return record;
}

/**
 * FIND all records in a collection matching a filter function
 * For small datasets (demo), fetches all from IPFS/cache.
 */
async function find(collection, filterFn = null) {
  if (!INDEX[collection]) return [];

  const entries = INDEX[collection];
  const results = [];

  for (const entry of entries) {
    try {
      let record;
      // Try local cache (dev mode)
      const localPath = path.join(DB_DIR, `${collection}-${entry.id}.json`);
      if (fs.existsSync(localPath)) {
        record = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      } else {
        record = await fetchCID(entry.cid);
      }
      if (!filterFn || filterFn(record)) {
        results.push(record);
      }
    } catch (e) {
      // If IPFS fetch fails, use preview data from index
      if (!filterFn || filterFn(entry.preview || {})) {
        results.push({ ...entry.preview, _id: entry.id, _cid: entry.cid });
      }
    }
  }
  return results;
}

/**
 * FIND ONE record by filter
 */
async function findOne(collection, filterFn) {
  const results = await find(collection, filterFn);
  return results[0] || null;
}

/**
 * FIND BY ID — fast lookup using index
 */
async function findById(collection, id) {
  if (!INDEX[collection]) return null;
  const entry = INDEX[collection].find(e => e.id === id);
  if (!entry) return null;

  const localPath = path.join(DB_DIR, `${collection}-${id}.json`);
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  }
  return fetchCID(entry.cid);
}

/**
 * UPDATE a record — creates a new CID (IPFS is immutable), updates index
 */
async function update(collection, id, updates) {
  const existing = await findById(collection, id);
  if (!existing) throw new Error(`Record ${id} not found in ${collection}`);

  const updated = { ...existing, ...updates, _id: id, _updated: new Date().toISOString() };
  const newCid = await pinJSON(updated, `${collection}-${id}-v${Date.now()}`);
  updated._cid = newCid;

  // Update index entry (point to new CID)
  if (!INDEX[collection]) INDEX[collection] = [];
  const idx = INDEX[collection].findIndex(e => e.id === id);
  if (idx >= 0) {
    INDEX[collection][idx] = { id, cid: newCid, preview: buildPreview(collection, updated), created: existing._created };
  }

  // Update local cache
  const localPath = path.join(DB_DIR, `${collection}-${id}.json`);
  fs.writeFileSync(localPath, JSON.stringify(updated, null, 2));
  saveIndex();

  return updated;
}

/**
 * DELETE a record — removes from index (IPFS content remains, just untracked)
 */
async function remove(collection, id) {
  if (!INDEX[collection]) return;
  INDEX[collection] = INDEX[collection].filter(e => e.id !== id);

  const localPath = path.join(DB_DIR, `${collection}-${id}.json`);
  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  saveIndex();
}

/**
 * COUNT records in a collection
 */
function count(collection) {
  return (INDEX[collection] || []).length;
}

/**
 * GET all CIDs for a collection (useful for IPFS audit trail)
 */
function getCIDs(collection) {
  return (INDEX[collection] || []).map(e => ({ id: e.id, cid: e.cid }));
}

/**
 * PIN the entire index to IPFS (creates a verifiable snapshot)
 */
async function pinIndex() {
  const snapshot = {
    _type:    'index_snapshot',
    _created: new Date().toISOString(),
    collections: Object.keys(INDEX).reduce((acc, col) => {
      acc[col] = { count: INDEX[col].length, cids: INDEX[col].map(e => e.cid) };
      return acc;
    }, {}),
  };
  return pinJSON(snapshot, `blockvote-index-${Date.now()}`);
}

// ── Helper: build preview object for index ──────────────────
function buildPreview(collection, record) {
  switch (collection) {
    case 'users':      return { name: record.name, email: record.email, isRegistered: record.isRegistered, hasVoted: record.hasVoted };
    case 'elections':  return { title: record.title, status: record.status, startDate: record.startDate, endDate: record.endDate };
    case 'candidates': return { name: record.name, party: record.party, election: record.election };
    case 'voters':     return { userId: record.userId, walletAddress: record.walletAddress, status: record.status };
    case 'votes':      return { userId: record.userId, candidateId: record.candidateId, electionId: record.electionId };
    default:           return {};
  }
}

// ── IPFS URL helper ──────────────────────────────────────────
function ipfsUrl(cid) {
  return cid ? `https://ipfs.io/ipfs/${cid}` : '';
}

module.exports = { insert, find, findOne, findById, update, remove, count, getCIDs, pinIndex, pinFile, pinJSON, ipfsUrl };