# Monad Blockchain Pay-to-Play Deployment Guide

This guide explains how to deploy the GamePayToPlay smart contract to Monad Testnet and configure the MEMOMU game for pay-to-play functionality.

## Prerequisites

1. **MetaMask Wallet**: Install MetaMask browser extension
2. **Monad Testnet Configuration**: Add Monad Testnet to MetaMask
3. **Test MON Tokens**: Get testnet MON tokens for deployment and testing

## Step 1: Add Monad Testnet to MetaMask

Add the following network configuration to MetaMask:

- **Network Name**: Monad Testnet
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Chain ID**: 145 (0x91 in hex)
- **Currency Symbol**: MON
- **Block Explorer URL**: https://testnet-explorer.monad.xyz

## Step 2: Get Test MON Tokens

1. Visit the Monad Testnet faucet (check Monad documentation for current faucet URL)
2. Request test MON tokens for your wallet address
3. Ensure you have at least 0.1 MON for deployment and testing

## Step 3: Deploy the Smart Contract

### Option A: Using Remix IDE (Recommended for beginners)

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file called `GamePayToPlay.sol`
3. Copy the contract code from `GamePayToPlay.sol` in this repository
4. Compile the contract:
   - Select Solidity compiler version 0.8.0 or higher
   - Click "Compile GamePayToPlay.sol"
5. Deploy the contract:
   - Go to "Deploy & Run Transactions" tab
   - Select "Injected Provider - MetaMask" as environment
   - Ensure MetaMask is connected to Monad Testnet
   - Click "Deploy"
   - Confirm the transaction in MetaMask
6. **Save the contract address** - you'll need it for the game configuration

### Option B: Using Hardhat/Truffle

1. Install dependencies:
   ```bash
   npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
   ```

2. Configure `hardhat.config.js`:
   ```javascript
   require("@nomiclabs/hardhat-ethers");
   
   module.exports = {
     solidity: "0.8.0",
     networks: {
       monadTestnet: {
         url: "https://testnet-rpc.monad.xyz",
         chainId: 145,
         accounts: ["YOUR_PRIVATE_KEY_HERE"] // Use environment variables in production
       }
     }
   };
   ```

3. Create deployment script in `scripts/deploy.js`:
   ```javascript
   async function main() {
     const GamePayToPlay = await ethers.getContractFactory("GamePayToPlay");
     const game = await GamePayToPlay.deploy();
     await game.deployed();
     console.log("GamePayToPlay deployed to:", game.address);
   }
   
   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

4. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network monadTestnet
   ```

## Step 4: Configure the Game

1. Open `memomu.js` in your project
2. Find the `MONAD_CONFIG` section (around line 200)
3. Update the contract address:
   ```javascript
   const MONAD_CONFIG = {
     chainId: '0x91', // 145 in hex
     rpcUrl: 'https://testnet-rpc.monad.xyz',
     currency: 'MON',
     explorerUrl: 'https://testnet-explorer.monad.xyz',
     contractAddress: 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE' // Replace with actual address
   };
   ```

## Step 5: Test the Integration

1. Open the MEMOMU game in your browser
2. Connect your MetaMask wallet
3. Ensure you're on Monad Testnet
4. Try to start a game - you should be prompted to pay 0.01 MON
5. Confirm the transaction in MetaMask
6. Game should start after successful payment

## Contract Functions

The deployed contract provides these functions:

- `payToPlay()`: Pay 0.01 MON to unlock game session (payable)
- `getPlayerPayments(address)`: View total payments by a player
- `getPlayerGameCount(address)`: View total games played by a player
- `getBalance()`: View contract balance
- `withdraw()`: Owner only - withdraw collected funds

## Security Notes

1. **Testnet Only**: This configuration is for Monad Testnet only
2. **Smart Contract Risk**: Smart contracts are immutable once deployed - test thoroughly
3. **Private Keys**: Never share private keys or commit them to version control
4. **Gas Fees**: Transactions require MON tokens for gas fees

## Troubleshooting

### MetaMask Connection Issues
- Ensure MetaMask is unlocked and connected to Monad Testnet
- Check that you have sufficient MON balance for gas fees
- Try refreshing the page if connection fails

### Transaction Failures
- Insufficient MON balance: Get more tokens from faucet
- Wrong network: Switch to Monad Testnet in MetaMask
- Gas limit too low: Increase gas limit in MetaMask advanced settings

### Contract Not Responding
- Verify contract address is correct in `memomu.js`
- Check that contract is deployed on Monad Testnet
- Ensure you're connected to the correct network

## Support

For technical support:
1. Check the browser console for error messages
2. Verify network configuration matches exactly
3. Ensure all prerequisites are met
4. Check Monad documentation for any network updates

## Contract Verification (Optional)

To verify your contract on Monad Testnet explorer:
1. Go to https://testnet-explorer.monad.xyz
2. Search for your contract address
3. Go to "Contract" tab and click "Verify and Publish"
4. Select compiler version and paste your contract code
5. Submit for verification

This makes your contract source code publicly viewable and builds trust with users.