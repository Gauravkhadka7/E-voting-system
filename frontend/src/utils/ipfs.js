/**
 * ipfs.js — Frontend IPFS utility
 * Uses the backend API or Infura IPFS for uploads and retrieval.
 */

const IPFS_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY || "https://ipfs.io/ipfs/";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// ─── Upload JSON via Backend ──────────────────────────────────────────────────
export async function uploadJSONToIPFS(data) {
  const response = await fetch(`${BACKEND_URL}/api/votes/upload-metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "IPFS upload failed");
  }

  const result = await response.json();
  return result.data.ipfsHash;
}

// ─── Get Gateway URL ──────────────────────────────────────────────────────────
export function getIPFSUrl(cid) {
  if (!cid) return null;
  return `${IPFS_GATEWAY}${cid}`;
}

// ─── Fetch JSON from IPFS (via gateway) ──────────────────────────────────────
export async function fetchFromIPFS(cid) {
  const url = getIPFSUrl(cid);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch from IPFS: ${cid}`);
  return response.json();
}

// ─── Upload File (image) via Backend ─────────────────────────────────────────
export async function uploadFileToIPFS(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_URL}/api/votes/upload-file`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "File upload to IPFS failed");
  }

  const result = await response.json();
  return result.data.ipfsHash;
}

export { IPFS_GATEWAY };