/**
 * Blockchain integration for MEMOMUhub
 * Handles all smart contract interactions using ethers.js
 */

// Contract configuration
const CONTRACT_CONFIG = {
    // Will be updated after deployment
    address: "0x0000000000000000000000000000000000000000", // Placeholder
    abi: [
        // Contract ABI will be added here after compilation
        // For now, we'll define the main function signatures
        "function placeBuyIn(uint8 gameMode, uint256 buyInAmount) external payable",
        "function playMonluck(uint256 wager, uint256 monadsFound) external payable",
        "function enterBattle() external payable",
        "function claimWeeklyReward(uint8 gameMode, uint256 buyInAmount, uint256 weekId) external",
        "function claimBattleReward(uint256 weekId) external",
        "function isEligibleForReward(uint8 gameMode, uint256 buyInAmount, uint256 weekId, address player) external view returns (bool, uint256)",
        "function isEligibleForBattleReward(uint256 weekId, address player) external view returns (bool, uint256)",
        "function getCurrentWeekId() external view returns (uint256)",
        "function getTreasuryBalance(uint8 gameMode, uint256 buyInAmount) external view returns (uint256)",
        "event BuyInPlaced(address indexed player, uint8 gameMode, uint256 buyInAmount)",
        "event MonluckPayout(address indexed player, uint256 wager, uint256 payout, uint256 monadsFound)",
        "event BattleCompleted(address indexed winner, address indexed loser, uint256 payout)",
        "event RewardClaimed(address indexed player, uint8 gameMode, uint256 buyInAmount, uint256 amount)"
    ]
};

// Game mode mappings
const GAME_MODES = {
    MUSIC_MEMORY: 0,
    CLASSIC_MEMORY: 1,
    MEMOMOMU: 2,
    MONLUCK: 3,
    BATTLE: 4
};

// Buy-in amounts in ETH
const BUY_IN_AMOUNTS = {
    SMALL: "0.1", // 0.1 MON
    LARGE: "1.0"  // 1 MON
};

// Blockchain state
let blockchainState = {
    provider: null,
    signer: null,
    contract: null,
    isConnected: false,
    network: null
};

/**
 * Initialize blockchain connection
 */
async function initBlockchain() {
    try {
        if (!window.ethereum) {
            console.warn('MetaMask not detected');
            return false;
        }

        // Create provider and check network
        blockchainState.provider = new ethers.providers.Web3Provider(window.ethereum);
        blockchainState.network = await blockchainState.provider.getNetwork();
        
        console.log('Connected to network:', blockchainState.network);
        
        // For now, we'll work with any network for testing
        // In production, you'd check for Monad network specifically
        
        return true;
    } catch (error) {
        console.error('Error initializing blockchain:', error);
        return false;
    }
}

/**
 * Connect wallet and initialize contract
 */
