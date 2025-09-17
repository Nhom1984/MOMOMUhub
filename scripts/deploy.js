const hre = require("hardhat");

async function main() {
  console.log("Deploying MEMOMUhub contract...");
  console.log("Network:", hre.network.name);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  const MEMOMUhub = await hre.ethers.getContractFactory("MEMOMUhub");
  console.log("Deploying contract...");
  
  const memomuhub = await MEMOMUhub.deploy();
  await memomuhub.deployed();
  
  console.log("✅ MEMOMUhub deployed to:", memomuhub.address);
  console.log("📝 Deployment transaction:", memomuhub.deployTransaction.hash);
  console.log("⛽ Gas used:", memomuhub.deployTransaction.gasLimit.toString());
  
  // Log contract constants for verification
  console.log("\n📊 Contract Configuration:");
  console.log("BUY_IN_LOW:", await memomuhub.BUY_IN_LOW());
  console.log("BUY_IN_HIGH:", await memomuhub.BUY_IN_HIGH());
  console.log("BATTLE_BUY_IN:", await memomuhub.BATTLE_BUY_IN());
  console.log("Owner:", await memomuhub.owner());
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: memomuhub.address,
    deploymentHash: memomuhub.deployTransaction.hash,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: memomuhub.deployTransaction.blockNumber
  };
  
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Verify contract on explorer (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await memomuhub.deployTransaction.wait(6);
    
    try {
      console.log("🔍 Verifying contract...");
      await hre.run("verify:verify", {
        address: memomuhub.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }
  
  console.log("\n🎮 Next Steps:");
  console.log("1. Update CONTRACT_CONFIG.address in blockchain.js with:", memomuhub.address);
  console.log("2. Fund the contract with MON for payouts");
  console.log("3. Set up weekly reward distribution automation");
  console.log("4. Test all game modes on frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });