# MEMOMUhub Deployment Guide

This guide covers deploying the MEMOMUhub smart contract and configuring the frontend for Monad blockchain integration.

## Prerequisites

- Node.js (v16 or higher)
- Hardhat development environment
- MetaMask or compatible wallet
- MON tokens for testing and deployment
- Access to Monad testnet/mainnet

## Smart Contract Deployment

### 1. Setup Development Environment

```bash
# Create new hardhat project
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npm install @openzeppelin/contracts

# Initialize Hardhat
npx hardhat
```

### 2. Configure Hardhat for Monad

Create `hardhat.config.js`:

```javascript
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.19",
  networks: {
    monadTestnet: {
      url: "https://testnet-rpc.monad.xyz", // Replace with actual Monad testnet RPC
      accounts: [process.env.PRIVATE_KEY],
      chainId: 41454 // Replace with actual Monad chain ID
    },
    monadMainnet: {
      url: "https://rpc.monad.xyz", // Replace with actual Monad mainnet RPC
      accounts: [process.env.PRIVATE_KEY],
      chainId: 54321 // Replace with actual Monad chain ID
    }
  }
};
```

### 3. Deploy Contract

Create deployment script `scripts/deploy.js`:

```javascript
async function main() {
  const MEMOMUhub = await ethers.getContractFactory("MEMOMUhub");
  const memomuhub = await MEMOMUhub.deploy();
  await memomuhub.deployed();
  
  console.log("MEMOMUhub deployed to:", memomuhub.address);
  console.log("Contract owner:", await memomuhub.owner());
  
  // Verify deployment
  const version = await memomuhub.getCurrentWeekId();
  console.log("Current week ID:", version.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Deploy to testnet:
```bash
# Set environment variables
export PRIVATE_KEY="your_private_key_here"

# Deploy to Monad testnet
npx hardhat run scripts/deploy.js --network monadTestnet

# Deploy to Monad mainnet (when ready)
npx hardhat run scripts/deploy.js --network monadMainnet
```

## Frontend Configuration

### 1. Update Contract Address

After deployment, update the contract address in `blockchain.js`:

```javascript
const CONTRACT_CONFIG = {
    address: "0xYourDeployedContractAddress", // Replace with actual deployed address
    // ... rest of config
};
```

### 2. Configure Network Settings

Update the network configuration for Monad in `blockchain.js`:

```javascript
// Add network validation
const MONAD_NETWORKS = {
  testnet: {
    chainId: '0xa1fe', // 41454 in hex
    chainName: 'Monad Testnet',
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18
    },
    blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
  },
  mainnet: {
    chainId: '0xd431', // 54321 in hex  
    chainName: 'Monad',
    rpcUrls: ['https://rpc.monad.xyz'],
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18
    },
    blockExplorerUrls: ['https://explorer.monad.xyz']
  }
};
```

### 3. Add Network Switching

Add automatic network switching in the wallet connection:

```javascript
async function switchToMonadNetwork() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_NETWORKS.mainnet.chainId }],
    });
  } catch (switchError) {
    // Network not added, try to add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_NETWORKS.mainnet],
      });
    }
  }
}
```

## Backend Setup (Optional)

For automated weekly reward distribution, you can set up a backend service:

### 1. Create Reward Distribution Service

```javascript
// weekly-rewards.js
const ethers = require('ethers');
const cron = require('node-cron');

const provider = new ethers.providers.JsonRpcProvider('https://rpc.monad.xyz');
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

// Run every Sunday at 20:00 UTC
cron.schedule('0 20 * * 0', async () => {
  console.log('Running weekly reward distribution...');
  
  // Fetch top players from your leaderboard service
  const topPlayers = await fetchTopPlayersFromDB();
  
  // Allocate rewards for each game mode and buy-in level
  for (const gameMode of ['MUSIC_MEMORY', 'CLASSIC_MEMORY', 'MEMOMOMU']) {
    for (const buyIn of [0.1, 1.0]) {
      const players = topPlayers[gameMode][buyIn] || [];
      if (players.length > 0) {
        await contract.allocateWeeklyRewards(
          GAME_MODES[gameMode],
          ethers.utils.parseEther(buyIn.toString()),
          players.slice(0, 5).map(p => p.address)
        );
      }
    }
  }
  
  // Allocate battle rewards
  const battlePlayers = topPlayers.battle || [];
  if (battlePlayers.length > 0) {
    await contract.allocateBattleWeeklyRewards(
      battlePlayers.slice(0, 3).map(p => p.address)
    );
  }
});
```

### 2. Leaderboard Data Management

You'll need to integrate with your Firebase/database to track weekly leaderboards:

```javascript
// Track weekly performance
function trackWeeklyScore(gameMode, buyIn, playerAddress, score) {
  const weekId = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  // Store in database with week ID
  db.collection('weeklyScores').add({
    weekId,
    gameMode,
    buyIn,
    playerAddress,
    score,
    timestamp: new Date()
  });
}
```

## Testing

### 1. Local Testing

Test the contract locally:

```bash
npx hardhat test
```

Create test files in `test/`:

```javascript
// test/MEMOMUhub.test.js
const { expect } = require("chai");

describe("MEMOMUhub", function () {
  it("Should allow buy-ins", async function () {
    const MEMOMUhub = await ethers.getContractFactory("MEMOMUhub");
    const contract = await MEMOMUhub.deploy();
    
    await contract.placeBuyIn(0, ethers.utils.parseEther("0.1"), {
      value: ethers.utils.parseEther("0.1")
    });
    
    const balance = await contract.getTreasuryBalance(0, ethers.utils.parseEther("0.1"));
    expect(balance).to.equal(ethers.utils.parseEther("0.1"));
  });
});
```

### 2. Frontend Testing

Test the frontend integration:

1. Connect MetaMask to Monad testnet
2. Add test MON tokens to your wallet
3. Test each game mode with buy-ins
4. Verify transaction confirmations
5. Test withdrawal functionality

## Security Considerations

1. **Private Keys**: Never commit private keys to git
2. **Admin Functions**: Secure the contract owner account
3. **Gas Limits**: Set appropriate gas limits for transactions
4. **Rate Limiting**: Consider adding rate limiting to prevent spam
5. **Emergency Controls**: Test emergency withdrawal functionality

## Monitoring

Set up monitoring for:

- Contract balance levels
- Failed transactions
- Weekly reward distributions
- User activity metrics

## Maintenance

Regular maintenance tasks:

1. Monitor contract balance for MONLUCK payouts
2. Verify weekly reward distributions occur correctly
3. Update frontend if contract upgrades are needed
4. Monitor gas costs and optimize if necessary

## Troubleshooting

Common issues and solutions:

1. **"Transaction Failed"**: Check gas limits and MON balance
2. **"Network Error"**: Verify Monad RPC endpoints are working
3. **"Insufficient Balance"**: Ensure contract has enough MON for payouts
4. **"Not Eligible"**: Check reward allocation and timing

## Support

For deployment support:
- Check Monad documentation
- Join Monad developer Discord
- Review contract events for debugging
- Use blockchain explorers for transaction verification