async function connectBlockchain() {
    try {
        if (!blockchainState.provider) {
            const initialized = await initBlockchain();
            if (!initialized) return false;
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Get signer
        blockchainState.signer = blockchainState.provider.getSigner();
        
        // Initialize contract (placeholder address for now)
        if (CONTRACT_CONFIG.address !== "0x0000000000000000000000000000000000000000") {
            blockchainState.contract = new ethers.Contract(
                CONTRACT_CONFIG.address,
                CONTRACT_CONFIG.abi,
                blockchainState.signer
            );
        }
        
        blockchainState.isConnected = true;
        console.log('Blockchain connected successfully');
        return true;
    } catch (error) {
        console.error('Error connecting to blockchain:', error);
        return false;
    }
}

/**
 * Place buy-in for memory games
 */
async function placeBuyIn(gameMode, buyInAmount) {
    try {
        if (!blockchainState.contract) {
            throw new Error('Contract not initialized');
        }

        const gameModeId = GAME_MODES[gameMode];
        const amountWei = ethers.utils.parseEther(buyInAmount.toString());

        console.log(`Placing buy-in for ${gameMode}: ${buyInAmount} MON`);
        
        const tx = await blockchainState.contract.placeBuyIn(gameModeId, amountWei, {
            value: amountWei,
            gasLimit: 100000 // Adjust as needed
        });

        console.log('Transaction submitted:', tx.hash);
        const receipt = await tx.wait();
        console.log('Buy-in successful:', receipt);
        
        return { success: true, txHash: tx.hash };
    } catch (error) {
        console.error('Error placing buy-in:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Play MONLUCK game
 */
async function playMonluck(wager, monadsFound) {
    try {
        if (!blockchainState.contract) {
            throw new Error('Contract not initialized');
        }

        const wagerWei = ethers.utils.parseEther(wager.toString());

        console.log(`Playing MONLUCK: wager ${wager} MON, found ${monadsFound} monads`);
        
        const tx = await blockchainState.contract.playMonluck(wagerWei, monadsFound, {
            value: wagerWei,
            gasLimit: 150000
        });

        console.log('MONLUCK transaction submitted:', tx.hash);
        const receipt = await tx.wait();
        
        // Check for payout event
        const payoutEvent = receipt.events?.find(event => event.event === 'MonluckPayout');
        let payout = 0;
        if (payoutEvent) {
            payout = ethers.utils.formatEther(payoutEvent.args.payout);
            console.log(`MONLUCK payout: ${payout} MON`);
        }
        
        return { success: true, txHash: tx.hash, payout };
    } catch (error) {
        console.error('Error playing MONLUCK:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enter battle mode
 */
async function enterBattle() {
    try {
        if (!blockchainState.contract) {
            throw new Error('Contract not initialized');
        }

        const battleFee = ethers.utils.parseEther("1"); // 1 MON

        console.log('Entering battle mode...');
        
        const tx = await blockchainState.contract.enterBattle({
            value: battleFee,
            gasLimit: 100000
        });

        console.log('Battle entry transaction submitted:', tx.hash);
        const receipt = await tx.wait();
        console.log('Battle entry successful:', receipt);
        
        return { success: true, txHash: tx.hash };
    } catch (error) {
        console.error('Error entering battle:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Claim weekly rewards for memory games
 */
async function claimWeeklyReward(gameMode, buyInAmount, weekId) {
    try {
        if (!blockchainState.contract) {
            throw new Error('Contract not initialized');
        }

        const gameModeId = GAME_MODES[gameMode];
        const amountWei = ethers.utils.parseEther(buyInAmount.toString());

        console.log(`Claiming weekly reward for ${gameMode}, week ${weekId}`);
        
        const tx = await blockchainState.contract.claimWeeklyReward(gameModeId, amountWei, weekId, {
            gasLimit: 100000
        });

        console.log('Claim transaction submitted:', tx.hash);
        const receipt = await tx.wait();
        
        // Check for reward claimed event
        const claimEvent = receipt.events?.find(event => event.event === 'RewardClaimed');
        let amount = 0;
        if (claimEvent) {
            amount = ethers.utils.formatEther(claimEvent.args.amount);
            console.log(`Reward claimed: ${amount} MON`);
        }
        
        return { success: true, txHash: tx.hash, amount };
    } catch (error) {
        console.error('Error claiming weekly reward:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Claim battle weekly rewards
 */
async function claimBattleReward(weekId) {
    try {
        if (!blockchainState.contract) {
            throw new Error('Contract not initialized');
        }

        console.log(`Claiming battle reward for week ${weekId}`);
        
        const tx = await blockchainState.contract.claimBattleReward(weekId, {
            gasLimit: 100000
        });

        console.log('Battle claim transaction submitted:', tx.hash);
        const receipt = await tx.wait();
        
        const claimEvent = receipt.events?.find(event => event.event === 'BattleRewardClaimed');
        let amount = 0;
        if (claimEvent) {
            amount = ethers.utils.formatEther(claimEvent.args.amount);
            console.log(`Battle reward claimed: ${amount} MON`);
        }
        
        return { success: true, txHash: tx.hash, amount };
    } catch (error) {
        console.error('Error claiming battle reward:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if player is eligible for rewards
 */
async function checkRewardEligibility(gameMode, buyInAmount, weekId, playerAddress) {
    try {
        if (!blockchainState.contract) {
            throw new Error('Contract not initialized');
        }

        const gameModeId = GAME_MODES[gameMode];
        const amountWei = ethers.utils.parseEther(buyInAmount.toString());

        const [isEligible, amount] = await blockchainState.contract.isEligibleForReward(
            gameModeId, amountWei, weekId, playerAddress
        );

        return {
            isEligible,
            amount: isEligible ? ethers.utils.formatEther(amount) : "0"
        };
    } catch (error) {
        console.error('Error checking reward eligibility:', error);
        return { isEligible: false, amount: "0" };
    }
}

/**
 * Check battle reward eligibility
 */
async function checkBattleRewardEligibility(weekId, playerAddress) {
    try {
        if (!blockchainState.contract) {
            throw new Error('Contract not initialized');
        }

        const [isEligible, amount] = await blockchainState.contract.isEligibleForBattleReward(
            weekId, playerAddress
        );

        return {
            isEligible,
            amount: isEligible ? ethers.utils.formatEther(amount) : "0"
        };
    } catch (error) {
        console.error('Error checking battle reward eligibility:', error);
        return { isEligible: false, amount: "0" };
    }
}

/**
 * Get current week ID
 */
async function getCurrentWeekId() {
    try {
        if (!blockchainState.contract) {
            return 0;
        }

        const weekId = await blockchainState.contract.getCurrentWeekId();
        return weekId.toNumber();
    } catch (error) {
        console.error('Error getting current week ID:', error);
        return 0;
    }
}

/**
 * Get treasury balance for a game mode
 */
async function getTreasuryBalance(gameMode, buyInAmount) {
    try {
        if (!blockchainState.contract) {
            return "0";
        }

        const gameModeId = GAME_MODES[gameMode];
        const amountWei = ethers.utils.parseEther(buyInAmount.toString());

        const balance = await blockchainState.contract.getTreasuryBalance(gameModeId, amountWei);
        return ethers.utils.formatEther(balance);
    } catch (error) {
        console.error('Error getting treasury balance:', error);
        return "0";
    }
}

/**
 * Format MON amount for display
 */
function formatMON(amount, decimals = 4) {
    return `${parseFloat(amount).toFixed(decimals)} MON`;
}

/**
 * Show transaction status to user
 */
function showTransactionStatus(message, type = 'info') {
    // This will be integrated with the game UI
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // For now, just use alert - will be replaced with proper UI
    if (type === 'error') {
        alert(`Error: ${message}`);
    } else if (type === 'success') {
        alert(`Success: ${message}`);
    }
}

// Export functions for use in game
export {
    initBlockchain,
    connectBlockchain,
    placeBuyIn,
    playMonluck,
    enterBattle,
    claimWeeklyReward,
    claimBattleReward,
    checkRewardEligibility,
    checkBattleRewardEligibility,
    getCurrentWeekId,
    getTreasuryBalance,
    formatMON,
    showTransactionStatus,
    GAME_MODES,
    BUY_IN_AMOUNTS,
    blockchainState
};