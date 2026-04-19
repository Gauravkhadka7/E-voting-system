"use strict";
const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  BlockVote — Contract Deployment     ║");
  console.log("╚══════════════════════════════════════╝\n");
  console.log("🌐 Network  :", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deployer :", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance  :", hre.ethers.formatEther(balance), "ETH\n");

  if (parseFloat(hre.ethers.formatEther(balance)) === 0) {
    console.error("❌ Balance is 0 ETH. Is Ganache running?");
    process.exit(1);
  }

  // Deploy — Voting constructor takes NO arguments
  console.log("⏳ Deploying Voting contract...");
  const Voting  = await hre.ethers.getContractFactory("Voting");
  const voting  = await Voting.deploy();           // NO args
  await voting.waitForDeployment();

  const addr = await voting.getAddress();
  console.log("✅ Contract deployed at:", addr, "\n");

  // Save to frontend/src/utils/
  const utilsDir = path.join(__dirname, "../../frontend/src/utils");
  if (!fs.existsSync(utilsDir)) fs.mkdirSync(utilsDir, { recursive:true });

  fs.writeFileSync(
    path.join(utilsDir, "contractAddress.json"),
    JSON.stringify({ address:addr, network:hre.network.name, chainId:1337, rpc:"http://127.0.0.1:8545" }, null, 2)
  );
  console.log("💾 Saved → frontend/src/utils/contractAddress.json");

  // Save ABI
  const abiPaths = [
    path.join(__dirname, "../artifacts/contracts/Voting.sol/Voting.json"),
    path.join(__dirname, "../artifacts/Voting.sol/Voting.json"),
  ];
  for (const p of abiPaths) {
    if (fs.existsSync(p)) {
      const abi = JSON.parse(fs.readFileSync(p,"utf8")).abi;
      fs.writeFileSync(path.join(utilsDir,"VotingABI.json"), JSON.stringify(abi,null,2));
      console.log("💾 Saved → frontend/src/utils/VotingABI.json");
      break;
    }
  }

  // Update backend/.env
  const envPath = path.join(__dirname, "../../backend/.env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath,"utf8");
    env = env.includes("CONTRACT_ADDRESS=")
      ? env.replace(/CONTRACT_ADDRESS=.*/,`CONTRACT_ADDRESS=${addr}`)
      : env + `\nCONTRACT_ADDRESS=${addr}`;
    fs.writeFileSync(envPath, env);
    console.log("💾 Updated → backend/.env  (CONTRACT_ADDRESS)");
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  MetaMask Network Setup                      ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║  Network Name : Localhost 8545 (or Ganache)  ║");
  console.log("║  RPC URL      : http://127.0.0.1:8545        ║");
  console.log("║  Chain ID     : 1337                         ║");
  console.log("║  Currency     : ETH                          ║");
  console.log(`║  Contract     : ${addr}  ║`);
  console.log("╚══════════════════════════════════════════════╝\n");
}

main().then(()=>process.exit(0)).catch(err=>{
  console.error("\n❌ Deploy failed:", err.message);
  console.error("\nFix steps:");
  console.error("  1. Run: npx hardhat clean");
  console.error("  2. Run: npx hardhat compile");
  console.error("  3. Start Ganache first");
  console.error("  4. Run: npx hardhat run scripts/deploy.js --network localhost");
  process.exit(1);
});