# MEMOMUModesTreasury Smart Contract

## Overview

The MEMOMUModesTreasury contract is a comprehensive treasury management system for the MEMOMU gaming platform, designed to handle five distinct game modes with differentiated payout strategies optimized for the Monad blockchain.

## Game Modes & Treasury Logic

### Direct Treasury Games (Classic, MEMOMU, Music)
- **Buy-ins**: Routed directly to configured treasury wallet addresses
- **Weekly Tournaments**: Leaderboard-based reward distribution
- **Payout Schedule**: Sunday 20:00 UTC via `publishWeeklyWinners`
- **Reward Split**: Top 5 players get 50%, 25%, 15%, 7%, 3% of 90% of treasury

### Contract-Managed Games (MONLUCK, Battle)
- **Buy-ins**: Held in contract for instant payouts
- **MONLUCK**: Immediate payout based on monad count (1.5x to 10x multipliers)
- **Battle**: Winner gets 1.5 MON instantly, 0.4 MON goes to weekly battle treasury
- **Weekly Battle**: Top 3 players get 50%, 30%, 20% of accumulated treasury

## Key Features

### 🔒 Security
- **Reentrancy Protection**: All external functions protected against reentrancy attacks
- **Access Control**: Owner-only administrative functions with proper validation
- **Safe Arithmetic**: Overflow/underflow protection built-in
- **Input Validation**: Comprehensive parameter checking on all functions

### ⛽ Gas Optimization
- **Packed Structs**: Efficient storage layout using uint128/uint64/uint32 types
- **Minimal Storage**: Hot path functions minimize storage operations
- **Event Indexing**: Optimized for off-chain querying and analysis
- **Loop Optimization**: Bounded loops with early termination conditions

### 💰 Treasury Management
- **Updatable Addresses**: Treasury wallets and MON token address can be updated by owner
- **Withdrawal Restrictions**: Owner can only withdraw after all weekly rewards are claimed
- **Emergency Functions**: Contract recovery mechanisms for extreme circumstances
- **Balance Tracking**: Comprehensive tracking of all funds and pending withdrawals

## Contract Functions

### Administrative Functions (Owner Only)
```solidity
function updateTreasuryWallet(GameMode gameMode, address newWallet) external onlyOwner
function updateMonTokenAddress(address newTokenAddress) external onlyOwner
function publishWeeklyWinners(GameMode gameMode, uint256 week, address[] winners, uint256[] scores) external onlyOwner
function processBattleResult(address winner, address loser) external onlyOwner
function ownerWithdrawLeftover(uint256 amount) external onlyOwner
function emergencyWithdraw() external onlyOwner
```

### Player Functions
```solidity
function processWeeklyGameBuyIn(GameMode gameMode, uint256 amount) external
function playMonluck(uint256 wagerAmount, uint256 monadsHit) external
function claimWeeklyReward(GameMode gameMode, uint256 week) external
function withdrawPendingBalance() external
```

### View Functions
```solidity
function getCurrentWeek() public view returns (uint256)
function getWeeklyTournament(GameMode gameMode, uint256 week) external view returns (WeeklyTournament)
function getWeeklyWinners(GameMode gameMode, uint256 week) external view returns (address[], uint256[])
function getPendingWithdrawal(address player) external view returns (uint256)
function getContractBalance() external view returns (uint256)
```

## Deployment Instructions

### Prerequisites
1. Configure `hardhat.config.js` with Monad testnet settings
2. Set up private key and RPC URL environment variables
3. Update MON token address in deployment script

### Deploy to Monad Testnet
```bash
# Install dependencies
npm install

# Deploy treasury contract
npm run deploy:treasury:monad

# The deployment script will output the contract address and setup instructions
```

### Post-Deployment Setup
1. **Update Treasury Wallets**:
   ```javascript
   await contract.updateTreasuryWallet(0, "0x..."); // Classic
   await contract.updateTreasuryWallet(1, "0x..."); // MEMOMU  
   await contract.updateTreasuryWallet(2, "0x..."); // Music
   ```

2. **Update Frontend Configuration**:
   ```javascript
   // In blockchain.js
   const CONTRACT_CONFIG = {
       address: "0x...", // Deployed contract address
       network: "monad",
       chainId: 0x2328,
   };
   ```

3. **Configure Backend Integration**:
   - Set up weekly winner publishing automation
   - Configure battle result processing
   - Implement game score validation

## Game Integration Examples

### Weekly Tournament Buy-In (Classic/MEMOMU/Music)
```javascript
// Player buys into Classic Memory tournament
await contract.processWeeklyGameBuyIn(0, ethers.utils.parseEther("1.0"));
```

### MONLUCK Play
```javascript
// Player wagers 0.5 MON and hits 4 monads (5x multiplier)
await contract.playMonluck(ethers.utils.parseEther("0.5"), 4);
// Player automatically receives 2.5 MON in pending withdrawals
```

### Battle Processing
```javascript
// Owner processes battle buy-ins
await contract.processBattleBuyIns(player1Address, player2Address);

// Owner declares winner after game completion
await contract.processBattleResult(winnerAddress, loserAddress);
// Winner automatically receives 1.5 MON in pending withdrawals
```

### Weekly Winners Publication
```javascript
// Owner publishes weekly winners (called at Sunday 20:00 UTC)
await contract.publishWeeklyWinners(
    0, // Classic mode
    currentWeek,
    [winner1, winner2, winner3, winner4, winner5],
    [score1, score2, score3, score4, score5]
);
```

### Reward Claiming
```javascript
// Player claims weekly tournament reward
await contract.claimWeeklyReward(0, weekNumber);

// Player withdraws pending balance from instant payout games
await contract.withdrawPendingBalance();
```

## Security Considerations

### Owner Key Management
- Use a hardware wallet or multi-sig for the owner account
- Consider implementing a timelock for critical functions
- Regular security audits recommended before mainnet deployment

### Treasury Wallet Security
- Use separate secure wallets for each game mode treasury
- Implement proper backup and recovery procedures
- Monitor treasury balances regularly

### Contract Monitoring
- Set up event monitoring for all major functions
- Track weekly tournament completion and reward distribution
- Monitor contract balance and pending withdrawals

## Testing

### Unit Tests
```bash
# Run comprehensive test suite
npm run test

# Run with coverage report
npx hardhat coverage
```

### Integration Testing
1. Test all game mode buy-in flows
2. Verify weekly winner publication and reward claiming
3. Test instant payout mechanics for MONLUCK and Battle
4. Validate owner withdrawal restrictions

## Gas Usage Estimates

| Function | Estimated Gas |
|----------|---------------|
| processWeeklyGameBuyIn | ~80,000 |
| playMonluck | ~90,000 |
| processBattleResult | ~100,000 |
| publishWeeklyWinners | ~120,000 |
| claimWeeklyReward | ~85,000 |
| withdrawPendingBalance | ~65,000 |

## Emergency Procedures

### Contract Pausing
If critical issues are discovered:
1. Use `emergencyWithdraw()` to recover all funds
2. Deploy updated contract version
3. Migrate treasury configurations

### Stuck Funds Recovery
If players cannot withdraw rewards:
1. Verify winner publication was completed
2. Check individual reward claim status
3. Use emergency functions if necessary

## Support & Maintenance

### Weekly Tasks (Automated)
- Monitor tournament end times
- Publish weekly winners via backend automation
- Verify reward distribution completion

### Monthly Reviews
- Audit contract balance and treasury distributions
- Review security and performance metrics
- Update documentation and procedures

For technical support or questions:
- GitHub Issues: [Repository URL]
- Documentation: This README and inline contract comments
- Contact: Nhom1984 development team