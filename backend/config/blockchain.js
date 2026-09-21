// utils/ipfs.js
"use strict";

const axios = require("axios");
const fs    = require("fs");
const FormData = require("form-data");

const PINATA_API_KEY    = process.env.PINATA_API_KEY    || "";
const PINATA_API_SECRET = process.env.PINATA_API_SECRET || "";
const PINATA_JWT        = process.env.PINATA_JWT        || "";

const pinataHeaders = PINATA_JWT
  ? { Authorization: `Bearer ${PINATA_JWT}` }
  : {
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET,
    };

/**
 * Pin a local file to IPFS via Pinata.
 * Returns the IPFS CID (hash) string.
 */
async function pinFile(filePath, fileName) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), fileName);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: fileName })
  );

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    { headers: { ...pinataHeaders, ...form.getHeaders() } }
  );

  return res.data.IpfsHash; // CID
}

/**
 * Pin a JSON object to IPFS via Pinata.
 * Returns the IPFS CID string.
 */
async function pinJSON(jsonObj, name = "data") {
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    { pinataMetadata: { name }, pinataContent: jsonObj },
    { headers: { ...pinataHeaders, "Content-Type": "application/json" } }
  );
  return res.data.IpfsHash;
}

/**
 * Fetch JSON content from IPFS by CID using the public gateway.
 */
async function fetchJSON(cid) {
  const gateway = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
  const res = await axios.get(`${gateway}/${cid}`);
  return res.data;
}

/**
 * Unpin a CID from Pinata (cleanup).
 */
async function unpin(cid) {
  await axios.delete(
    `https://api.pinata.cloud/pinning/unpin/${cid}`,
    { headers: pinataHeaders }
  );
}

module.exports = { pinFile, pinJSON, fetchJSON, unpin };