// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MEMOMUModesTreasury Smart Contract
 * @dev Treasury management system for MEMOMU game modes with differentiated payout strategies
 * @author Nhom1984
 * 
 * OVERVIEW:
 * This contract manages treasury operations for five game modes with distinct mechanics:
 * - Classic, MEMOMU, Music: Direct treasury routing + weekly leaderboard payouts
 * - MONLUCK, Battle: Contract-managed instant payouts + game rule enforcement
 * 
 * SECURITY FEATURES:
 * - Owner-only administrative functions with proper access control
 * - Reentrancy protection on all external calls
 * - Safe arithmetic operations to prevent overflow/underflow
 * - Withdrawal restrictions to ensure reward availability
 * - Emergency functions for contract recovery
 * 
 * GAS OPTIMIZATION:
 * - Packed structs for efficient storage
 * - Minimal storage operations in hot paths
 * - Optimized loops and conditionals
 * - Event-driven architecture for off-chain indexing
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MEMOMUModesTreasury {
    
    // ============ STATE VARIABLES ============
    
    /// @dev Contract owner for administrative functions
    address public owner;
    
    /// @dev MON token contract address (updatable by owner)
    address public monTokenAddress;
    
    /// @dev Game mode enumeration for type safety and gas efficiency
    enum GameMode { 
        Classic,    // 0: Classic Memory - Direct treasury routing
        MEMOMU,     // 1: MEMOMU Memory - Direct treasury routing  
        Music,      // 2: Music Memory - Direct treasury routing
        MONLUCK,    // 3: MONLUCK - Contract-managed instant payouts
        Battle      // 4: Battle - Contract-managed instant payouts
    }
    
    /// @dev Treasury wallet addresses for each game mode (updatable by owner)
    mapping(GameMode => address) public treasuryWallets;
    
    /// @dev Weekly tournament data structure (packed for gas efficiency)
    struct WeeklyTournament {
        uint128 totalPool;          // Total buy-ins collected this week
        uint64 endTimestamp;        // Week end time (Sunday 20:00 UTC)
        uint32 winnerCount;         // Number of winners published
        bool rewardsDistributed;    // Whether rewards have been paid out
        bool allRewardsClaimed;     // Whether all winners have claimed rewards
    }
    
    /// @dev Weekly tournament tracking: gameMode => week => tournament data
    mapping(GameMode => mapping(uint256 => WeeklyTournament)) public weeklyTournaments;
    
    /// @dev Weekly winners list: gameMode => week => winner addresses with scores
    mapping(GameMode => mapping(uint256 => address[])) public weeklyWinners;
    mapping(GameMode => mapping(uint256 => uint256[])) public weeklyScores;
    
    /// @dev Player reward claims: player => gameMode => week => claimed amount
    mapping(address => mapping(GameMode => mapping(uint256 => uint256))) public playerRewardsClaimed;
    
    /// @dev Pending withdrawals for instant payout games (MONLUCK, Battle)
    mapping(address => uint256) public pendingWithdrawals;
    
    /// @dev MONLUCK multiplier configuration (index = monad count, value = multiplier basis points)
    uint16[6] public monluckMultipliers = [0, 0, 150, 240, 500, 1000]; // 0%, 0%, 1.5x, 2.4x, 5x, 10x
    
    /// @dev Battle payout configuration
    uint256 public constant BATTLE_BUY_IN = 1 ether;           // 1 MON entry fee
    uint256 public constant BATTLE_INSTANT_PAYOUT = 1.5 ether; // 1.5 MON winner payout
    uint256 public constant BATTLE_TREASURY_PORTION = 0.4 ether; // 0.4 MON to weekly treasury
    
    /// @dev Reward distribution percentages for weekly tournaments (basis points)
    uint16[5] public rewardPercentages = [5000, 2500, 1500, 700, 300]; // 50%, 25%, 15%, 7%, 3%
    
    /// @dev Reentrancy guard
    bool private locked;
    
    // ============ EVENTS ============
    
    /// @dev Emitted when buy-in is processed for direct treasury games
    event DirectTreasuryBuyIn(
        address indexed player,
        GameMode indexed gameMode,
        uint256 amount,
        address treasuryWallet,
        uint256 week
    );
    
    /// @dev Emitted when buy-in is processed for contract-managed games  
    event ContractManagedBuyIn(
        address indexed player,
        GameMode indexed gameMode,
        uint256 amount,
        uint256 week
    );
    
    /// @dev Emitted when weekly winners are published by owner/backend
    event WeeklyWinnersPublished(
        GameMode indexed gameMode,
        uint256 indexed week,
        address[] winners,
        uint256[] scores,
        uint256 totalPool
    );
    
    /// @dev Emitted when player claims weekly tournament rewards
    event WeeklyRewardClaimed(
        address indexed player,
        GameMode indexed gameMode,
        uint256 indexed week,
        uint256 amount,
        uint256 position
    );
    
    /// @dev Emitted when MONLUCK instant payout is processed
    event MonluckPayout(
        address indexed player,
        uint256 wager,
        uint256 monadsHit,
        uint256 payout,
        uint256 multiplier
    );
    
    /// @dev Emitted when Battle instant payout is processed
    event BattlePayout(
        address indexed winner,
        address indexed loser,
        uint256 payout,
        uint256 treasuryContribution
    );
    
    /// @dev Emitted when player withdraws pending balance
    event WithdrawalProcessed(
        address indexed player,
        uint256 amount
    );
    
    /// @dev Emitted when treasury wallet address is updated
    event TreasuryWalletUpdated(
        GameMode indexed gameMode,
        address oldWallet,
        address newWallet
    );
    
    /// @dev Emitted when MON token address is updated
    event MonTokenAddressUpdated(
        address oldAddress,
        address newAddress
    );
    
    /// @dev Emitted when owner withdraws leftover funds
    event OwnerWithdrawal(
        address indexed owner,
        uint256 amount
    );
    
    // ============ MODIFIERS ============
    
    /// @dev Restricts function access to contract owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "MEMOMUTreasury: Caller is not the owner");
        _;
    }
    
    /// @dev Prevents reentrancy attacks on state-changing functions
    modifier nonReentrant() {
        require(!locked, "MEMOMUTreasury: Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    /// @dev Validates game mode parameter
    modifier validGameMode(GameMode gameMode) {
        require(uint8(gameMode) <= 4, "MEMOMUTreasury: Invalid game mode");
        _;
    }
    
    /// @dev Ensures treasury wallet is configured for the game mode
    modifier treasuryConfigured(GameMode gameMode) {
        require(treasuryWallets[gameMode] != address(0), "MEMOMUTreasury: Treasury wallet not configured");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @dev Initialize contract with owner and default configuration
     * @param _monTokenAddress Initial MON token contract address
     */
    constructor(address _monTokenAddress) {
        require(_monTokenAddress != address(0), "MEMOMUTreasury: Invalid MON token address");
        owner = msg.sender;
        monTokenAddress = _monTokenAddress;
    }
    
    // ============ TREASURY CONFIGURATION ============
    
    /**
     * @dev Update treasury wallet address for a specific game mode
     * @param gameMode The game mode to update
     * @param newWallet New treasury wallet address
     */
    function updateTreasuryWallet(GameMode gameMode, address newWallet) 
        external 
        onlyOwner 
        validGameMode(gameMode) 
    {
        require(newWallet != address(0), "MEMOMUTreasury: Invalid wallet address");
        
        address oldWallet = treasuryWallets[gameMode];
        treasuryWallets[gameMode] = newWallet;
        
        emit TreasuryWalletUpdated(gameMode, oldWallet, newWallet);
    }
    
    /**
     * @dev Update MON token contract address
     * @param newTokenAddress New MON token contract address
     */
    function updateMonTokenAddress(address newTokenAddress) external onlyOwner {
        require(newTokenAddress != address(0), "MEMOMUTreasury: Invalid token address");
        
        address oldAddress = monTokenAddress;
        monTokenAddress = newTokenAddress;
        
        emit MonTokenAddressUpdated(oldAddress, newTokenAddress);
    }
    
    // ============ BUY-IN PROCESSING ============
    
    /**
     * @dev Process buy-in for weekly tournament games (Classic, MEMOMU, Music)
     * Routes funds directly to configured treasury wallets
     * @param gameMode Game mode (must be Classic, MEMOMU, or Music)
     * @param amount Buy-in amount in MON tokens
     */
    function processWeeklyGameBuyIn(GameMode gameMode, uint256 amount) 
        external 
        validGameMode(gameMode) 
        treasuryConfigured(gameMode)
        nonReentrant 
    {
        require(
            gameMode == GameMode.Classic || gameMode == GameMode.MEMOMU || gameMode == GameMode.Music,
            "MEMOMUTreasury: Invalid game mode for weekly tournament"
        );
        require(amount > 0, "MEMOMUTreasury: Amount must be greater than zero");
        
        uint256 currentWeek = getCurrentWeek();
        address treasuryWallet = treasuryWallets[gameMode];
        
        // Transfer MON tokens directly from player to treasury wallet
        IERC20 monToken = IERC20(monTokenAddress);
        require(
            monToken.transferFrom(msg.sender, treasuryWallet, amount),
            "MEMOMUTreasury: Token transfer failed"
        );
        
        // Update weekly tournament pool tracking
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][currentWeek];
        tournament.totalPool += uint128(amount);
        
        // Set end timestamp if first buy-in of the week
        if (tournament.endTimestamp == 0) {
            tournament.endTimestamp = uint64(getWeekEndTimestamp(currentWeek));
        }
        
        emit DirectTreasuryBuyIn(msg.sender, gameMode, amount, treasuryWallet, currentWeek);
    }
    
    /**
     * @dev Process MONLUCK wager with instant payout calculation
     * @param wagerAmount Amount to wager in MON tokens
     * @param monadsHit Number of monads hit (2-5 for winning)
     */
    function playMonluck(uint256 wagerAmount, uint256 monadsHit) 
        external 
        nonReentrant 
    {
        require(wagerAmount >= 0.1 ether && wagerAmount <= 2 ether, "MEMOMUTreasury: Invalid wager amount");
        require(monadsHit >= 2 && monadsHit <= 5, "MEMOMUTreasury: Invalid monad count for win");
        
        // Transfer wager from player to contract
        IERC20 monToken = IERC20(monTokenAddress);
        require(
            monToken.transferFrom(msg.sender, address(this), wagerAmount),
            "MEMOMUTreasury: Token transfer failed"
        );
        
        // Calculate payout based on multiplier
        uint256 multiplier = monluckMultipliers[monadsHit];
        uint256 payout = (wagerAmount * multiplier) / 100; // multiplier is in basis points / 100
        
        if (payout > 0) {
            pendingWithdrawals[msg.sender] += payout;
        }
        
        uint256 currentWeek = getCurrentWeek();
        emit ContractManagedBuyIn(msg.sender, GameMode.MONLUCK, wagerAmount, currentWeek);
        emit MonluckPayout(msg.sender, wagerAmount, monadsHit, payout, multiplier);
    }
    
    /**
     * @dev Process Battle entry and determine winner with instant payout
     * @param winner Address of the battle winner
     * @param loser Address of the battle loser
     */
    function processBattleResult(address winner, address loser) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(winner != address(0) && loser != address(0), "MEMOMUTreasury: Invalid player addresses");
        require(winner != loser, "MEMOMUTreasury: Winner and loser cannot be the same");
        
        // Both players must have already paid their buy-ins (handled off-chain or in separate function)
        // Here we process the battle result and payouts
        
        uint256 currentWeek = getCurrentWeek();
        
        // Add treasury portion to weekly Battle pool
        WeeklyTournament storage tournament = weeklyTournaments[GameMode.Battle][currentWeek];
        tournament.totalPool += uint128(BATTLE_TREASURY_PORTION);
        
        // Set end timestamp if first battle of the week
        if (tournament.endTimestamp == 0) {
            tournament.endTimestamp = uint64(getWeekEndTimestamp(currentWeek));
        }
        
        // Award instant payout to winner
        pendingWithdrawals[winner] += BATTLE_INSTANT_PAYOUT;
        
        emit BattlePayout(winner, loser, BATTLE_INSTANT_PAYOUT, BATTLE_TREASURY_PORTION);
    }
    
    /**
     * @dev Process Battle buy-in from both players
     * @param player1 Address of first player
     * @param player2 Address of second player
     */
    function processBattleBuyIns(address player1, address player2) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(player1 != address(0) && player2 != address(0), "MEMOMUTreasury: Invalid player addresses");
        require(player1 != player2, "MEMOMUTreasury: Players cannot be the same");
        
        IERC20 monToken = IERC20(monTokenAddress);
        uint256 currentWeek = getCurrentWeek();
        
        // Transfer buy-ins from both players to contract
        require(
            monToken.transferFrom(player1, address(this), BATTLE_BUY_IN),
            "MEMOMUTreasury: Player1 token transfer failed"
        );
        require(
            monToken.transferFrom(player2, address(this), BATTLE_BUY_IN),
            "MEMOMUTreasury: Player2 token transfer failed"
        );
        
        emit ContractManagedBuyIn(player1, GameMode.Battle, BATTLE_BUY_IN, currentWeek);
        emit ContractManagedBuyIn(player2, GameMode.Battle, BATTLE_BUY_IN, currentWeek);
    }
    
    // ============ WEEKLY LEADERBOARD MANAGEMENT ============
    
    /**
     * @dev Publish weekly winners and scores for tournament games (Owner/Backend only)
     * Can only be called at the exact weekly deadline (Sunday 20:00 UTC)
     * @param gameMode Game mode for the tournament
     * @param week Week number to publish results for
     * @param winners Array of winner addresses (up to 5, in ranking order)
     * @param scores Array of corresponding scores (must match winners length)
     */
    function publishWeeklyWinners(
        GameMode gameMode,
        uint256 week,
        address[] calldata winners,
        uint256[] calldata scores
    ) 
        external 
        onlyOwner 
        validGameMode(gameMode) 
    {
        require(
            gameMode == GameMode.Classic || gameMode == GameMode.MEMOMU || 
            gameMode == GameMode.Music || gameMode == GameMode.Battle,
            "MEMOMUTreasury: Invalid game mode for weekly tournament"  
        );
        require(winners.length == scores.length, "MEMOMUTreasury: Winners and scores length mismatch");
        require(winners.length <= 5, "MEMOMUTreasury: Too many winners");
        require(winners.length > 0, "MEMOMUTreasury: Must have at least one winner");
        
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][week];
        require(tournament.totalPool > 0, "MEMOMUTreasury: No tournament pool for this week");
        require(!tournament.rewardsDistributed, "MEMOMUTreasury: Rewards already distributed");
        
        // Verify we're at the correct time (Sunday 20:00 UTC)
        uint256 expectedEndTime = getWeekEndTimestamp(week);
        require(
            block.timestamp >= expectedEndTime && block.timestamp <= expectedEndTime + 1 hours,
            "MEMOMUTreasury: Can only publish winners at exact weekly deadline"
        );
        
        // Store winners and scores
        weeklyWinners[gameMode][week] = winners;
        weeklyScores[gameMode][week] = scores;
        
        tournament.winnerCount = uint32(winners.length);
        tournament.rewardsDistributed = true;
        
        emit WeeklyWinnersPublished(gameMode, week, winners, scores, tournament.totalPool);
    }
    
    /**
     * @dev Claim weekly tournament rewards (Players only)
     * @param gameMode Game mode to claim rewards for
     * @param week Week number to claim rewards for
     */
    function claimWeeklyReward(GameMode gameMode, uint256 week) 
        external 
        validGameMode(gameMode) 
        nonReentrant 
    {
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][week];
        require(tournament.rewardsDistributed, "MEMOMUTreasury: Winners not published yet");
        require(
            playerRewardsClaimed[msg.sender][gameMode][week] == 0,
            "MEMOMUTreasury: Reward already claimed"
        );
        
        // Find player position in winners list
        address[] memory winners = weeklyWinners[gameMode][week];
        uint256 position = type(uint256).max;
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] == msg.sender) {
                position = i;
                break;
            }
        }
        
        require(position != type(uint256).max, "MEMOMUTreasury: Player not in winners list");
        
        // Calculate reward amount
        uint256 totalRewards = (tournament.totalPool * 90) / 100; // 90% of pool goes to winners
        uint256 rewardAmount = (totalRewards * rewardPercentages[position]) / 10000; // percentages in basis points
        
        require(rewardAmount > 0, "MEMOMUTreasury: No reward to claim");
        
        // Mark as claimed
        playerRewardsClaimed[msg.sender][gameMode][week] = rewardAmount;
        
        // Transfer reward from appropriate treasury
        address treasuryWallet;
        if (gameMode == GameMode.Battle) {
            // Battle rewards come from contract balance
            IERC20 monToken = IERC20(monTokenAddress);
            require(
                monToken.transfer(msg.sender, rewardAmount),
                "MEMOMUTreasury: Reward transfer failed"
            );
        } else {
            // Weekly tournament rewards come from treasury wallets
            treasuryWallet = treasuryWallets[gameMode];
            require(treasuryWallet != address(0), "MEMOMUTreasury: Treasury wallet not configured");
            
            IERC20 monToken = IERC20(monTokenAddress);
            require(
                monToken.transferFrom(treasuryWallet, msg.sender, rewardAmount),
                "MEMOMUTreasury: Reward transfer failed"
            );
        }
        
        emit WeeklyRewardClaimed(msg.sender, gameMode, week, rewardAmount, position);
        
        // Check if all rewards have been claimed
        _checkAllRewardsClaimed(gameMode, week);
    }
    
    /**
     * @dev Internal function to check if all weekly rewards have been claimed
     * @param gameMode Game mode to check
     * @param week Week number to check
     */
    function _checkAllRewardsClaimed(GameMode gameMode, uint256 week) internal {
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][week];
        if (tournament.allRewardsClaimed) return;
        
        address[] memory winners = weeklyWinners[gameMode][week];
        bool allClaimed = true;
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (playerRewardsClaimed[winners[i]][gameMode][week] == 0) {
                allClaimed = false;
                break;
            }
        }
        
        if (allClaimed) {
            tournament.allRewardsClaimed = true;
        }
    }
    
    // ============ WITHDRAWAL FUNCTIONS ============
    
    /**
     * @dev Withdraw pending balance from instant payout games (MONLUCK, Battle)
     */
    function withdrawPendingBalance() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "MEMOMUTreasury: No pending withdrawal");
        
        pendingWithdrawals[msg.sender] = 0;
        
        IERC20 monToken = IERC20(monTokenAddress);
        require(monToken.transfer(msg.sender, amount), "MEMOMUTreasury: Withdrawal failed");
        
        emit WithdrawalProcessed(msg.sender, amount);
    }
    
    /**
     * @dev Owner withdrawal of leftover MON (only after all weekly rewards are claimed)
     * @param amount Amount to withdraw
     */
    function ownerWithdrawLeftover(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "MEMOMUTreasury: Amount must be greater than zero");
        
        IERC20 monToken = IERC20(monTokenAddress);
        uint256 contractBalance = monToken.balanceOf(address(this));
        require(contractBalance >= amount, "MEMOMUTreasury: Insufficient contract balance");
        
        // Verify all recent weekly rewards have been claimed
        uint256 currentWeek = getCurrentWeek();
        for (uint256 i = 0; i < 4; i++) { // Check last 4 weeks
            uint256 checkWeek = currentWeek - i;
            if (checkWeek >= currentWeek) continue; // Prevent underflow
            
            for (uint8 mode = 0; mode <= 4; mode++) {
                WeeklyTournament memory tournament = weeklyTournaments[GameMode(mode)][checkWeek];
                if (tournament.totalPool > 0 && tournament.rewardsDistributed && !tournament.allRewardsClaimed) {
                    revert("MEMOMUTreasury: Cannot withdraw while rewards are unclaimed");
                }
            }
        }
        
        require(monToken.transfer(owner, amount), "MEMOMUTreasury: Owner withdrawal failed");
        
        emit OwnerWithdrawal(owner, amount);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get current week number based on timestamp
     * @return Current week number
     */
    function getCurrentWeek() public view returns (uint256) {
        return block.timestamp / 1 weeks;
    }
    
    /**
     * @dev Get week end timestamp (Sunday 20:00 UTC)
     * @param week Week number
     * @return End timestamp for the week
     */
    function getWeekEndTimestamp(uint256 week) public pure returns (uint256) {
        uint256 weekStart = week * 1 weeks;
        uint256 sundayMidnight = weekStart + (6 * 1 days); // Sunday at 00:00
        return sundayMidnight + (20 * 1 hours); // Sunday at 20:00
    }
    
    /**
     * @dev Get weekly tournament information
     * @param gameMode Game mode to query
     * @param week Week number to query
     * @return Tournament data structure
     */
    function getWeeklyTournament(GameMode gameMode, uint256 week) 
        external 
        view 
        returns (WeeklyTournament memory) 
    {
        return weeklyTournaments[gameMode][week];
    }
    
    /**
     * @dev Get weekly winners for a tournament
     * @param gameMode Game mode to query
     * @param week Week number to query
     * @return winners Array of winner addresses
     * @return scores Array of corresponding scores
     */
    function getWeeklyWinners(GameMode gameMode, uint256 week) 
        external 
        view 
        returns (address[] memory winners, uint256[] memory scores) 
    {
        return (weeklyWinners[gameMode][week], weeklyScores[gameMode][week]);
    }
    
    /**
     * @dev Get player's pending withdrawal amount
     * @param player Player address to query
     * @return Pending withdrawal amount
     */
    function getPendingWithdrawal(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }
    
    /**
     * @dev Get player's claimed reward for specific tournament
     * @param player Player address to query  
     * @param gameMode Game mode to query
     * @param week Week number to query
     * @return Claimed reward amount
     */
    function getPlayerRewardClaimed(address player, GameMode gameMode, uint256 week) 
        external 
        view 
        returns (uint256) 
    {
        return playerRewardsClaimed[player][gameMode][week];
    }
    
    /**
     * @dev Get contract's MON token balance
     * @return Contract's MON token balance
     */
    function getContractBalance() external view returns (uint256) {
        IERC20 monToken = IERC20(monTokenAddress);
        return monToken.balanceOf(address(this));
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Emergency withdrawal function for contract recovery (Owner only)
     * Should only be used in extreme circumstances
     */
    function emergencyWithdraw() external onlyOwner {
        IERC20 monToken = IERC20(monTokenAddress);
        uint256 balance = monToken.balanceOf(address(this));
        
        if (balance > 0) {
            require(monToken.transfer(owner, balance), "MEMOMUTreasury: Emergency withdrawal failed");
        }
        
        emit OwnerWithdrawal(owner, balance);
    }
    
    /**
     * @dev Transfer ownership to new address (Owner only)
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MEMOMUTreasury: New owner cannot be zero address");
        owner = newOwner;
    }
    
    /**
     * @dev Pause contract functionality (Owner only)
     * Implementation can be added for emergency stops
     */
    function pause() external onlyOwner {
        // Implementation for pause functionality if needed
        // This is a placeholder for future emergency stop functionality
    }
}