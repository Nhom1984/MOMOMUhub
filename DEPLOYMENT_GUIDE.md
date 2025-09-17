# MEMOMUhub Smart Contract Deployment Guide

This guide explains how to deploy and configure the MEMOMUhub smart contract for the Monad blockchain.

## Prerequisites

- Node.js and npm installed
- Hardhat development environment
- Monad testnet/mainnet RPC endpoint
- Private key with sufficient MON tokens for deployment

## Installation

1. Install Hardhat and dependencies:
```bash
npm install --save-dev hardhat
npm install --save-dev @nomicfoundation/hardhat-toolbox
npm install --save-dev @nomiclabs/hardhat-ethers
npm install ethers
```

2. Initialize Hardhat project:
```bash
npx hardhat init
```

## Configuration

Create or update `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "your-private-key-here";
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://rpc.monad.com";

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
      url: MONAD_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 9000, // Monad chain ID
      gasPrice: "auto"
    }
  }
};
```

## Deployment

1. Copy the contract file:
```bash
cp contracts/MEMOMUhub.sol contracts/
```

2. Create deployment script `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying MEMOMUhub contract...");
  
  const MEMOMUhub = await hre.ethers.getContractFactory("MEMOMUhub");
  const memomuhub = await MEMOMUhub.deploy();
  
  await memomuhub.deployed();
  
  console.log("MEMOMUhub deployed to:", memomuhub.address);
  console.log("Deployment transaction:", memomuhub.deployTransaction.hash);
  
  // Verify contract (optional)
  if (hre.network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await memomuhub.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: memomuhub.address,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

3. Deploy to Monad:
```bash
npx hardhat run scripts/deploy.js --network monad
```

## Frontend Configuration

After deployment, update the contract address in `blockchain.js`:

```javascript
const CONTRACT_CONFIG = {
    address: "0x....", // Replace with deployed contract address
    network: "monad",
    chainId: 0x2328, // 9000 in hex
};
```

## Contract Management

### Weekly Reward Distribution

The contract owner needs to call distribution functions weekly:

```javascript
// For weekly tournaments (after Sunday 20:00 UTC)
await contract.distributeWeeklyRewards(gameMode, buyInAmount, weekNumber);

// For battle tournaments
await contract.distributeBattleRewards(weekNumber);
```

### Leaderboard Updates

Game scores need to be updated via owner calls:

```javascript
// Update weekly tournament leaderboard
await contract.updateWeeklyLeaderboard(gameMode, buyInAmount, playerAddress, score);

// Battle completion (automatic payout)
await contract.completeBattle(winnerAddress, loserAddress);
```

## Monitoring

### Events to Monitor

- `BuyIn`: Player enters tournament
- `BattleEntry`: Battle entry and completion
- `MonluckPayout`: MONLUCK instant payout
- `WeeklyRewardsDistributed`: Weekly tournament rewards
- `BattleRewardsDistributed`: Weekly battle rewards
- `Withdrawal`: Player withdraws winnings

### Contract State

Monitor treasury balances and pending withdrawals:

```javascript
// Check tournament treasury
const tournamentInfo = await contract.getTournamentInfo(gameMode, buyInAmount, week);

// Check player withdrawal balance
const pendingAmount = await contract.getPendingWithdrawal(playerAddress);
```

## Security Considerations

1. **Owner Key Security**: Keep the contract owner private key secure
2. **Multi-sig**: Consider using a multi-sig wallet for owner functions
3. **Timelock**: Implement timelock for critical owner functions
4. **Regular Audits**: Audit the contract before mainnet deployment
5. **Emergency Functions**: Test emergency withdrawal functionality

## Gas Optimization

- Buy-in: ~150,000 gas
- MONLUCK play: ~120,000 gas
- Battle entry: ~100,000 gas
- Withdrawal: ~100,000 gas
- Leaderboard update: ~80,000 gas

## Testing

Run comprehensive tests before deployment:

```bash
npx hardhat test
npx hardhat coverage
```

Test all game modes, edge cases, and failure scenarios.

## Maintenance

### Weekly Tasks (Automated)
1. Distribute weekly tournament rewards (Sunday 20:00 UTC)
2. Distribute battle tournament rewards
3. Reset weekly leaderboards
4. Monitor contract balance and gas usage

### Monthly Tasks
1. Review contract security
2. Check for any stuck funds
3. Update documentation
4. Community feedback integration

## Support

For technical support or questions:
- GitHub Issues: [Repository URL]
- Discord: [Community Discord]
- Email: [Support Email]