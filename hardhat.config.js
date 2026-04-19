"use strict";

require("@nomicfoundation/hardhat-toolbox");

// Load backend .env if it exists
try {
  require("dotenv").config({ path: "../backend/.env" });
} catch (e) {
  console.warn("Could not load backend .env:", e.message);
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // ── Ganache / Hardhat node ─────────────────────────────
    localhost: {
      url:     "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      timeout: 60000,
    },
    hardhat: {
      chainId: 1337,
      mining:  { auto: true, interval: 0 },
    },
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },

  gasReporter: {
    enabled: false,
  },
};