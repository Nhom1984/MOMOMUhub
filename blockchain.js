/**
 * Blockchain integration for MEMOMU game using ethers.js
 * Handles all smart contract interactions for pay-to-play functionality
 */

// Contract configuration
const CONTRACT_CONFIG = {
    // TODO: Update with actual deployed contract address
    address: "0x0000000000000000000000000000000000000000", // Placeholder
    network: "monad", // Monad network
    chainId: 0x2328, // Monad chain ID (9000)
};

// Contract ABI (Application Binary Interface)
const CONTRACT_ABI = [
    // Game mode enum (0: MusicMemory, 1: ClassicMemory, 2: MEMOMU, 3: Monluck, 4: Battle)
    
    // Buy-in functions
    "function buyInWeeklyGame(uint8 gameMode, uint256 buyInAmount) external payable",
    "function enterBattle() external payable",
    "function playMonluck(uint256 monads) external payable",
    
    // View functions
    "function getCurrentWeek() external view returns (uint256)",
    "function getPendingWithdrawal(address player) external view returns (uint256)",
    "function getTournamentInfo(uint8 gameMode, uint256 buyInAmount, uint256 week) external view returns (uint256 treasury, uint256 endTime, address[5] topPlayers, uint256[5] topScores, bool distributed, uint256 withdrawDeadline)",
    
    // Withdrawal
    "function withdraw() external",
    
    // Constants
    "function BUY_IN_LOW() external view returns (uint256)",
    "function BUY_IN_HIGH() external view returns (uint256)",
    "function BATTLE_BUY_IN() external view returns (uint256)",
    
    // Events
    "event BuyIn(address indexed player, uint8 gameMode, uint256 buyInAmount, uint256 week)",
    "event BattleEntry(address indexed player1, address indexed player2, address indexed winner, uint256 winnings)",
    "event MonluckPayout(address indexed player, uint256 wager, uint256 monads, uint256 payout)",
    "event Withdrawal(address indexed player, uint256 amount)"
];

// Blockchain state management
let blockchain = {
    connected: false,
    provider: null,
    signer: null,
    contract: null,
    userAddress: null,
    network: null
};

// Game mode mapping
const GAME_MODES = {
    "musicMemory": 0,
    "memoryClassic": 1, 
    "memoryMemomu": 2,
    "monluck": 3,
    "battle": 4
};

// Buy-in amounts in ETH
const BUY_IN_AMOUNTS = {
    LOW: "0.1",
    HIGH: "1.0",
    BATTLE: "1.0"
};

/**
 * Initialize blockchain connection
 * @returns {Promise<boolean>} Success status
 */
async function initializeBlockchain() {
    try {
        // Check if wallet is connected
        if (!walletConnection.isConnected || !walletConnection.provider) {
            console.log("Wallet not connected, blockchain features disabled");
            return false;
        }

        // Initialize ethers provider
        if (typeof window.ethereum !== 'undefined') {
            blockchain.provider = new ethers.providers.Web3Provider(window.ethereum);
            blockchain.signer = blockchain.provider.getSigner();
            blockchain.userAddress = await blockchain.signer.getAddress();
            
            // Get network info
            blockchain.network = await blockchain.provider.getNetwork();
            
            // Initialize contract
            blockchain.contract = new ethers.Contract(
                CONTRACT_CONFIG.address,
                CONTRACT_ABI,
                blockchain.signer
            );
            
            blockchain.connected = true;
            console.log("Blockchain initialized successfully");
            console.log("Network:", blockchain.network.name, "Chain ID:", blockchain.network.chainId);
            console.log("User address:", blockchain.userAddress);
            
            return true;
        } else {
            console.error("Ethereum provider not found");
            return false;
        }
    } catch (error) {
        console.error("Failed to initialize blockchain:", error);
        blockchain.connected = false;
        return false;
    }
}

/**
 * Check if blockchain features are available
 * @returns {boolean} True if blockchain is ready
 */
function isBlockchainReady() {
    return blockchain.connected && blockchain.contract && walletConnection.isConnected;
}

/**
 * Handle buy-in for weekly tournament games
 * @param {string} gameMode - Game mode (musicMemory, memoryClassic, memoryMemomu)
 * @param {string} buyInAmount - Buy-in amount ("0.1" or "1.0")
 * @returns {Promise<boolean>} Success status
 */
