/**
 * MEMOMUhub Blockchain Integration
 * Handles all blockchain interactions using ethers.js for Monad network
 * Manages pay-to-play mechanics, treasuries, and payouts
 */

// Contract addresses (to be set after deployment)
const CONTRACT_ADDRESSES = {
    treasury: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
};

// Monad network configuration
const MONAD_NETWORK = {
    chainId: "0x2329", // 9001 in hex - Monad testnet
    chainName: "Monad Testnet",
    nativeCurrency: {
        name: "MON",
        symbol: "MON",
        decimals: 18
    },
    rpcUrls: ["https://testnet-rpc.monad.xyz"], // Replace with actual RPC URL
    blockExplorerUrls: ["https://testnet-explorer.monad.xyz"] // Replace with actual explorer URL
};

// Contract ABI (simplified for the functions we need)
const TREASURY_ABI = [
    "function buyIn(string memory gameMode) external payable",
    "function monluckWager() external payable",
    "function battleEntry() external payable",
    "function withdrawWeeklyPayout(string memory gameMode, uint256 buyInAmount, uint256 week) external",
    "function withdrawBattlePayout(uint256 week) external",
    "function getTreasuryBalance(string memory gameMode, uint256 buyInAmount) external view returns (uint256)",
    "function getCurrentWeek() external view returns (uint256)",
    "function getWeeklyPayoutInfo(string memory gameMode, uint256 buyInAmount, uint256 week) external view returns (uint256 totalAmount, address[5] memory topPlayers, uint256[5] memory payoutAmounts, bool prepared)",
    "function getBattlePayoutInfo(uint256 week) external view returns (uint256 totalAmount, address[3] memory topPlayers, uint256[3] memory payoutAmounts, bool prepared)",
    "function hasWithdrawn(string memory gameMode, uint256 buyInAmount, uint256 week, address player) external view returns (bool)",
    "function hasBattleWithdrawn(uint256 week, address player) external view returns (bool)",
    "event BuyInReceived(address indexed player, string gameMode, uint256 amount, uint256 timestamp)",
    "event PayoutWithdrawn(address indexed player, string gameMode, uint256 amount, uint256 week)",
    "event InstantPayout(address indexed player, string gameMode, uint256 amount, uint256 multiplier)"
];

// Global blockchain state
let blockchainState = {
    provider: null,
    signer: null,
    treasuryContract: null,
    isConnected: false,
    currentWeek: 0,
    payoutEligibility: {} // Cache for payout eligibility
};

// MON amounts in wei
const MON_AMOUNTS = {
    "0.1": ethers.utils.parseEther("0.1"),
    "1": ethers.utils.parseEther("1"),
    "1.5": ethers.utils.parseEther("1.5"),
    "2": ethers.utils.parseEther("2")
};

/**
 * Initialize blockchain connection and contracts
 */
async function initializeBlockchain() {
    try {
        if (!window.ethereum) {
            console.warn("No Web3 provider found. Blockchain features disabled.");
            return false;
        }

        // Add Monad network if not already added
        await addMonadNetwork();

        // Create provider and signer
        blockchainState.provider = new ethers.providers.Web3Provider(window.ethereum);
        blockchainState.signer = blockchainState.provider.getSigner();

        // Initialize treasury contract
        if (CONTRACT_ADDRESSES.treasury !== "0x0000000000000000000000000000000000000000") {
            blockchainState.treasuryContract = new ethers.Contract(
                CONTRACT_ADDRESSES.treasury,
                TREASURY_ABI,
                blockchainState.signer
            );
            
            // Get current week
            blockchainState.currentWeek = await blockchainState.treasuryContract.getCurrentWeek();
            blockchainState.isConnected = true;
            
            console.log("Blockchain initialized successfully");
            return true;
        } else {
            console.warn("Treasury contract address not set. Using testnet mode.");
            return false;
        }
    } catch (error) {
        console.error("Failed to initialize blockchain:", error);
        return false;
    }
}

