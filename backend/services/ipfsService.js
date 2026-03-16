const { create } = require("ipfs-http-client");
const { Buffer } = require("buffer");

// ─── IPFS Client Configuration ─────────────────────────────────────────────────
let ipfs;

function getClient() {
  if (!ipfs) {
    const host = process.env.IPFS_HOST || "ipfs.infura.io";
    const port = parseInt(process.env.IPFS_PORT || "5001");
    const protocol = process.env.IPFS_PROTOCOL || "https";
    const projectId = process.env.IPFS_PROJECT_ID;
    const projectSecret = process.env.IPFS_PROJECT_SECRET;

    const options = { host, port, protocol };

    if (projectId && projectSecret) {
      const auth =
        "Basic " +
        Buffer.from(`${projectId}:${projectSecret}`).toString("base64");
      options.headers = { authorization: auth };
    }

    ipfs = create(options);
  }
  return ipfs;
}

// ─── Service Methods ───────────────────────────────────────────────────────────

/**
 * Upload a JSON object to IPFS.
 * @param {object} data - JavaScript object to upload
 * @returns {string} IPFS CID hash
 */
async function uploadJSON(data) {
  try {
    const client = getClient();
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString);
    const result = await client.add(buffer);
    const cid = result.cid.toString();
    console.log(`✅ IPFS upload success. CID: ${cid}`);
    return cid;
  } catch (error) {
    console.error("❌ IPFS uploadJSON error:", error.message);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Upload a raw Buffer / file to IPFS.
 * @param {Buffer} buffer - File content
 * @param {string} filename - Optional filename
 * @returns {string} IPFS CID hash
 */
async function uploadFile(buffer, filename = "file") {
  try {
    const client = getClient();
    const result = await client.add({ path: filename, content: buffer });
    const cid = result.cid.toString();
    console.log(`✅ IPFS file upload success. CID: ${cid}`);
    return cid;
  } catch (error) {
    console.error("❌ IPFS uploadFile error:", error.message);
    throw new Error(`IPFS file upload failed: ${error.message}`);
  }
}

/**
 * Retrieve content from IPFS by CID.
 * @param {string} cid - IPFS CID
 * @returns {string} Content as a string
 */
async function fetchFromIPFS(cid) {
  try {
    const client = getClient();
    const chunks = [];
    for await (const chunk of client.cat(cid)) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString("utf8");
    return data;
  } catch (error) {
    console.error("❌ IPFS fetch error:", error.message);
    throw new Error(`IPFS fetch failed: ${error.message}`);
  }
}

/**
 * Retrieve JSON data from IPFS.
 * @param {string} cid - IPFS CID
 * @returns {object} Parsed JSON object
 */
async function fetchJSON(cid) {
  const raw = await fetchFromIPFS(cid);
  return JSON.parse(raw);
}

/**
 * Get the public gateway URL for a CID.
 * @param {string} cid
 * @returns {string} URL
 */
function getGatewayUrl(cid) {
  const gateway = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs/";
  return `${gateway}${cid}`;
}

module.exports = {
  uploadJSON,
  uploadFile,
  fetchFromIPFS,
  fetchJSON,
  getGatewayUrl,
};