async function handleWeeklyGameBuyIn(gameMode, buyInAmount) {
    if (!isBlockchainReady()) {
        alert("Please connect your wallet first");
        return false;
    }

    try {
        const gameModeId = GAME_MODES[gameMode];
        if (gameModeId === undefined || gameModeId > 2) {
            throw new Error("Invalid game mode for weekly tournament");
        }

        const buyInWei = ethers.utils.parseEther(buyInAmount);
        
        console.log(`Buying into ${gameMode} with ${buyInAmount} MON`);
        
        // Show loading indicator
        showBlockchainLoading("Processing buy-in...");
        
        // Execute transaction
        const tx = await blockchain.contract.buyInWeeklyGame(gameModeId, buyInWei, {
            value: buyInWei,
            gasLimit: 150000 // Estimated gas limit
        });
        
        console.log("Transaction sent:", tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
        
        hideBlockchainLoading();
        alert(`Successfully bought into ${gameMode}! Transaction: ${tx.hash.substring(0, 10)}...`);
        return true;
        
    } catch (error) {
        hideBlockchainLoading();
        console.error("Buy-in failed:", error);
        
        if (error.code === 4001) {
            alert("Transaction cancelled by user");
        } else if (error.code === -32603) {
            alert("Transaction failed: " + (error.data?.message || error.message));
        } else {
            alert("Buy-in failed: " + error.message);
        }
        return false;
    }
}

/**
 * Handle battle entry payment
 * @returns {Promise<boolean>} Success status
 */
async function handleBattleEntry() {
    if (!isBlockchainReady()) {
        alert("Please connect your wallet first");
        return false;
    }

    try {
        const battleBuyIn = ethers.utils.parseEther(BUY_IN_AMOUNTS.BATTLE);
        
        console.log("Entering battle with 1.0 MON");
        
        showBlockchainLoading("Processing battle entry...");
        
        const tx = await blockchain.contract.enterBattle({
            value: battleBuyIn,
            gasLimit: 100000
        });
        
        console.log("Battle entry transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("Battle entry confirmed:", receipt);
        
        hideBlockchainLoading();
        return true;
        
    } catch (error) {
        hideBlockchainLoading();
        console.error("Battle entry failed:", error);
        
        if (error.code === 4001) {
            alert("Battle entry cancelled by user");
        } else {
            alert("Battle entry failed: " + error.message);
        }
        return false;
    }
}

/**
 * Handle MONLUCK wager and payout
 * @param {string} wagerAmount - Wager amount in ETH
 * @param {number} monadsHit - Number of monads hit (2-5)
 * @returns {Promise<boolean>} Success status
 */
async function handleMonluckWager(wagerAmount, monadsHit) {
    if (!isBlockchainReady()) {
        alert("Please connect your wallet first");
        return false;
    }

    try {
        const wagerWei = ethers.utils.parseEther(wagerAmount);
        
        console.log(`MONLUCK wager: ${wagerAmount} MON, hit ${monadsHit} monads`);
        
        showBlockchainLoading("Processing MONLUCK wager...");
        
        const tx = await blockchain.contract.playMonluck(monadsHit, {
            value: wagerWei,
            gasLimit: 120000
        });
        
        console.log("MONLUCK transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("MONLUCK confirmed:", receipt);
        
        hideBlockchainLoading();
        
        // Check for payout event
        const payoutEvent = receipt.logs.find(log => {
            try {
                const parsed = blockchain.contract.interface.parseLog(log);
                return parsed.name === 'MonluckPayout';
            } catch (e) {
                return false;
            }
        });
        
        if (payoutEvent) {
            const parsed = blockchain.contract.interface.parseLog(payoutEvent);
            const payoutAmount = ethers.utils.formatEther(parsed.args.payout);
            if (parseFloat(payoutAmount) > 0) {
                alert(`MONLUCK WIN! You earned ${payoutAmount} MON! Check your balance to withdraw.`);
            }
        }
        
        return true;
        
    } catch (error) {
        hideBlockchainLoading();
        console.error("MONLUCK wager failed:", error);
        
        if (error.code === 4001) {
            alert("MONLUCK wager cancelled by user");
        } else {
            alert("MONLUCK wager failed: " + error.message);
        }
        return false;
    }
}

/**
 * Get player's pending withdrawal amount
 * @returns {Promise<string>} Withdrawal amount in ETH
 */
async function getPendingWithdrawal() {
    if (!isBlockchainReady()) {
        return "0";
    }

    try {
        const pendingWei = await blockchain.contract.getPendingWithdrawal(blockchain.userAddress);
        return ethers.utils.formatEther(pendingWei);
    } catch (error) {
        console.error("Failed to get pending withdrawal:", error);
        return "0";
    }
}

/**
 * Withdraw player's winnings
 * @returns {Promise<boolean>} Success status
 */
async function withdrawWinnings() {
    if (!isBlockchainReady()) {
        alert("Please connect your wallet first");
        return false;
    }

    try {
        const pendingAmount = await getPendingWithdrawal();
        
        if (parseFloat(pendingAmount) <= 0) {
            alert("No winnings available to withdraw");
            return false;
        }
        
        console.log(`Withdrawing ${pendingAmount} MON`);
        
        showBlockchainLoading("Processing withdrawal...");
        
        const tx = await blockchain.contract.withdraw({
            gasLimit: 100000
        });
        
        console.log("Withdrawal transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("Withdrawal confirmed:", receipt);
        
        hideBlockchainLoading();
        alert(`Successfully withdrew ${pendingAmount} MON! Transaction: ${tx.hash.substring(0, 10)}...`);
        
        return true;
        
    } catch (error) {
        hideBlockchainLoading();
        console.error("Withdrawal failed:", error);
        
        if (error.code === 4001) {
            alert("Withdrawal cancelled by user");
        } else {
            alert("Withdrawal failed: " + error.message);
        }
        return false;
    }
}

/**
 * Get current tournament info
 * @param {string} gameMode - Game mode
 * @param {string} buyInAmount - Buy-in amount
 * @returns {Promise<Object>} Tournament information
 */
async function getTournamentInfo(gameMode, buyInAmount) {
    if (!isBlockchainReady()) {
        return null;
    }

    try {
        const gameModeId = GAME_MODES[gameMode];
        const buyInWei = ethers.utils.parseEther(buyInAmount);
        const currentWeek = await blockchain.contract.getCurrentWeek();
        
        const tournamentInfo = await blockchain.contract.getTournamentInfo(
            gameModeId, 
            buyInWei, 
            currentWeek
        );
        
        return {
            treasury: ethers.utils.formatEther(tournamentInfo.treasury),
            endTime: tournamentInfo.endTime.toNumber(),
            topPlayers: tournamentInfo.topPlayers,
            topScores: tournamentInfo.topScores.map(score => score.toNumber()),
            distributed: tournamentInfo.distributed,
            withdrawDeadline: tournamentInfo.withdrawDeadline.toNumber()
        };
        
    } catch (error) {
        console.error("Failed to get tournament info:", error);
        return null;
    }
}

/**
 * Show blockchain loading indicator
 * @param {string} message - Loading message
 */
function showBlockchainLoading(message) {
    // Create loading overlay if it doesn't exist
    let loadingDiv = document.getElementById('blockchain-loading');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'blockchain-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            font-family: Arial;
            font-size: 18px;
        `;
        document.body.appendChild(loadingDiv);
    }
    
    loadingDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 20px;">⏳</div>
            <div>${message}</div>
            <div style="margin-top: 10px; font-size: 14px; color: #ccc;">
                Please confirm the transaction in your wallet
            </div>
        </div>
    `;
    loadingDiv.style.display = 'flex';
}

/**
 * Hide blockchain loading indicator
 */
function hideBlockchainLoading() {
    const loadingDiv = document.getElementById('blockchain-loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Format MON amount for display
 * @param {string} amount - Amount in ETH
 * @returns {string} Formatted amount
 */
function formatMON(amount) {
    const num = parseFloat(amount);
    if (num === 0) return "0 MON";
    if (num < 0.001) return "< 0.001 MON";
    return `${num.toFixed(3)} MON`;
}

/**
 * Get wallet balance in MON
 * @returns {Promise<string>} Balance in MON format
 */
async function getWalletBalance() {
    // Access walletConnection from global scope
    if (!window.walletConnection || !window.walletConnection.isConnected || !blockchain.provider) {
        return "0";
    }
    
    try {
        const address = blockchain.userAddress || window.walletConnection.address;
        const balance = await blockchain.provider.getBalance(address);
        return ethers.utils.formatEther(balance);
    } catch (error) {
        console.error("Failed to get wallet balance:", error);
        return "0";
    }
}

// Initialize blockchain when wallet connects
async function onWalletConnected() {
    if (walletConnection.isConnected) {
        await initializeBlockchain();
    }
}

// Export functions for global access
window.initializeBlockchain = initializeBlockchain;
window.isBlockchainReady = isBlockchainReady;
window.handleWeeklyGameBuyIn = handleWeeklyGameBuyIn;
window.handleBattleEntry = handleBattleEntry;
window.handleMonluckWager = handleMonluckWager;
window.getPendingWithdrawal = getPendingWithdrawal;
window.withdrawWinnings = withdrawWinnings;
window.getTournamentInfo = getTournamentInfo;
window.formatMON = formatMON;
window.getWalletBalance = getWalletBalance;
window.onWalletConnected = onWalletConnected;

console.log("Blockchain integration loaded");