/**
 * Add Monad network to MetaMask if not already present
 */
async function addMonadNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_NETWORK.chainId }],
        });
    } catch (switchError) {
        // Network not added yet, add it
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [MONAD_NETWORK],
                });
            } catch (addError) {
                console.error("Failed to add Monad network:", addError);
                throw addError;
            }
        } else {
            throw switchError;
        }
    }
}

/**
 * Check if player is eligible for payouts and cache the results
 */
async function checkPayoutEligibility(playerAddress) {
    if (!blockchainState.isConnected) return {};

    const eligibility = {
        memory: {},
        battle: {}
    };

    try {
        const currentWeek = blockchainState.currentWeek;
        
        // Check memory game payouts for current and previous week
        const gameTypes = ["musicMemory", "memoryClassic", "memoryMemomu"];
        const buyInAmounts = [MON_AMOUNTS["0.1"], MON_AMOUNTS["1"]];

        for (const gameType of gameTypes) {
            eligibility.memory[gameType] = {};
            
            for (const buyInAmount of buyInAmounts) {
                const buyInKey = buyInAmount.eq(MON_AMOUNTS["0.1"]) ? "0.1" : "1";
                eligibility.memory[gameType][buyInKey] = {};

                // Check current and previous week
                for (let week = Math.max(0, currentWeek - 1); week <= currentWeek; week++) {
                    try {
                        const payoutInfo = await blockchainState.treasuryContract.getWeeklyPayoutInfo(
                            gameType, buyInAmount, week
                        );
                        
                        if (payoutInfo.prepared) {
                            const playerIndex = payoutInfo.topPlayers.findIndex(
                                addr => addr.toLowerCase() === playerAddress.toLowerCase()
                            );
                            
                            if (playerIndex !== -1) {
                                const hasWithdrawn = await blockchainState.treasuryContract.hasWithdrawn(
                                    gameType, buyInAmount, week, playerAddress
                                );
                                
                                eligibility.memory[gameType][buyInKey][week] = {
                                    eligible: true,
                                    position: playerIndex + 1,
                                    amount: payoutInfo.payoutAmounts[playerIndex],
                                    withdrawn: hasWithdrawn
                                };
                            }
                        }
                    } catch (error) {
                        console.warn(`Error checking payout for ${gameType} week ${week}:`, error);
                    }
                }
            }
        }

        // Check battle payouts
        for (let week = Math.max(0, currentWeek - 1); week <= currentWeek; week++) {
            try {
                const battleInfo = await blockchainState.treasuryContract.getBattlePayoutInfo(week);
                
                if (battleInfo.prepared) {
                    const playerIndex = battleInfo.topPlayers.findIndex(
                        addr => addr.toLowerCase() === playerAddress.toLowerCase()
                    );
                    
                    if (playerIndex !== -1) {
                        const hasWithdrawn = await blockchainState.treasuryContract.hasBattleWithdrawn(
                            week, playerAddress
                        );
                        
                        eligibility.battle[week] = {
                            eligible: true,
                            position: playerIndex + 1,
                            amount: battleInfo.payoutAmounts[playerIndex],
                            withdrawn: hasWithdrawn
                        };
                    }
                }
            } catch (error) {
                console.warn(`Error checking battle payout for week ${week}:`, error);
            }
        }

        blockchainState.payoutEligibility[playerAddress] = eligibility;
        return eligibility;
    } catch (error) {
        console.error("Error checking payout eligibility:", error);
        return {};
    }
}

/**
 * Handle buy-in for memory games (Music Memory, Classic Memory, MEMOMU)
 */
