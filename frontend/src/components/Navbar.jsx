import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  connectWallet,
  getCurrentAccount,
  shortenAddress,
  onAccountChange,
  onChainChange,
} from "../utils/connectWallet";

const Navbar = ({ account, setAccount, network, setNetwork }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    // Check if already connected
    getCurrentAccount().then((acc) => {
      if (acc) setAccount(acc);
    });

    // Listen for account/network changes
    const removeAccListener = onAccountChange((accounts) => {
      setAccount(accounts[0] || null);
      if (!accounts[0]) setNetwork(null);
    });

    const removeChainListener = onChainChange(() => {
      window.location.reload();
    });

    return () => {
      removeAccListener();
      removeChainListener();
    };
  }, [setAccount, setNetwork]);

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    try {
      const { address, network: net } = await connectWallet();
      setAccount(address);
      setNetwork(net);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    } finally {
      setConnecting(false);
    }
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/vote", label: "Vote" },
    { to: "/results", label: "Results" },
    { to: "/admin", label: "Admin" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="brand-link">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">BlockVote</span>
        </Link>
        {network && (
          <span className="network-badge">
            {network.name === "unknown" ? `Chain ${network.chainId}` : network.name}
          </span>
        )}
      </div>

      <div className="navbar-links">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="navbar-wallet">
        {error && <span className="wallet-error">{error}</span>}
        {account ? (
          <div className="wallet-connected">
            <span className="wallet-dot" />
            <span className="wallet-address">{shortenAddress(account)}</span>
          </div>
        ) : (
          <button
            className="btn btn-connect"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <span className="spinner-sm" /> Connecting...
              </>
            ) : (
              <>🦊 Connect Wallet</>
            )}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;