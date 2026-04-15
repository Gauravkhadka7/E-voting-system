/* eslint-disable no-undef */
/**
 * contract.js — BlockVote MetaMask + Ethereum
 * Fixed: BigInt ESLint, 401 auth, MetaMask connection
 */

let contractAddress = '';
try {
  // eslint-disable-next-line
  const data = require('./contractAddress.json');
  contractAddress = data.address || '';
} catch { contractAddress = ''; }

export const CONTRACT_ADDRESS = contractAddress;
export const CHAIN_ID     = 1337;
export const CHAIN_ID_HEX = '0x539';
export const RPC_URL      = 'http://127.0.0.1:8545';

export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function connectMetaMask() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not found. Install from metamask.io then refresh.');
  }
  let accounts;
  try {
    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  } catch (err) {
    if (err.code === 4001) throw new Error('MetaMask connection rejected. Click Connect in MetaMask.');
    throw new Error('MetaMask error: ' + err.message);
  }
  if (!accounts || accounts.length === 0) {
    throw new Error('No MetaMask accounts found. Unlock MetaMask first.');
  }
  await switchToGanache();
  return accounts[0].toLowerCase();
}

export async function switchToGanache() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
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
    } else if (err.code !== 4001) {
      console.warn('Network switch warning:', err.message);
    }
  }
}

// Sign vote message — MetaMask popup #1
export async function signVoteMessage(walletAddress, electionId, candidateId) {
  const message = `BlockVote Vote Confirmation\nElection: ${electionId}\nCandidate: ${candidateId}\nWallet: ${walletAddress}\nTime: ${new Date().toISOString()}\n\nI confirm I am casting this vote.`;
  let signature;
  try {
    signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    });
  } catch (err) {
    if (err.code === 4001) throw new Error('Signature rejected. Vote cancelled.');
    throw new Error('Signing failed: ' + err.message);
  }
  return { message, signature };
}

// Send vote transaction — MetaMask popup #2
export async function castVoteOnChain(walletAddress, electionId, candidateId) {
  const enc = new TextEncoder();
  const bytes = enc.encode(`vote:${electionId}:${candidateId}`);
  const hex = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  let txHash = null;
  try {
    txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from:  walletAddress,
        to:    walletAddress,
        value: '0x0',
        data:  hex,
        gas:   '0x7530',
      }],
    });
  } catch (err) {
    if (err.code === 4001) throw new Error('Transaction rejected in MetaMask.');
    console.warn('Tx failed (continuing with IPFS record):', err.message);
  }
  return txHash;
}

export async function getWalletBalance(address) {
  try {
    const hexBalance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    const weiVal = parseInt(hexBalance, 16);
    return (weiVal / 1e18).toFixed(4);
  } catch { return '0.0000'; }
}

export function onAccountChange(cb) {
  if (window.ethereum) window.ethereum.on('accountsChanged', a => cb(a[0] || null));
}
export function onNetworkChange(cb) {
  if (window.ethereum) window.ethereum.on('chainChanged', id => cb(parseInt(id, 16)));
}