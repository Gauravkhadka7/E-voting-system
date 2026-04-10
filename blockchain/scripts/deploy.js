const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     BlockVote — Contract Deployment      ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log("🌐 Network  :", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deployer :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance  :", hre.ethers.formatEther(balance), "ETH\n");

  if (parseFloat(hre.ethers.formatEther(balance)) === 0) {
    console.error("❌ Deployer has 0 ETH — is Hardhat node or Ganache running?");
    process.exit(1);
  }

  console.log("⏳ Deploying Voting contract...");
  const Voting  = await hre.ethers.getContractFactory("Voting");
  const voting  = await Voting.deploy();
  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log("✅ Contract deployed!");
  console.log("📍 Address  :", contractAddress, "\n");

  // ── deploy.js lives in blockchain/scripts/
  // ── so "../.." goes up to project root
  // ── then into frontend/src/utils/

  // 1. Save contractAddress.json → frontend/src/utils/
  const frontendUtils = path.join(__dirname, "../../frontend/src/utils");
  if (!fs.existsSync(frontendUtils)) fs.mkdirSync(frontendUtils, { recursive: true });

  fs.writeFileSync(
    path.join(frontendUtils, "contractAddress.json"),
    JSON.stringify({
      address:    contractAddress,
      network:    hre.network.name,
      chainId:    1337,
      rpc:        "http://127.0.0.1:8545",
      deployedAt: new Date().toISOString(),
    }, null, 2)
  );
  console.log("💾 Saved → frontend/src/utils/contractAddress.json");

  // 2. Save ABI → frontend/src/utils/VotingABI.json
  // artifacts live in blockchain/artifacts/ (same level as scripts/)
  const artifactPath = path.join(__dirname, "../artifacts/contracts/Voting.sol/Voting.json");

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(frontendUtils, "VotingABI.json"),
      JSON.stringify(artifact.abi, null, 2)
    );
    console.log("💾 Saved → frontend/src/utils/VotingABI.json");
  } else {
    console.warn("⚠  ABI not found at:", artifactPath);
    console.warn("   Run 'npx hardhat compile' first");
  }

  // 3. Update CONTRACT_ADDRESS in backend/.env
  const backendEnv = path.join(__dirname, "../../backend/.env");
  if (fs.existsSync(backendEnv)) {
    let env = fs.readFileSync(backendEnv, "utf8");
    if (env.includes("CONTRACT_ADDRESS=")) {
      env = env.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
    } else {
      env += `\nCONTRACT_ADDRESS=${contractAddress}`;
    }
    fs.writeFileSync(backendEnv, env);
    console.log("💾 Updated → backend/.env  (CONTRACT_ADDRESS)");
  } else {
    console.warn("⚠  backend/.env not found — add manually:");
    console.warn(`   CONTRACT_ADDRESS=${contractAddress}`);
  }

  // 4. Print MetaMask setup
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║         MetaMask Network Setup               ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║  Network Name  : Localhost 8545              ║");
  console.log("║  RPC URL       : http://127.0.0.1:8545       ║");
  console.log("║  Chain ID      : 1337                        ║");
  console.log("║  Currency      : ETH                         ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Contract: ${contractAddress} ║`);
  console.log("╚══════════════════════════════════════════════╝\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("\n❌ Deploy failed:", err.message);
    console.error("\nMake sure:");
    console.error("  1. Hardhat node is running: npx hardhat node");
    console.error("  2. You compiled first:      npx hardhat compile");
    process.exit(1);
  });