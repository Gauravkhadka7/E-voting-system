const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Blockchain E-Voting — Contract Deployment  ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`🌐 Network    : ${network.name} (chainId: ${network.chainId})`);
  console.log(`👤 Deployer   : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance    : ${ethers.utils.formatEther(balance)} ETH\n`);

  // Deploy the Voting contract
  console.log("⏳ Deploying Voting contract...");
  const VotingFactory = await ethers.getContractFactory("Voting");
  const voting = await VotingFactory.deploy();
  await voting.deployed();

  console.log(`✅ Voting contract deployed at: ${voting.address}`);
  console.log(`   Transaction hash            : ${voting.deployTransaction.hash}\n`);

  // ─── Seed initial data (optional, only for local) ─────────────────────────
  if (network.chainId === 1337 || network.chainId === 31337) {
    console.log("🌱 Seeding initial election data (local network)...\n");

    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 60;           // starts in 1 minute
    const endTime = now + 60 * 60 * 24;  // ends in 24 hours

    const tx1 = await voting.createElection(
      "Presidential Election 2024",
      "Vote for the next President of the Decentralized Republic",
      startTime,
      endTime
    );
    await tx1.wait();
    console.log(`   📋 Election 1 created.`);

    const candidates = [
      { name: "Alice Johnson",   party: "Progressive Party", ipfs: "QmSeedHash1" },
      { name: "Bob Smith",       party: "Conservative Party", ipfs: "QmSeedHash2" },
      { name: "Carol Williams",  party: "Independent Alliance", ipfs: "QmSeedHash3" },
    ];

    for (const c of candidates) {
      const tx = await voting.addCandidate(1, c.name, c.party, c.ipfs);
      await tx.wait();
      console.log(`   👤 Candidate added: ${c.name} (${c.party})`);
    }

    console.log("\n✅ Seed data applied.\n");
  }

  // ─── Save deployment info ──────────────────────────────────────────────────
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: voting.address,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    transactionHash: voting.deployTransaction.hash,
  };

  // Save to root deployments folder
  const deploymentsDir = path.join(__dirname, "../../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const filename = path.join(deploymentsDir, `${network.name}-${network.chainId}.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${filename}`);

  // Update .env CONTRACT_ADDRESS
  const envPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /^CONTRACT_ADDRESS=.*/m,
      `CONTRACT_ADDRESS=${voting.address}`
    );
    envContent = envContent.replace(
      /^REACT_APP_CONTRACT_ADDRESS=.*/m,
      `REACT_APP_CONTRACT_ADDRESS=${voting.address}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log("🔧 .env CONTRACT_ADDRESS updated automatically.");
  }

  // Copy ABI to frontend
  const artifactsPath = path.join(__dirname, "../../artifacts/contracts/Voting.sol/Voting.json");
  const frontendAbiPath = path.join(__dirname, "../../frontend/src/abi/voting.json");

  if (fs.existsSync(artifactsPath)) {
    const abiDir = path.dirname(frontendAbiPath);
    if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
    fs.copyFileSync(artifactsPath, frontendAbiPath);
    console.log("📋 ABI copied to frontend/src/abi/voting.json");
  }

  console.log("\n🎉 Deployment complete!\n");
  console.log("Next steps:");
  console.log("  1. Start the backend:  npm run dev");
  console.log("  2. Start the frontend: npm run frontend");
  console.log(`  3. Add this contract address to MetaMask: ${voting.address}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });