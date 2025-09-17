# MEMOMUhub - Blockchain Gaming Platform

MEMOMUhub is a blockchain-powered gaming platform featuring memory games, MONLUCK, and battle modes with real MON token rewards on the Monad network.

## 🎮 Game Modes

### Dual Play System
- **Play on MONAD** 🔗: Blockchain mode with real MON token buy-ins and rewards
- **Play FREE** 🆓: Traditional mode with leaderboards (no tokens required)

### Available Games

#### 🎵 Memory Games (Weekly Tournaments)
- **Music Memory**: Audio-visual memory sequences
- **Classic Memory**: Traditional matching pairs
- **MEMOMU Memory**: Advanced pattern matching

**Tournament System:**
- Buy-in: 0.1 MON or 1.0 MON
- Weekly competitions (Monday-Sunday)
- Top 5 players split 90% of treasury: 50%/25%/15%/7%/3%
- Rewards distributed Sunday 20:00 UTC
- Withdraw winnings before next week's deadline

#### 🎲 MONLUCK (Instant Payouts)
- Wager: 0.1 - 2.0 MON
- Find monad.png tiles to win
- Instant multiplier payouts:
  - 2 monads = 1.5x
  - 3 monads = 2.4x  
  - 4 monads = 5x
  - 5 monads = 10x

#### ⚔️ Battle Mode
- Entry: 1.0 MON per player
- Winner gets 1.5 MON instantly
- 0.4 MON goes to weekly battle treasury
- Top 3 battlers each week split treasury: 50%/30%/20%

## 🔗 Blockchain Integration

### Wallet Connection
- Supports MetaMask and WalletConnect
- Connect wallet to access MONAD mode features
- View connection status in bottom-right corner

### Smart Contract Features
- Separate treasuries per game mode and buy-in amount
- Automatic weekly reward distribution
- Secure withdrawal system with deadlines
- Battle win tracking and leaderboards

### Treasury Distribution
- **Weekly Games**: Sunday 20:00 UTC automatic distribution
- **Battle**: Weekly distribution to top 3 players
- **MONLUCK**: Instant payouts upon game completion

## 🚀 Getting Started

### For Players
1. Visit the game at [your-domain.com]
2. Choose "Play FREE" for traditional gameplay
3. Or "Play on MONAD" for blockchain features:
   - Connect your MetaMask/WalletConnect wallet
   - Ensure you have MON tokens for buy-ins
   - Select your preferred game mode and buy-in amount

### Withdrawal Process
1. Play games and earn rewards
2. Go to LEADERBOARD page
3. Click "WITHDRAW" button (appears when you have winnings)
4. Confirm transaction in your wallet

## 🛠️ Development

### Smart Contract Deployment
1. Install dependencies: `npm install`
2. Configure `hardhat.config.js` with your private key
3. Deploy: `npm run deploy:monad`
4. Update contract address in `blockchain.js`

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

### File Structure
```
├── contracts/           # Solidity smart contracts
├── scripts/            # Deployment scripts
├── blockchain.js       # Frontend Web3 integration
├── memomu.js          # Game logic
├── leaderboard.js     # Leaderboard system
├── index.html         # Main game interface
└── style.css          # Styling
```

## 💡 Features

### Security
- Non-custodial: Players control their own wallets
- Automated payouts reduce manual intervention
- Emergency withdrawal functions for contract owner
- Withdrawal deadlines prevent indefinite fund locking

### User Experience
- Seamless integration with existing game
- Clear visual indicators for wallet status and mode
- Real-time balance updates
- Instant payouts for eligible games

### Economics
- Fair reward distribution weighted by treasury contributions
- 10% platform fee for development and maintenance
- Anti-manipulation through on-chain score verification

## 🔧 Configuration

### Contract Settings
- `BUY_IN_LOW`: 0.1 MON
- `BUY_IN_HIGH`: 1.0 MON
- `BATTLE_BUY_IN`: 1.0 MON
- Weekly periods: Monday 00:00 - Sunday 20:00 UTC

### Network
- **Chain**: Monad (Chain ID: 9000)
- **RPC**: https://rpc.monad.com
- **Currency**: MON

## 📞 Support

- **GitHub**: [Repository Issues](https://github.com/Nhom1984/MOMOMUhub/issues)
- **Documentation**: See DEPLOYMENT_GUIDE.md for technical details

## 📜 License

© 2025 Nhom1984. All rights reserved.

---

*Play responsibly. Only wager what you can afford to lose.*