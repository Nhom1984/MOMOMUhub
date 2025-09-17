// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * MEMOMUhub - Pay-to-play game contract for Monad blockchain
 * Supports Memory Music, Classic Memory, MEMOMOMU, MONLUCK, and Battle modes
 */
contract MEMOMUhub {
    address public owner;
    
    // Game mode identifiers
    enum GameMode { MUSIC_MEMORY, CLASSIC_MEMORY, MEMOMOMU, MONLUCK, BATTLE }
    
    // Buy-in amounts in MON (wei units)
    uint256 public constant BUY_IN_SMALL = 0.1 ether; // 0.1 MON
    uint256 public constant BUY_IN_LARGE = 1 ether;   // 1 MON
    uint256 public constant BATTLE_BUY_IN = 1 ether;  // 1 MON for battle
    
    // Payout percentages for weekly rewards (basis points)
    uint256[5] public weeklyPayoutPercentages = [5000, 2500, 1500, 700, 300]; // 50%, 25%, 15%, 7%, 3%
    uint256 public constant TREASURY_PERCENTAGE = 9000; // 90% goes to weekly rewards
    
    // MONLUCK multipliers (basis points)
    uint256[4] public monluckMultipliers = [1500, 2400, 5000, 10000]; // 1.5x, 2.4x, 5x, 10x
    
    // Battle payout structure
    uint256 public constant BATTLE_TREASURY_PERCENTAGE = 4000; // 40% to battle treasury
    uint256 public constant BATTLE_WINNER_PAYOUT = 1.5 ether; // 1.5 MON to winner
    uint256[3] public battleWeeklyPayouts = [5000, 3000, 2000]; // 50%, 30%, 20%
    
    // Weekly period (Sunday 20:00 UTC)
    uint256 public constant WEEK_DURATION = 7 days;
    uint256 public constant REWARD_DEADLINE = 7 days; // 1 week to claim
    
    // Treasuries for each game mode and buy-in
    mapping(GameMode => mapping(uint256 => uint256)) public treasuries;
    uint256 public battleTreasury;
    uint256 public monluckReserve; // For MONLUCK payouts
    
    // Weekly reward tracking
    struct WeeklyReward {
        uint256 weekStart;
        uint256 totalReward;
        mapping(uint256 => address) topPlayers; // rank => player address
        mapping(uint256 => uint256) allocatedAmounts; // rank => amount
        mapping(address => bool) claimed;
        bool finalized;
    }
    
    mapping(GameMode => mapping(uint256 => mapping(uint256 => WeeklyReward))) public weeklyRewards; // gameMode => buyIn => weekId => reward
    mapping(uint256 => WeeklyReward) public battleWeeklyRewards; // weekId => reward
    
    // Player tracking
    mapping(address => mapping(GameMode => mapping(uint256 => uint256))) public playerBuyIns;
    mapping(address => uint256) public battleWins;
    
    // Events
    event BuyInPlaced(address indexed player, GameMode gameMode, uint256 buyInAmount);
    event MonluckPayout(address indexed player, uint256 wager, uint256 payout, uint256 monadsFound);
    event BattleCompleted(address indexed winner, address indexed loser, uint256 payout);
    event WeeklyRewardsAllocated(GameMode gameMode, uint256 buyInAmount, uint256 weekId);
    event RewardClaimed(address indexed player, GameMode gameMode, uint256 buyInAmount, uint256 amount);
    event BattleRewardClaimed(address indexed player, uint256 weekId, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * Place buy-in for Memory games (Music Memory, Classic Memory, MEMOMU)
     */
    function placeBuyIn(GameMode gameMode, uint256 buyInAmount) external payable {
        require(gameMode == GameMode.MUSIC_MEMORY || gameMode == GameMode.CLASSIC_MEMORY || gameMode == GameMode.MEMOMOMU, "Invalid game mode");
        require(buyInAmount == BUY_IN_SMALL || buyInAmount == BUY_IN_LARGE, "Invalid buy-in amount");
        require(msg.value == buyInAmount, "Incorrect payment amount");
        
        treasuries[gameMode][buyInAmount] += msg.value;
        playerBuyIns[msg.sender][gameMode][buyInAmount]++;
        
        emit BuyInPlaced(msg.sender, gameMode, buyInAmount);
    }
    
    /**
     * MONLUCK game - player places wager and gets instant payout if they win
     */
    function playMonluck(uint256 wager, uint256 monadsFound) external payable {
        require(msg.value == wager, "Incorrect wager amount");
        require(wager >= BUY_IN_SMALL && wager <= 2 ether, "Wager must be between 0.1 and 2 MON");
        require(monadsFound >= 2 && monadsFound <= 5, "Invalid monads found count");
        
        if (monadsFound >= 2) {
            // Player wins - calculate payout
            uint256 multiplierIndex = monadsFound - 2; // 2->0, 3->1, 4->2, 5->3
            uint256 payout = (wager * monluckMultipliers[multiplierIndex]) / 10000;
            
            require(address(this).balance >= payout, "Insufficient contract balance for payout");
            
            payable(msg.sender).transfer(payout);
            emit MonluckPayout(msg.sender, wager, payout, monadsFound);
        } else {
            // Player loses - wager stays in contract
            monluckReserve += wager;
        }
    }
    
    /**
     * Battle mode - both players pay 1 MON entry fee
     */
    function enterBattle() external payable {
        require(msg.value == BATTLE_BUY_IN, "Incorrect battle entry fee");
        
        uint256 treasuryAmount = (msg.value * BATTLE_TREASURY_PERCENTAGE) / 10000;
        battleTreasury += treasuryAmount;
        
        // Rest is held for winner payout
    }
    
    /**
     * Complete battle and pay winner
     */
    function completeBattle(address winner, address loser) external onlyOwner {
        require(winner != address(0) && loser != address(0), "Invalid addresses");
        require(winner != loser, "Winner and loser cannot be the same");
        
        battleWins[winner]++;
        
        // Pay winner
        require(address(this).balance >= BATTLE_WINNER_PAYOUT, "Insufficient balance for winner payout");
        payable(winner).transfer(BATTLE_WINNER_PAYOUT);
        
        emit BattleCompleted(winner, loser, BATTLE_WINNER_PAYOUT);
    }
    
    /**
     * Allocate weekly rewards for memory games (called by owner every Sunday 20:00 UTC)
     */
    function allocateWeeklyRewards(
        GameMode gameMode,
        uint256 buyInAmount,
        address[5] calldata topPlayers
    ) external onlyOwner {
        require(gameMode == GameMode.MUSIC_MEMORY || gameMode == GameMode.CLASSIC_MEMORY || gameMode == GameMode.MEMOMOMU, "Invalid game mode");
        
        uint256 weekId = getCurrentWeekId();
        uint256 treasuryAmount = treasuries[gameMode][buyInAmount];
        require(treasuryAmount > 0, "No treasury funds available");
        
        uint256 totalRewards = (treasuryAmount * TREASURY_PERCENTAGE) / 10000;
        
        WeeklyReward storage reward = weeklyRewards[gameMode][buyInAmount][weekId];
        require(!reward.finalized, "Week already finalized");
        
        reward.weekStart = getWeekStart(weekId);
        reward.totalReward = totalRewards;
        reward.finalized = true;
        
        // Allocate to top 5 players
        uint256 remainingRewards = totalRewards;
        for (uint256 i = 0; i < 5; i++) {
            if (topPlayers[i] != address(0)) {
                uint256 playerReward = (totalRewards * weeklyPayoutPercentages[i]) / 10000;
                reward.topPlayers[i] = topPlayers[i];
                reward.allocatedAmounts[i] = playerReward;
                remainingRewards -= playerReward;
            }
        }
        
        // Reset treasury (unclaimed rewards from previous weeks stay allocated)
        treasuries[gameMode][buyInAmount] = treasuryAmount - totalRewards;
        
        emit WeeklyRewardsAllocated(gameMode, buyInAmount, weekId);
    }
    
    /**
     * Allocate weekly battle rewards
     */
    function allocateBattleWeeklyRewards(
        address[3] calldata topPlayers
    ) external onlyOwner {
        uint256 weekId = getCurrentWeekId();
        require(battleTreasury > 0, "No battle treasury funds");
        
        WeeklyReward storage reward = battleWeeklyRewards[weekId];
        require(!reward.finalized, "Battle week already finalized");
        
        reward.weekStart = getWeekStart(weekId);
        reward.totalReward = battleTreasury;
        reward.finalized = true;
        
        // Allocate to top 3 players
        for (uint256 i = 0; i < 3; i++) {
            if (topPlayers[i] != address(0)) {
                uint256 playerReward = (battleTreasury * battleWeeklyPayouts[i]) / 10000;
                reward.topPlayers[i] = topPlayers[i];
                reward.allocatedAmounts[i] = playerReward;
            }
        }
        
        battleTreasury = 0; // Reset battle treasury
    }
    
    /**
     * Claim weekly rewards for memory games
     */
    function claimWeeklyReward(GameMode gameMode, uint256 buyInAmount, uint256 weekId) external {
        WeeklyReward storage reward = weeklyRewards[gameMode][buyInAmount][weekId];
        require(reward.finalized, "Rewards not yet allocated");
        require(!reward.claimed[msg.sender], "Already claimed");
        require(block.timestamp <= reward.weekStart + REWARD_DEADLINE, "Claim deadline passed");
        
        uint256 playerRank = 5; // Default to not found
        for (uint256 i = 0; i < 5; i++) {
            if (reward.topPlayers[i] == msg.sender) {
                playerRank = i;
                break;
            }
        }
        require(playerRank < 5, "Not eligible for rewards");
        
        uint256 amount = reward.allocatedAmounts[playerRank];
        require(amount > 0, "No reward allocated");
        
        reward.claimed[msg.sender] = true;
        payable(msg.sender).transfer(amount);
        
        emit RewardClaimed(msg.sender, gameMode, buyInAmount, amount);
    }
    
    /**
     * Claim battle weekly rewards
     */
    function claimBattleReward(uint256 weekId) external {
        WeeklyReward storage reward = battleWeeklyRewards[weekId];
        require(reward.finalized, "Battle rewards not yet allocated");
        require(!reward.claimed[msg.sender], "Already claimed");
        require(block.timestamp <= reward.weekStart + REWARD_DEADLINE, "Claim deadline passed");
        
        uint256 playerRank = 3; // Default to not found
        for (uint256 i = 0; i < 3; i++) {
            if (reward.topPlayers[i] == msg.sender) {
                playerRank = i;
                break;
            }
        }
        require(playerRank < 3, "Not eligible for battle rewards");
        
        uint256 amount = reward.allocatedAmounts[playerRank];
        require(amount > 0, "No reward allocated");
        
        reward.claimed[msg.sender] = true;
        payable(msg.sender).transfer(amount);
        
        emit BattleRewardClaimed(msg.sender, weekId, amount);
    }
    
    /**
     * Get current week ID based on Sunday 20:00 UTC
     */
    function getCurrentWeekId() public view returns (uint256) {
        // Week starts on Sunday 20:00 UTC
        uint256 adjustedTimestamp = block.timestamp + 4 hours; // Adjust for Sunday 20:00 UTC
        return adjustedTimestamp / WEEK_DURATION;
    }
    
    /**
     * Get week start timestamp
     */
    function getWeekStart(uint256 weekId) public pure returns (uint256) {
        return (weekId * WEEK_DURATION) - 4 hours; // Adjust back for Sunday 20:00 UTC
    }
    
    /**
     * Check if player is eligible for rewards in a specific week
     */
    function isEligibleForReward(
        GameMode gameMode,
        uint256 buyInAmount,
        uint256 weekId,
        address player
    ) external view returns (bool, uint256) {
        WeeklyReward storage reward = weeklyRewards[gameMode][buyInAmount][weekId];
        
        for (uint256 i = 0; i < 5; i++) {
            if (reward.topPlayers[i] == player) {
                return (true, reward.allocatedAmounts[i]);
            }
        }
        return (false, 0);
    }
    
    /**
     * Check if player is eligible for battle rewards
     */
    function isEligibleForBattleReward(uint256 weekId, address player) external view returns (bool, uint256) {
        WeeklyReward storage reward = battleWeeklyRewards[weekId];
        
        for (uint256 i = 0; i < 3; i++) {
            if (reward.topPlayers[i] == player) {
                return (true, reward.allocatedAmounts[i]);
            }
        }
        return (false, 0);
    }
    
    /**
     * Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * Update owner
     */
    function updateOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
    
    /**
     * Get treasury balance for a specific game and buy-in
     */
    function getTreasuryBalance(GameMode gameMode, uint256 buyInAmount) external view returns (uint256) {
        return treasuries[gameMode][buyInAmount];
    }
    
    // Fallback function to receive MON
    receive() external payable {}
}