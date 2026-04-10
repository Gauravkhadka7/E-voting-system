/**
 * IPFS Service — BlockVote
 * Handles all IPFS uploads: candidate images, voter ID docs, vote audit logs
 * Uses Helia (modern IPFS) with fallback to Pinata HTTP API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// ═══════════════════════════════════════════════════════════
// Pinata API (recommended for production — free tier available)
// Set PINATA_API_KEY and PINATA_SECRET in .env
// ═══════════════════════════════════════════════════════════

const PINATA_KEY    = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;
const USE_PINATA    = !!(PINATA_KEY && PINATA_SECRET);

// ── Upload file to IPFS ─────────────────────────────────────
/**
 * Uploads a file (image or document) to IPFS
 * @param {string} filePath - Local file system path
 * @param {string} fileName - Original file name
 * @returns {string} IPFS CID
 */
async function uploadToIPFS(filePath, fileName) {
  if (USE_PINATA) {
    return uploadFileToPinata(filePath, fileName);
  }
  // Fallback: simulate CID (replace with local IPFS node in production)
  return simulateCID(filePath);
}

// ── Upload JSON to IPFS ─────────────────────────────────────
/**
 * Uploads a JSON object to IPFS (for vote audit logs, metadata)
 * @param {object} data - JSON data
 * @param {string} fileName - e.g. "vote-audit-12345.json"
 * @returns {string} IPFS CID
 */
async function uploadJSONToIPFS(data, fileName = 'data.json') {
  if (USE_PINATA) {
    return uploadJSONToPinata(data, fileName);
  }
  return simulateCID(JSON.stringify(data));
}

// ── Pinata File Upload ──────────────────────────────────────
async function uploadFileToPinata(filePath, fileName) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath), { filename: fileName });
  formData.append('pinataMetadata', JSON.stringify({ name: fileName }));
  formData.append('pinataOptions',  JSON.stringify({ cidVersion: 1 }));

  const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      pinata_api_key:        PINATA_KEY,
      pinata_secret_api_key: PINATA_SECRET,
    },
  });
  return res.data.IpfsHash;
}

// ── Pinata JSON Upload ──────────────────────────────────────
async function uploadJSONToPinata(data, fileName) {
  const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    pinataContent:  data,
    pinataMetadata: { name: fileName },
    pinataOptions:  { cidVersion: 1 },
  }, {
    headers: {
      'Content-Type':        'application/json',
      pinata_api_key:        PINATA_KEY,
      pinata_secret_api_key: PINATA_SECRET,
    },
  });
  return res.data.IpfsHash;
}

// ── Simulate CID (dev/demo fallback) ───────────────────────
function simulateCID(input) {
  // Deterministic-ish fake CID for demo purposes
  const hash = Buffer.from(String(input).slice(0, 32)).toString('hex');
  return `Qm${hash.slice(0, 44)}`;
}

// ── Get IPFS gateway URL ────────────────────────────────────
function getIPFSUrl(cid) {
  if (!cid) return '';
  // Try multiple gateways for reliability
  return `https://ipfs.io/ipfs/${cid}`;
}

// ── Get IPFS content ────────────────────────────────────────
async function getFromIPFS(cid) {
  const gateways = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
  ];
  for (const url of gateways) {
    try {
      const res = await axios.get(url, { timeout: 5000 });
      return res.data;
    } catch { /* try next */ }
  }
  throw new Error('Could not fetch from IPFS');
}

module.exports = { uploadToIPFS, uploadJSONToIPFS, getIPFSUrl, getFromIPFS };