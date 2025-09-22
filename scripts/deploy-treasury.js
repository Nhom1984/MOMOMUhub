const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying MEMOMUModesTreasury contract...");

    // Get the contract factory
    const MEMOMUModesTreasury = await ethers.getContractFactory("MEMOMUModesTreasury");

    // Configuration for deployment
    const config = {
        // Replace with actual MON token address on Monad testnet
        monTokenAddress: "0x0000000000000000000000000000000000000000", // Placeholder - update before deployment
        
        // Default treasury wallets (should be updated after deployment)
        treasuryWallets: {
            Classic: "0x0000000000000000000000000000000000000000", // Classic Memory treasury
            MEMOMU: "0x0000000000000000000000000000000000000000",  // MEMOMU Memory treasury
            Music: "0x0000000000000000000000000000000000000000",   // Music Memory treasury
            // MONLUCK and Battle use contract-managed payouts
        }
    };

    console.log("Deployment configuration:");
    console.log("- MON Token Address:", config.monTokenAddress);
    console.log("- Classic Treasury:", config.treasuryWallets.Classic);
    console.log("- MEMOMU Treasury:", config.treasuryWallets.MEMOMU);
    console.log("- Music Treasury:", config.treasuryWallets.Music);

    // Deploy the contract
    const contract = await MEMOMUModesTreasury.deploy(config.monTokenAddress);
    await contract.deployed();

    console.log("MEMOMUModesTreasury deployed to:", contract.address);
    console.log("Transaction hash:", contract.deployTransaction.hash);

    // Wait for confirmations
    console.log("Waiting for confirmations...");
    await contract.deployTransaction.wait(2);

    console.log("\n=== POST-DEPLOYMENT SETUP ===");
    console.log("1. Update treasury wallet addresses:");
    console.log(`   - updateTreasuryWallet(0, "${config.treasuryWallets.Classic}") // Classic`);
    console.log(`   - updateTreasuryWallet(1, "${config.treasuryWallets.MEMOMU}") // MEMOMU`);
    console.log(`   - updateTreasuryWallet(2, "${config.treasuryWallets.Music}") // Music`);
    
    console.log("\n2. Update blockchain.js contract address:");
    console.log(`   CONTRACT_CONFIG.address = "${contract.address}";`);
    
    console.log("\n3. Verify contract on Monad explorer (when available)");
    
    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("Contract Name: MEMOMUModesTreasury");
    console.log("Network: Monad Testnet");
    console.log("Address:", contract.address);
    console.log("Owner:", await contract.owner());
    console.log("Gas Used:", contract.deployTransaction.gasLimit.toString());
    
    return {
        contract: contract,
        address: contract.address,
        config: config
    };
}

// Execute deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = main;