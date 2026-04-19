"use strict";

require("@nomicfoundation/hardhat-toolbox");

try {
  require("dotenv").config({ path: "../backend/.env" });
} catch {}

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    hardhat: {
      chainId: 1337,
      mining: { auto: true, interval: 0 },
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
    },

    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
    },

    ganache8545: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};