async function handleMemoryGameBuyIn(gameMode, buyInAmount) {
    if (!blockchainState.isConnected) {
        throw new Error("Blockchain not connected");
    }

    try {
        const amountWei = MON_AMOUNTS[buyInAmount];
        if (!amountWei) {
            throw new Error("Invalid buy-in amount");
        }

        const tx = await blockchainState.treasuryContract.buyIn(gameMode, {
            value: amountWei
        });

        console.log(`Buy-in transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`Buy-in confirmed for ${gameMode}: ${buyInAmount} MON`);
        
        return tx.hash;
    } catch (error) {
        console.error("Buy-in failed:", error);
        throw error;
    }
}

/**
 * Handle MONLUCK wager
 */
async function handleMonluckWager(wagerAmount) {
    if (!blockchainState.isConnected) {
        throw new Error("Blockchain not connected");
    }

    try {
        const amountWei = ethers.utils.parseEther(wagerAmount.toString());
        
        const tx = await blockchainState.treasuryContract.monluckWager({
            value: amountWei
        });

        console.log(`MONLUCK wager transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`MONLUCK wager confirmed: ${wagerAmount} MON`);
        
        return tx.hash;
    } catch (error) {
        console.error("MONLUCK wager failed:", error);
        throw error;
    }
}

/**
 * Handle battle entry
 */
async function handleBattleEntry() {
    if (!blockchainState.isConnected) {
        throw new Error("Blockchain not connected");
    }

    try {
        const tx = await blockchainState.treasuryContract.battleEntry({
            value: MON_AMOUNTS["1"]
        });

        console.log(`Battle entry transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("Battle entry confirmed: 1 MON");
        
        return tx.hash;
    } catch (error) {
        console.error("Battle entry failed:", error);
        throw error;
    }
}

/**
 * Withdraw weekly memory game payout
 */
async function withdrawMemoryPayout(gameMode, buyInAmount, week) {
    if (!blockchainState.isConnected) {
        throw new Error("Blockchain not connected");
    }

    try {
        const amountWei = MON_AMOUNTS[buyInAmount];
        
        const tx = await blockchainState.treasuryContract.withdrawWeeklyPayout(
            gameMode, amountWei, week
        );

        console.log(`Withdraw transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`Payout withdrawn for ${gameMode} week ${week}`);
        
        return tx.hash;
    } catch (error) {
        console.error("Withdrawal failed:", error);
        throw error;
    }
}

/**
 * Withdraw weekly battle payout
 */
async function withdrawBattlePayout(week) {
    if (!blockchainState.isConnected) {
        throw new Error("Blockchain not connected");
    }

    try {
        const tx = await blockchainState.treasuryContract.withdrawBattlePayout(week);

        console.log(`Battle withdraw transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`Battle payout withdrawn for week ${week}`);
        
        return tx.hash;
    } catch (error) {
        console.error("Battle withdrawal failed:", error);
        throw error;
    }
}

/**
 * Format MON amount for display
 */
function formatMON(amountWei) {
    try {
        return ethers.utils.formatEther(amountWei) + " MON";
    } catch (error) {
        return "0 MON";
    }
}

/**
 * Get treasury balance for display
 */
async function getTreasuryBalance(gameMode, buyInAmount) {
    if (!blockchainState.isConnected) return "0 MON";

    try {
        const amountWei = MON_AMOUNTS[buyInAmount] || ethers.BigNumber.from(0);
        const balance = await blockchainState.treasuryContract.getTreasuryBalance(gameMode, amountWei);
        return formatMON(balance);
    } catch (error) {
        console.error("Error fetching treasury balance:", error);
        return "0 MON";
    }
}

// Export functions for use in main game file
window.blockchainIntegration = {
    initializeBlockchain,
    handleMemoryGameBuyIn,
    handleMonluckWager,
    handleBattleEntry,
    withdrawMemoryPayout,
    withdrawBattlePayout,
    checkPayoutEligibility,
    formatMON,
    getTreasuryBalance,
    isConnected: () => blockchainState.isConnected,
    getCurrentWeek: () => blockchainState.currentWeek,
    getPayoutEligibility: (address) => blockchainState.payoutEligibility[address] || {}
};

// Auto-initialize when wallet is connected
window.addEventListener('load', async () => {
    if (window.ethereum && window.ethereum.selectedAddress) {
        await initializeBlockchain();
    }
});