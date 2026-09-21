const fs = require("fs");
const path = require("path");

// Local IPFS DB fallback (for development without IPFS daemon)
const DB_PATH = path.join(__dirname, "../db/index.json");
const IPFS_DIR = path.join(__dirname, "../db");

// Ensure DB directory exists
if (!fs.existsSync(IPFS_DIR)) fs.mkdirSync(IPFS_DIR, { recursive: true });

// Load or initialize index
function loadIndex() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch {}
  return {};
}

function saveIndex(index) {
  fs.writeFileSync(DB_PATH, JSON.stringify(index, null, 2));
}

/**
 * Upload data to IPFS (tries real IPFS first, falls back to local)
 */
async function uploadToIPFS(data) {
  let content;
  if (typeof data === "string") {
    content = data;
  } else {
    content = JSON.stringify(data);
  }

  try {
    // Try real IPFS via kubo-rpc-client
    const { create } = await import("kubo-rpc-client");
    const client = create({
      host: process.env.IPFS_HOST || "localhost",
      port: parseInt(process.env.IPFS_PORT || "5001"),
      protocol: process.env.IPFS_PROTOCOL || "http",
    });

    const result = await client.add(content, { pin: true });
    const cid = result.cid.toString();
    console.log("✅ Uploaded to IPFS:", cid);
    return cid;
  } catch (err) {
    console.warn("⚠️  IPFS unavailable, using local fallback:", err.message);
    return localStore(content);
  }
}

/**
 * Local storage fallback — simulates IPFS CID
 */
function localStore(content) {
  const crypto = require("crypto");
  const cid = "Qm" + crypto.createHash("sha256").update(content).digest("hex").slice(0, 44);

  const index = loadIndex();
  index[cid] = { content, storedAt: new Date().toISOString() };
  saveIndex(index);

  const filePath = path.join(IPFS_DIR, `${cid}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ cid, content, storedAt: new Date().toISOString() }));

  return cid;
}

/**
 * Retrieve data from IPFS by CID
 */
async function getFromIPFS(cid) {
  try {
    const { create } = await import("kubo-rpc-client");
    const client = create({
      host: process.env.IPFS_HOST || "localhost",
      port: parseInt(process.env.IPFS_PORT || "5001"),
      protocol: process.env.IPFS_PROTOCOL || "http",
    });

    const chunks = [];
    for await (const chunk of client.cat(cid)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString();
  } catch {
    // Fallback to local
    const index = loadIndex();
    if (index[cid]) return index[cid].content;

    const filePath = path.join(IPFS_DIR, `${cid}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return data.content;
    }
    return null;
  }
}

module.exports = { uploadToIPFS, getFromIPFS };