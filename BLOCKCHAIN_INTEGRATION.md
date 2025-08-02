# MetaMask Blockchain Integration

This document explains the MetaMask wallet integration added to the MEMOMU game.

## Features

### 🔗 Wallet Connection
- **Connect Wallet Button**: Located above the sound button in both main menu and modes menu
- **MetaMask Integration**: Direct connection to MetaMask using `window.ethereum`
- **Connection Status**: Visual indicator showing wallet connection state
- **Error Handling**: Graceful handling for users without MetaMask installed

### 🏆 Enhanced Leaderboard
- **Wallet Address Display**: Shows connected wallet address next to player names
- **Blockchain Verification**: Players with connected wallets have their addresses stored with scores
- **Backwards Compatibility**: Players without connected wallets still appear normally on leaderboard

### 🎮 User Experience
- **Non-Intrusive**: Players can play normally without connecting a wallet
- **Optional Feature**: Wallet connection is completely optional
- **Persistent State**: Wallet connection persists across game sessions

## Technical Implementation

### State Management
```javascript
let walletConnection = {
  isConnected: false,    // Connection status
  address: null,         // User's wallet address
  provider: null         // MetaMask provider object
};
```

### Connection Flow
1. User clicks "Connect Wallet" button
2. System checks for MetaMask installation
3. If available, requests account access via MetaMask popup
4. On approval, stores wallet address and sets up event listeners
5. Updates UI to show connection status

### Leaderboard Integration
- High scores now include `walletAddress` field
- Leaderboard displays shortened addresses (0x1234...abcd format)
- Entries without wallet addresses show empty wallet column

### Error Handling
- **No MetaMask**: Shows informative message, allows continued play
- **User Rejection**: Handles rejection gracefully, no interruption to gameplay
- **Network Errors**: Provides fallback behavior

## Browser Compatibility

- **Required**: Modern browsers with JavaScript support
- **MetaMask**: Optional - enhances experience but not required
- **Mobile**: Compatible with MetaMask mobile app

## Security Considerations

- **No Private Keys**: Only uses wallet addresses for display
- **No Transactions**: Does not initiate any blockchain transactions
- **Read-Only**: Only reads wallet address, no write operations
- **Local Storage**: Wallet addresses stored only in browser localStorage

## Future Enhancements

Potential future additions could include:
- NFT integration for special achievements
- On-chain score verification
- Blockchain-based tournaments
- Web3 social features

## Usage

1. **Install MetaMask**: Download from [metamask.io](https://metamask.io)
2. **Connect Wallet**: Click "Connect Wallet" button in game
3. **Play Games**: Achieve high scores while connected
4. **View Leaderboard**: See your wallet address next to your name

The integration is designed to be lightweight and optional, ensuring the game remains accessible to all players regardless of their blockchain experience.