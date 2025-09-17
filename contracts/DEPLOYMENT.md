# MEMOMUhub Smart Contract Deployment Guide

This guide explains how to deploy the MEMOMUhub smart contracts to the Monad blockchain.

## Prerequisites

1. **Node.js and npm** installed
2. **Hardhat** or **Remix IDE** for deployment
3. **MetaMask** with Monad testnet configured
4. **Test MON tokens** for deployment and testing

## Monad Network Configuration

Add Monad testnet to MetaMask:
- **Network Name**: Monad Testnet
- **RPC URL**: `https://testnet-rpc.monad.xyz` (replace with actual RPC)
- **Chain ID**: `9001`
- **Currency Symbol**: `MON`
- **Block Explorer**: `https://testnet-explorer.monad.xyz` (replace with actual explorer)

## Option 1: Deploy using Hardhat

### 1. Initialize Hardhat Project

```bash
mkdir memomu-contracts
cd memomu-contracts
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npx hardhat
```

### 2. Configure Hardhat

Create `hardhat.config.js`:

```javascript
require("@nomiclabs/hardhat-ethers");

const PRIVATE_KEY = "your-private-key-here"; // Use environment variable in production

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    monad: {
      url: "https://testnet-rpc.monad.xyz",
      accounts: [PRIVATE_KEY],
      chainId: 9001,
      gasPrice: 20000000000 // 20 gwei, adjust as needed
    }
  }
};
```

### 3. Create Deployment Script

Create `scripts/deploy.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying MEMOMUTreasury contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy Treasury contract
  const MEMOMUTreasury = await ethers.getContractFactory("MEMOMUTreasury");
  const treasury = await MEMOMUTreasury.deploy();
  await treasury.deployed();

  console.log("MEMOMUTreasury deployed to:", treasury.address);
  
  // Save deployment info
  const deploymentInfo = {
    treasury: treasury.address,
    deployer: deployer.address,
    network: "monad",
    timestamp: new Date().toISOString()
  };
  
  console.log("Deployment completed:", deploymentInfo);
  console.log("\nUpdate blockchain.js with contract address:");
  console.log(`treasury: "${treasury.address}",`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4. Deploy

```bash
# Copy contract file to contracts directory
cp MEMOMUTreasury.sol contracts/

# Deploy to Monad testnet
npx hardhat run scripts/deploy.js --network monad
```

## Option 2: Deploy using Remix IDE

### 1. Open Remix IDE

Go to [remix.ethereum.org](https://remix.ethereum.org)

### 2. Create Contract File

- Create new file: `MEMOMUTreasury.sol`
- Copy and paste the contract code from `MEMOMUTreasury.sol`

### 3. Compile Contract

- Go to "Solidity Compiler" tab
- Select compiler version: `0.8.19`
- Click "Compile MEMOMUTreasury.sol"

### 4. Deploy Contract

- Go to "Deploy & Run Transactions" tab
- Select Environment: "Injected Web3" (MetaMask)
- Ensure MetaMask is connected to Monad testnet
- Select contract: "MEMOMUTreasury"
- Click "Deploy"
- Confirm transaction in MetaMask

### 5. Save Contract Address

After successful deployment, copy the contract address and update `blockchain.js`:

```javascript
const CONTRACT_ADDRESSES = {
    treasury: "0xYourContractAddressHere", // Replace with actual address
};
```

## Post-Deployment Setup

### 1. Update Frontend Configuration

In `blockchain.js`, update:
- Contract address in `CONTRACT_ADDRESSES`
- Monad network RPC URL if different
- Verify network configuration

### 2. Test Contract Functions

Test basic contract functions:

```javascript
// In browser console after connecting wallet
const treasury = window.blockchainIntegration.treasuryContract;

// Check current week
console.log(await treasury.getCurrentWeek());

// Check treasury balance
console.log(await treasury.getTreasuryBalance("musicMemory", ethers.utils.parseEther("0.1")));
```

### 3. Initialize Game Logic Contract (Optional)

If you have a separate game logic contract:

```javascript
// Set game logic contract address
await treasury.setGameLogicContract("0xGameLogicContractAddress");
```

## Testing Checklist

- [ ] Contract deployed successfully
- [ ] Frontend loads without errors
- [ ] Wallet connection works
- [ ] Buy-in transactions work
- [ ] Treasury balances update correctly
- [ ] Payout mechanisms function
- [ ] Week calculation works correctly

## Security Notes

- **Private Keys**: Never commit private keys to version control
- **Environment Variables**: Use `.env` files for sensitive data
- **Testnet First**: Always test on testnet before mainnet deployment
- **Code Review**: Have the contracts audited for production use
- **Multi-sig**: Consider using multi-signature wallets for contract ownership

## Support

For deployment issues:
1. Check Monad network status
2. Verify gas prices and limits
3. Ensure sufficient MON balance for deployment
4. Check contract compilation errors
5. Verify network configuration in MetaMask

## Contract Verification (Optional)

If Monad supports contract verification:

```bash
npx hardhat verify --network monad CONTRACT_ADDRESS
```

This enables users to read the contract source code on the block explorer.