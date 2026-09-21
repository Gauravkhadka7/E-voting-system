import React, { useState } from "react";
import { connectMetaMask, formatAddress } from "../utils/connectWallet";
import { authAPI } from "../utils/api";
import toast from "react-hot-toast";

export default function WalletSelector({ onConnected }) {
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState(null);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { address: addr } = await connectMetaMask();
      setAddress(addr);

      // Save wallet address to backend
      await authAPI.updateWallet({ wallet_address: addr });
      toast.success(`Wallet connected: ${formatAddress(addr)}`);
      onConnected?.(addr);
    } catch (err) {
      toast.error(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    onConnected?.(null);
    toast.success("Wallet disconnected");
  };

  if (address) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-900/20 border border-emerald-700/40 rounded-xl">
        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
        <div>
          <p className="text-xs text-emerald-400 font-medium">Connected</p>
          <p className="text-sm text-white font-mono">{formatAddress(address)}</p>
        </div>
        <button
          onClick={handleDisconnect}
          className="ml-auto text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all duration-200 disabled:opacity-50"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
        alt="MetaMask"
        className="w-5 h-5"
        onError={(e) => { e.target.style.display = "none"; }}
      />
      <span className="text-sm font-medium text-white">
        {connecting ? "Connecting..." : "Connect MetaMask"}
      </span>
      {connecting && (
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      )}
    </button>
  );
}