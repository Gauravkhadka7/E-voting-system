import { BrowserProvider, formatEther } from "ethers";

// ─── Check MetaMask ───────────────────────────────────────────────────────────
export function isMetaMaskInstalled() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

// ─── Connect Wallet ───────────────────────────────────────────────────────────
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install it from https://metamask.io");
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(address);

    return {
      provider,
      signer,
      address,
      network,
      balance: formatEther(balance),
    };
  } catch (error) {
    if (error.code === 4001) {
      throw new Error("Connection rejected. Please approve the MetaMask request.");
    }
    throw error;
  }
}

// ─── Get Current Account ──────────────────────────────────────────────────────
export async function getCurrentAccount() {
  if (!isMetaMaskInstalled()) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts.length > 0 ? accounts[0] : null;
}

// ─── Switch Network ───────────────────────────────────────────────────────────
export async function switchToNetwork(chainId) {
  const chainIdHex = "0x" + chainId.toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      const config = getNetworkConfig(chainId);
      if (!config) throw new Error("Network config not found for chainId: " + chainId);
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [config] });
    } else {
      throw switchError;
    }
  }
}

function getNetworkConfig(chainId) {
  const configs = {
    1337: {
      chainId: "0x539",
      chainName: "Localhost 8545",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["http://127.0.0.1:8545"],
    },
    11155111: {
      chainId: "0xaa36a7",
      chainName: "Sepolia Test Network",
      nativeCurrency: { name: "Ether", symbol: "SepoliaETH", decimals: 18 },
      rpcUrls: ["https://sepolia.infura.io/v3/"],
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },
  };
  return configs[chainId] || null;
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
export function onAccountChange(callback) {
  if (!isMetaMaskInstalled()) return () => {};
  window.ethereum.on("accountsChanged", callback);
  return () => window.ethereum.removeListener("accountsChanged", callback);
}

export function onChainChange(callback) {
  if (!isMetaMaskInstalled()) return () => {};
  window.ethereum.on("chainChanged", callback);
  return () => window.ethereum.removeListener("chainChanged", callback);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return address.slice(0, chars + 2) + "..." + address.slice(-chars);
}

export function formatBalance(balance, decimals = 4) {
  return parseFloat(balance).toFixed(decimals);
}