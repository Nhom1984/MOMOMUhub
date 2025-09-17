// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MEMOMUTreasury
 * @dev Main treasury contract for MEMOMUhub pay-to-play functionality
 * Manages buy-ins, treasuries, and payouts for all game modes on Monad blockchain
 */
contract MEMOMUTreasury {
    
    // Events for transparency and frontend integration
    event BuyInReceived(address indexed player, string gameMode, uint256 amount, uint256 timestamp);
    event WeeklyPayoutPrepared(string gameMode, uint256 amount, address[] topPlayers, uint256[] payouts);
    event PayoutWithdrawn(address indexed player, string gameMode, uint256 amount, uint256 week);
    event InstantPayout(address indexed player, string gameMode, uint256 amount, uint256 multiplier);
    event BattlePayout(address indexed winner, uint256 amount);
    
    // Contract owner (for emergency functions and setup)
    address public owner;
    
    // Game mode identifiers
    string constant MUSIC_MEMORY = "musicMemory";
    string constant MEMORY_CLASSIC = "memoryClassic"; 
    string constant MEMORY_MEMOMU = "memoryMemomu";
    string constant MONLUCK = "monluck";
    string constant BATTLE = "battle";
    
    // Treasury structures for each game mode and buy-in amount
    struct Treasury {
        uint256 balance;           // Current treasury balance
        uint256 totalBuyIns;      // Total buy-ins received
        uint256 totalPayouts;     // Total payouts made
    }
    
    // Weekly leaderboard payout structure
    struct WeeklyPayout {
        uint256 week;              // Week number (calculated from contract deployment)
        uint256 totalAmount;      // Total amount to distribute (90% of treasury)
        address[5] topPlayers;     // Top 5 players
        uint256[5] payoutAmounts; // Individual payout amounts: 50%, 25%, 15%, 7%, 3%
        bool prepared;             // Whether payouts have been calculated
        mapping(address => bool) withdrawn; // Track withdrawals
    }
    
    // Battle treasury for weekly battle winner payouts
    struct BattleTreasury {
        uint256 balance;
        uint256 week;
        address[3] topPlayers;     // Top 3 battle winners
        uint256[3] payoutAmounts; // 50%, 30%, 20%
        bool prepared;
        mapping(address => bool) withdrawn;
    }
    
    // Treasuries by game mode and buy-in amount (in wei)
    // Format: gameMode => buyInAmount => Treasury
    mapping(string => mapping(uint256 => Treasury)) public treasuries;
    
    // Weekly payouts by game mode, buy-in amount, and week
    mapping(string => mapping(uint256 => mapping(uint256 => WeeklyPayout))) public weeklyPayouts;
    
    // Battle treasuries by week
    mapping(uint256 => BattleTreasury) public battleTreasuries;
    
    // Current week calculation (starts from contract deployment)
    uint256 public contractDeployTime;
    uint256 constant WEEK_DURATION = 7 days;
    
    // MONLUCK multipliers for instant payouts
    mapping(uint256 => uint256) public monluckMultipliers; // images found => multiplier (in basis points)
    
    // Authorized game logic contract (will call payout functions)
    address public gameLogicContract;
    
    constructor() {
        owner = msg.sender;
        contractDeployTime = block.timestamp;
        
        // Set MONLUCK multipliers (in basis points: 10000 = 100%)  
        monluckMultipliers[2] = 15000; // 2 images = 1.5x
        monluckMultipliers[3] = 24000; // 3 images = 2.4x
        monluckMultipliers[4] = 50000; // 4 images = 5x
        monluckMultipliers[5] = 100000; // 5 images = 10x
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyGameLogic() {
        require(msg.sender == gameLogicContract, "Only game logic contract can call this function");
        _;
    }
    
    /**
     * @dev Set the authorized game logic contract address
     */
    function setGameLogicContract(address _gameLogicContract) external onlyOwner {
        gameLogicContract = _gameLogicContract;
    }
    
    /**
     * @dev Get current week number based on contract deployment time
     */
    function getCurrentWeek() public view returns (uint256) {
        return (block.timestamp - contractDeployTime) / WEEK_DURATION;
    }
    
    /**
     * @dev Check if we're in payout preparation window (Sunday 20:00 UTC)
     */
    function isPayoutPreparationTime() public view returns (bool) {
        uint256 dayOfWeek = ((block.timestamp / 86400) + 4) % 7; // 0 = Sunday
        uint256 hourOfDay = (block.timestamp % 86400) / 3600;
        return dayOfWeek == 0 && hourOfDay >= 20; // Sunday 20:00 UTC or later
    }
    
    /**
     * @dev Accept buy-ins for memory games (Music Memory, Classic Memory, MEMOMU)
     * @param gameMode The game mode identifier
     */
    function buyIn(string memory gameMode) external payable {
        require(msg.value == 0.1 ether || msg.value == 1 ether, "Buy-in must be 0.1 or 1 MON");
        require(
            keccak256(bytes(gameMode)) == keccak256(bytes(MUSIC_MEMORY)) ||
            keccak256(bytes(gameMode)) == keccak256(bytes(MEMORY_CLASSIC)) ||
            keccak256(bytes(gameMode)) == keccak256(bytes(MEMORY_MEMOMU)),
            "Invalid game mode for buy-in"
        );
        
        treasuries[gameMode][msg.value].balance += msg.value;
        treasuries[gameMode][msg.value].totalBuyIns += msg.value;
        
        emit BuyInReceived(msg.sender, gameMode, msg.value, block.timestamp);
    }
    
    /**
     * @dev Accept wagers for MONLUCK (0.1 to 2 MON)
     */
    function monluckWager() external payable {
        require(msg.value >= 0.1 ether && msg.value <= 2 ether, "Wager must be between 0.1 and 2 MON");
        
        // For MONLUCK, we don't separate by wager amount - all goes to one treasury
        treasuries[MONLUCK][0].balance += msg.value;
        treasuries[MONLUCK][0].totalBuyIns += msg.value;
        
        emit BuyInReceived(msg.sender, MONLUCK, msg.value, block.timestamp);
    }
    
    /**
     * @dev Accept battle entry fees (1 MON per player)
     */
    function battleEntry() external payable {
        require(msg.value == 1 ether, "Battle entry fee must be 1 MON");
        
        uint256 currentWeek = getCurrentWeek();
        
        // 0.6 MON goes to winner payout pool, 0.4 MON goes to weekly battle treasury
        uint256 winnerAmount = 0.6 ether;
        uint256 treasuryAmount = 0.4 ether;
        
        treasuries[BATTLE][0].balance += winnerAmount; // Available for immediate winner payout
        battleTreasuries[currentWeek].balance += treasuryAmount; // Goes to weekly leaderboard
        
        emit BuyInReceived(msg.sender, BATTLE, msg.value, block.timestamp);
    }
    
    /**
     * @dev Instant payout for MONLUCK wins (called by game logic contract)
     * @param player The winning player
     * @param wagerAmount The original wager amount  
     * @param imagesFound Number of monad images found (2-5)
     */
    function payoutMonluckWin(address player, uint256 wagerAmount, uint256 imagesFound) external onlyGameLogic {
        require(imagesFound >= 2 && imagesFound <= 5, "Invalid images found count");
        require(monluckMultipliers[imagesFound] > 0, "No multiplier for this count");
        
        uint256 multiplier = monluckMultipliers[imagesFound];
        uint256 winAmount = (wagerAmount * multiplier) / 10000;
        
        require(treasuries[MONLUCK][0].balance >= winAmount, "Insufficient treasury balance");
        
        treasuries[MONLUCK][0].balance -= winAmount;
        treasuries[MONLUCK][0].totalPayouts += winAmount;
        
        payable(player).transfer(winAmount);
        
        emit InstantPayout(player, MONLUCK, winAmount, multiplier);
    }
    
    /**
     * @dev Instant payout for battle winner (called by game logic contract)
     * @param winner The winning player
     */
    function payoutBattleWin(address winner) external onlyGameLogic {
        uint256 winAmount = 1.5 ether; // Winner gets 1.5 MON
        
        require(treasuries[BATTLE][0].balance >= winAmount, "Insufficient battle treasury balance");
        
        treasuries[BATTLE][0].balance -= winAmount;
        treasuries[BATTLE][0].totalPayouts += winAmount;
        
        payable(winner).transfer(winAmount);
        
        emit BattlePayout(winner, winAmount);
    }
    
    /**
     * @dev Get treasury balance for a specific game mode and buy-in amount
     */
    function getTreasuryBalance(string memory gameMode, uint256 buyInAmount) external view returns (uint256) {
        return treasuries[gameMode][buyInAmount].balance;
    }
    
    /**
     * @dev Emergency withdrawal function (only owner, for extreme cases)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}