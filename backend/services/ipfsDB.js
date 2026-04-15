/**
 * ipfsDB.js — BlockVote IPFS Database Engine
 * 
 * FIXED BUGS:
 *  1. pinJSON was saving files as `${name}-${id}.json` where name already
 *     contained the id, creating doubled filenames that findById couldn't find.
 *     Now files are saved as `${collection}-${id}.json` consistently.
 *  2. find() was falling back to incomplete preview data on any error,
 *     which caused bcrypt.compare to fail (preview omits the password field).
 *  3. update() now correctly overwrites the same file so findById reads fresh data.
 */

const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

const PINATA_KEY    = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;
const USE_PINATA    = !!(PINATA_KEY && PINATA_SECRET);

const DB_DIR   = path.join(__dirname, '../db');
const IDX_FILE = path.join(DB_DIR, 'index.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let INDEX = {};

function loadIndex() {
  try {
    if (fs.existsSync(IDX_FILE)) {
      INDEX = JSON.parse(fs.readFileSync(IDX_FILE, 'utf8'));
      // Ensure all collections exist
      ['users','elections','candidates','voters','votes'].forEach(c => {
        if (!INDEX[c]) INDEX[c] = [];
      });
    } else {
      INDEX = { users:[], elections:[], candidates:[], voters:[], votes:[] };
      saveIndex();
    }
  } catch {
    INDEX = { users:[], elections:[], candidates:[], voters:[], votes:[] };
    saveIndex();
  }
}

function saveIndex() {
  try {
    fs.writeFileSync(IDX_FILE, JSON.stringify(INDEX, null, 2));
  } catch (e) {
    console.error('saveIndex failed:', e.message);
  }
}

loadIndex();

// ── Local file path — CONSISTENT naming: collection-id.json ──
function localPath(collection, id) {
  return path.join(DB_DIR, `${collection}-${id}.json`);
}

// ── Save record to local file ────────────────────────────────
function saveLocal(collection, record) {
  try {
    fs.writeFileSync(localPath(collection, record._id), JSON.stringify(record, null, 2));
  } catch (e) {
    console.error('saveLocal failed:', e.message);
  }
}

// ── Read record from local file ──────────────────────────────
function readLocal(collection, id) {
  const p = localPath(collection, id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

// ── Generate fake CID for dev mode ──────────────────────────
function fakeCID(id) {
  return `QmDev${id.replace(/-/g,'').slice(0,40)}`;
}

// ── Pinata JSON upload ───────────────────────────────────────
async function pinJSON(data) {
  // Always save locally first (works without Pinata)
  saveLocal(data._type || 'unknown', data);

  if (!USE_PINATA) {
    return fakeCID(data._id || uuidv4());
  }
  try {
    const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      pinataContent:  data,
      pinataMetadata: { name: `${data._type}-${data._id}`, keyvalues: { id: data._id } },
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
  } catch (e) {
    console.warn('Pinata upload failed, using local:', e.message);
    return fakeCID(data._id || uuidv4());
  }
}

// ── Pinata file upload ───────────────────────────────────────
async function pinFile(filePath, fileName) {
  if (!USE_PINATA) return fakeCID(fileName + Date.now());
  try {
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
  } catch (e) {
    console.warn('Pinata file upload failed:', e.message);
    return fakeCID(fileName + Date.now());
  }
}

// ════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════

async function insert(collection, data) {
  if (!INDEX[collection]) INDEX[collection] = [];

  const record = {
    ...data,
    _id:      data._id      || uuidv4(),
    _type:    collection,
    _created: data._created || new Date().toISOString(),
    _updated: new Date().toISOString(),
  };

  const cid = await pinJSON(record); // saves locally + optionally to IPFS
  record._cid = cid;

  // Update index with preview (preview must NOT include sensitive fields)
  INDEX[collection].push({
    id:      record._id,
    cid,
    preview: buildPreview(collection, record),
    created: record._created,
  });
  saveIndex();

  console.log(`[DB] INSERT ${collection}/${record._id}`);
  return record;
}

async function find(collection, filterFn = null) {
  if (!INDEX[collection]) return [];

  const results = [];
  for (const entry of INDEX[collection]) {
    // ALWAYS try local file first — it has the full record including password
    let record = readLocal(collection, entry.id);

    if (!record) {
      // Fallback: try IPFS
      try {
        const gateways = [
          `https://gateway.pinata.cloud/ipfs/${entry.cid}`,
          `https://ipfs.io/ipfs/${entry.cid}`,
        ];
        for (const url of gateways) {
          try {
            const res = await axios.get(url, { timeout: 5000 });
            record = res.data;
            // Cache locally for next time
            if (record) saveLocal(collection, record);
            break;
          } catch { /* try next */ }
        }
      } catch { /* all gateways failed */ }
    }

    // NEVER fall back to preview for users — preview omits password
    if (!record) {
      console.warn(`[DB] Could not load ${collection}/${entry.id}`);
      continue;
    }

    if (!filterFn || filterFn(record)) {
      results.push(record);
    }
  }
  return results;
}

async function findOne(collection, filterFn) {
  const all = await find(collection, filterFn);
  return all[0] || null;
}

async function findById(collection, id) {
  if (!INDEX[collection]) return null;
  const entry = INDEX[collection].find(e => e.id === id);
  if (!entry) return null;

  // Try local file first
  const local = readLocal(collection, id);
  if (local) return local;

  // Try IPFS
  try {
    const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${entry.cid}`, { timeout: 8000 });
    if (res.data) {
      saveLocal(collection, res.data);
      return res.data;
    }
  } catch { /* try next */ }

  try {
    const res = await axios.get(`https://ipfs.io/ipfs/${entry.cid}`, { timeout: 8000 });
    if (res.data) {
      saveLocal(collection, res.data);
      return res.data;
    }
  } catch { /* all failed */ }

  return null;
}

async function update(collection, id, updates) {
  const existing = await findById(collection, id);
  if (!existing) throw new Error(`Record ${id} not found in ${collection}`);

  const updated = {
    ...existing,
    ...updates,
    _id:      id,
    _type:    collection,
    _created: existing._created,
    _updated: new Date().toISOString(),
  };

  // Save locally FIRST (this is what findById reads)
  saveLocal(collection, updated);

  // Then pin to IPFS
  const newCid = await pinJSON(updated);
  updated._cid = newCid;

  // Update index
  if (!INDEX[collection]) INDEX[collection] = [];
  const idx = INDEX[collection].findIndex(e => e.id === id);
  const newEntry = { id, cid: newCid, preview: buildPreview(collection, updated), created: existing._created };
  if (idx >= 0) {
    INDEX[collection][idx] = newEntry;
  } else {
    INDEX[collection].push(newEntry);
  }
  saveIndex();

  console.log(`[DB] UPDATE ${collection}/${id}`);
  return updated;
}

async function remove(collection, id) {
  if (!INDEX[collection]) return;
  INDEX[collection] = INDEX[collection].filter(e => e.id !== id);

  const p = localPath(collection, id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  saveIndex();
  console.log(`[DB] REMOVE ${collection}/${id}`);
}

function count(collection) {
  return (INDEX[collection] || []).length;
}

function getCIDs(collection) {
  return (INDEX[collection] || []).map(e => ({ id: e.id, cid: e.cid }));
}

async function pinIndex() {
  const snapshot = {
    _type:    'index_snapshot',
    _id:      uuidv4(),
    _created: new Date().toISOString(),
    collections: Object.keys(INDEX).reduce((acc, col) => {
      acc[col] = { count: INDEX[col].length, cids: INDEX[col].map(e => e.cid) };
      return acc;
    }, {}),
  };
  return pinJSON(snapshot);
}

function ipfsUrl(cid) {
  return cid ? `https://ipfs.io/ipfs/${cid}` : '';
}

// Preview — NEVER include password or sensitive fields
function buildPreview(collection, record) {
  switch (collection) {
    case 'users':      return { name: record.name, email: record.email, isRegistered: record.isRegistered, hasVoted: record.hasVoted, verified: record.verified };
    case 'elections':  return { title: record.title, status: record.status, startDate: record.startDate, endDate: record.endDate };
    case 'candidates': return { name: record.name, party: record.party, election: record.election, voteCount: record.voteCount };
    case 'voters':     return { userId: record.userId, walletAddress: record.walletAddress, status: record.status };
    case 'votes':      return { userId: record.userId, electionId: record.electionId, nullifierHash: record.nullifierHash };
    default:           return {};
  }
}

module.exports = {
  insert, find, findOne, findById, update, remove,
  count, getCIDs, pinIndex, pinFile, pinJSON, ipfsUrl,
};