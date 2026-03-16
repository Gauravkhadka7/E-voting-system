import { defineConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config(); // Load .env variables (for private keys)

// Hardhat config
export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337, // Hardhat local network
    },
    localhost: {
      url: "http://127.0.0.1:8545", // Must match `npx hardhat node`
      chainId: 31337,
      accounts: process.env.LOCALHOST_ACCOUNTS
        ? process.env.LOCALHOST_ACCOUNTS.split(",")
        : undefined, // Optional: private keys for MetaMask account
    },
  },
});