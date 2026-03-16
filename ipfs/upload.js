const { create } = require("ipfs-http-client");
const fs = require("fs");
const path = require("path");

/**
 * BlockVote IPFS Uploader
 * ========================
 * Utility script for uploading election data, candidate info,
 * and audit records to the InterPlanetary File System (IPFS).
 *
 * Usage:
 *   node ipfs/upload.js --file ./data.json
 *   node ipfs/upload.js --json '{"key":"value"}'
 *   node ipfs/upload.js --election 1
 */

const args = process.argv.slice(2);

// ── IPFS Client ───────────────────────────────────────────────────────────────
const client = create({
  host: process.env.IPFS_HOST || "localhost",
  port: parseInt(process.env.IPFS_PORT) || 5001,
  protocol: process.env.IPFS_PROTOCOL || "http",
});

/**
 * Upload a file to IPFS
 * @param {string} filePath
 * @returns {Promise<string>} CID
 */
async function uploadFile(filePath) {
  const content = fs.readFileSync(filePath);
  const filename = path.basename(filePath);

  console.log(`📤 Uploading ${filename} to IPFS...`);

  const result = await client.add(
    { path: filename, content },
    { pin: true, wrapWithDirectory: false }
  );

  const cid = result.cid.toString();
  console.log(`✅ Uploaded: ${filename}`);
  console.log(`📍 CID: ${cid}`);
  console.log(`🌐 Gateway: https://ipfs.io/ipfs/${cid}`);
  return cid;
}

/**
 * Upload JSON object to IPFS
 * @param {Object} data
 * @param {string} label
 * @returns {Promise<string>} CID
 */
async function uploadJSON(data, label = "data") {
  const content = JSON.stringify(data, null, 2);
  console.log(`📤 Uploading ${label} to IPFS...`);

  const result = await client.add(
    { content: Buffer.from(content) },
    { pin: true }
  );

  const cid = result.cid.toString();
  console.log(`✅ Uploaded: ${label}`);
  console.log(`📍 CID: ${cid}`);
  console.log(`🌐 Gateway: https://ipfs.io/ipfs/${cid}`);
  return cid;
}

/**
 * Upload election metadata
 */
async function uploadElectionData(electionId) {
  const metadata = {
    id: electionId,
    name: "General Election 2024",
    description: "Blockchain-based democratic election",
    candidates: [
      { id: 1, name: "Alice Kumar", party: "Progressive Alliance" },
      { id: 2, name: "Bob Sherpa", party: "Reform Coalition" },
      { id: 3, name: "Clara Thapa", party: "Green Future Party" },
    ],
    createdAt: new Date().toISOString(),
    blockchain: "Ethereum",
    protocol: "BlockVote v1.0",
  };

  return uploadJSON(metadata, `Election ${electionId} metadata`);
}

/**
 * Fetch data from IPFS by CID
 * @param {string} cid
 */
async function fetchFromIPFS(cid) {
  console.log(`📥 Fetching CID: ${cid}`);
  const chunks = [];
  for await (const chunk of client.cat(cid)) {
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks).toString("utf8");
  console.log("✅ Fetched data:", data);
  return JSON.parse(data);
}

// ── CLI Runner ────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌐 ==========================================");
  console.log("   BlockVote IPFS Uploader");
  console.log("==========================================\n");

  try {
    // Test IPFS connection
    const version = await client.version();
    console.log("✅ IPFS daemon connected — version:", version.version);

    if (args.includes("--file")) {
      const filePath = args[args.indexOf("--file") + 1];
      await uploadFile(filePath);
    } else if (args.includes("--json")) {
      const jsonStr = args[args.indexOf("--json") + 1];
      await uploadJSON(JSON.parse(jsonStr));
    } else if (args.includes("--election")) {
      const electionId = parseInt(args[args.indexOf("--election") + 1]);
      await uploadElectionData(electionId);
    } else if (args.includes("--fetch")) {
      const cid = args[args.indexOf("--fetch") + 1];
      await fetchFromIPFS(cid);
    } else {
      // Default: upload sample data
      console.log("No args provided — uploading sample election data...\n");
      await uploadElectionData(1);
    }
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      console.error("❌ IPFS daemon not running. Start with: ipfs daemon");
    } else {
      console.error("❌ Error:", err.message);
    }
    process.exit(1);
  }
}

main();

module.exports = { uploadFile, uploadJSON, fetchFromIPFS };