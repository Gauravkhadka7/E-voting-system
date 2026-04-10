/**
 * contract.js — BlockVote Frontend
 * ══════════════════════════════════
 * Handles all MetaMask + Ethereum interactions:
 *   - Connect MetaMask
 *   - Switch to Ganache network (Chain ID 1337)
 *   - Sign vote message (popup #1)
 *   - Send vote transaction (popup #2)
 *   - Read contract results
 *
 * Uses ethers.js v6 (BrowserProvider)
 */

import contractAddressData from './contractAddress.json';
import VotingABI           from './VotingABI.json';

const CONTRACT_ADDRESS = contractAddressData.address;
const CHAIN_ID         = 1337;
const CHAIN_ID_HEX     = '0x539'; // 1337 in hex
const RPC_URL          = 'http://127.0.0.1:8545';

// ── Check MetaMask installed ─────────────────────────────────
export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

// ── Get ethers provider (ethers v6) ─────────────────────────
export async function getProvider() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed. Please install from https://metamask.io');
  }
  const { ethers } = await import('ethers');
  return new ethers.BrowserProvider(window.ethereum);
}

// ── Connect MetaMask + switch to Ganache ─────────────────────
export async function connectMetaMask() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not found. Install from metamask.io and refresh the page.');
  }

  // Request accounts — opens MetaMask popup if locked
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No MetaMask accounts found. Unlock MetaMask and try again.');
  }

  // Switch to Ganache network
  await switchToGanache();

  return accounts[0].toLowerCase();
}

// ── Switch MetaMask to Ganache (Chain ID 1337) ───────────────
export async function switchToGanache() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (switchErr) {
    // Chain not added yet — add it
    if (switchErr.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:         CHAIN_ID_HEX,
          chainName:       'Localhost 8545 (Ganache)',
          rpcUrls:         [RPC_URL],
          nativeCurrency:  { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
          blockExplorerUrls: [],
        }],
      });
    } else if (switchErr.code === 4001) {
      throw new Error('User rejected network switch. Please switch to Localhost 8545 manually.');
    } else {
      throw switchErr;
    }
  }
}

// ── Get contract instance ────────────────────────────────────
export async function getContract(withSigner = false) {
  const { ethers } = await import('ethers');
  const provider   = await getProvider();

  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, VotingABI, signer);
  }
  return new ethers.Contract(CONTRACT_ADDRESS, VotingABI, provider);
}

// ══════════════════════════════════════════════════════════════
// STEP 1 — Sign message (MetaMask popup #1)
// Shows: "BlockVote wants you to sign a message"
// No gas, just proves wallet ownership
// ══════════════════════════════════════════════════════════════
export async function signVoteMessage(walletAddress, electionId, candidateId) {
  const message = [
    '╔═══════════════════════════════╗',
    '║   BlockVote — Cast Your Vote  ║',
    '╚═══════════════════════════════╝',
    '',
    `Election ID  : ${electionId}`,
    `Candidate ID : ${candidateId}`,
    `Wallet       : ${walletAddress}`,
    `Timestamp    : ${new Date().toISOString()}`,
    '',
    'I confirm I am casting this vote using my MetaMask wallet.',
    'This action is irreversible.',
  ].join('\n');

  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress],
  });

  return { message, signature };
}

// ══════════════════════════════════════════════════════════════
// STEP 2 — Send transaction (MetaMask popup #2)
// Shows: "BlockVote wants to send a transaction"
// Calls castVote() on the Voting smart contract
// ══════════════════════════════════════════════════════════════
export async function castVoteOnChain(electionId, candidateId, nullifierHash) {
  const { ethers } = await import('ethers');

  // Get contract with signer (needed for state-changing tx)
  const contract = await getContract(true);

  // Convert nullifierHash string → bytes32
  const nullifierBytes32 = ethers.zeroPadValue(
    ethers.toBeArray(ethers.toBigInt('0x' + nullifierHash.replace(/^0x/, '').slice(0, 64).padStart(64, '0'))),
    32
  );

  // Send transaction — MetaMask shows popup #2 here
  // User sees: function name, gas estimate, ETH cost
  const tx = await contract.castVote(
    BigInt(electionId),
    BigInt(candidateId),
    nullifierBytes32
  );

  console.log('⏳ Transaction sent:', tx.hash);

  // Wait for 1 confirmation
  const receipt = await tx.wait(1);
  console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

  return {
    txHash:      tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed:     receipt.gasUsed.toString(),
  };
}

// ══════════════════════════════════════════════════════════════
// READ — Get live results from contract
// ══════════════════════════════════════════════════════════════
export async function getResultsFromChain(electionId) {
  try {
    const contract = await getContract(false);
    const [ids, names, parties, votes] = await contract.getResults(BigInt(electionId));

    return ids.map((id, i) => ({
      id:        id.toString(),
      name:      names[i],
      party:     parties[i],
      voteCount: Number(votes[i]),
    }));
  } catch (err) {
    console.warn('Could not fetch on-chain results:', err.message);
    return [];
  }
}

// ── Check if wallet already voted ────────────────────────────
export async function checkHasVoted(walletAddress, electionId) {
  try {
    const contract = await getContract(false);
    return await contract.checkHasVoted(walletAddress, BigInt(electionId));
  } catch { return false; }
}

// ── Get wallet ETH balance ────────────────────────────────────
export async function getWalletBalance(address) {
  try {
    const { ethers } = await import('ethers');
    const provider   = await getProvider();
    const balance    = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance)).toFixed(4);
  } catch { return '0.0000'; }
}

// ── Listen for account/network changes ───────────────────────
export function onAccountChange(callback) {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', accounts => callback(accounts[0] || null));
  }
}

export function onNetworkChange(callback) {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', chainId => callback(parseInt(chainId, 16)));
  }
}

export { CONTRACT_ADDRESS, CHAIN_ID };