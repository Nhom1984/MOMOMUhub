// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MEMOMUhub Game Contract
 * @dev Manages buy-ins, treasuries, and reward distributions for MEMOMU games
 * @author Nhom1984
 */
contract MEMOMUhub {
    // Owner of the contract (for administrative functions)
    address public owner;
    
    // Game modes
    enum GameMode { MusicMemory, ClassicMemory, MEMOMU, Monluck, Battle }
    string[] public gameModeNames = ["MusicMemory", "ClassicMemory", "MEMOMU", "Monluck", "Battle"];
    
    // Buy-in amounts in wei (0.1 MON and 1 MON)
    uint256 public constant BUY_IN_LOW = 0.1 ether;  // 0.1 MON
    uint256 public constant BUY_IN_HIGH = 1 ether;   // 1 MON
    uint256 public constant BATTLE_BUY_IN = 1 ether; // 1 MON for battle
    
    // Weekly tournament structure
    struct WeeklyTournament {
        uint256 week;           // Week number (Unix timestamp / 1 week)
        uint256 endTime;        // Sunday 20:00 UTC
        uint256 treasury;       // Total buy-ins for this tournament
        address[5] topPlayers;  // Top 5 players
        uint256[5] topScores;   // Top 5 scores
        bool distributed;       // Whether rewards have been distributed
        uint256 withdrawDeadline; // Deadline for withdrawals
    }
    
    // Treasury pools: gameMode => buyInAmount => week => tournament
    mapping(GameMode => mapping(uint256 => mapping(uint256 => WeeklyTournament))) public weeklyTournaments;
    
    // Battle treasury (accumulates 0.4 MON per battle)
    mapping(uint256 => uint256) public battleTreasury; // week => amount
    mapping(uint256 => address[3]) public battleTopPlayers; // week => top 3 players
    mapping(uint256 => uint256[3]) public battleTopWins; // week => top 3 win counts
    
    // Player winnings available for withdrawal
    mapping(address => uint256) public pendingWithdrawals;
    
    // Battle win tracking
    mapping(address => uint256) public battleWins;
    
    // MONLUCK multipliers
    uint256[6] public monluckMultipliers = [0, 0, 150, 240, 500, 1000]; // Index = monad count, value = multiplier * 100
    
    // Events
    event BuyIn(address indexed player, GameMode gameMode, uint256 buyInAmount, uint256 week);
    event BattleEntry(address indexed player1, address indexed player2, address indexed winner, uint256 winnings);
    event MonluckPayout(address indexed player, uint256 wager, uint256 monads, uint256 payout);
    event WeeklyRewardsDistributed(GameMode gameMode, uint256 buyInAmount, uint256 week, address[5] winners, uint256[5] amounts);
    event BattleRewardsDistributed(uint256 week, address[3] winners, uint256[3] amounts);
    event Withdrawal(address indexed player, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Get current week number based on timestamp
     */
    function getCurrentWeek() public view returns (uint256) {
        return block.timestamp / 1 weeks;
    }
    
    /**
     * @dev Get week end time (Sunday 20:00 UTC)
     */
    function getWeekEndTime(uint256 week) public pure returns (uint256) {
        // Calculate Sunday 20:00 UTC for the given week
        uint256 weekStart = week * 1 weeks;
        uint256 sundayMidnight = weekStart + (6 * 1 days); // Sunday at 00:00
        return sundayMidnight + (20 * 1 hours); // Sunday at 20:00
    }
    
    /**
     * @dev Player buys into a weekly tournament game
     */
    function buyInWeeklyGame(GameMode gameMode, uint256 buyInAmount) external payable {
        require(gameMode == GameMode.MusicMemory || gameMode == GameMode.ClassicMemory || gameMode == GameMode.MEMOMU, 
                "Invalid game mode for weekly tournament");
        require(buyInAmount == BUY_IN_LOW || buyInAmount == BUY_IN_HIGH, "Invalid buy-in amount");
        require(msg.value == buyInAmount, "Incorrect payment amount");
        
        uint256 currentWeek = getCurrentWeek();
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][buyInAmount][currentWeek];
        
        // Initialize tournament if first buy-in
        if (tournament.endTime == 0) {
            tournament.week = currentWeek;
            tournament.endTime = getWeekEndTime(currentWeek);
            tournament.withdrawDeadline = tournament.endTime + 1 weeks;
        }
        
        // Add to treasury
        tournament.treasury += msg.value;
        
        emit BuyIn(msg.sender, gameMode, buyInAmount, currentWeek);
    }
    
    /**
     * @dev Update leaderboard for weekly tournament
     */
    function updateWeeklyLeaderboard(GameMode gameMode, uint256 buyInAmount, address player, uint256 score) external onlyOwner {
        uint256 currentWeek = getCurrentWeek();
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][buyInAmount][currentWeek];
        
        // Check if score qualifies for top 5
        for (uint256 i = 0; i < 5; i++) {
            if (score > tournament.topScores[i]) {
                // Shift lower scores down
                for (uint256 j = 4; j > i; j--) {
                    tournament.topPlayers[j] = tournament.topPlayers[j-1];
                    tournament.topScores[j] = tournament.topScores[j-1];
                }
                // Insert new score
                tournament.topPlayers[i] = player;
                tournament.topScores[i] = score;
                break;
            }
        }
    }
    
    /**
     * @dev Distribute weekly tournament rewards (called after Sunday 20:00 UTC)
     */
    function distributeWeeklyRewards(GameMode gameMode, uint256 buyInAmount, uint256 week) external onlyOwner {
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][buyInAmount][week];
        require(block.timestamp >= tournament.endTime, "Tournament not ended yet");
        require(!tournament.distributed, "Rewards already distributed");
        require(tournament.treasury > 0, "No treasury to distribute");
        
        tournament.distributed = true;
        
        // 90% of treasury goes to top 5 players: 50%, 25%, 15%, 7%, 3%
        uint256 totalRewards = (tournament.treasury * 90) / 100;
        uint256[5] memory percentages = [50, 25, 15, 7, 3];
        uint256[5] memory amounts;
        address[5] memory winners = tournament.topPlayers;
        
        for (uint256 i = 0; i < 5; i++) {
            if (winners[i] != address(0)) {
                amounts[i] = (totalRewards * percentages[i]) / 100;
                pendingWithdrawals[winners[i]] += amounts[i];
            }
        }
        
        emit WeeklyRewardsDistributed(gameMode, buyInAmount, week, winners, amounts);
    }
    
    /**
     * @dev Enter a battle (both players must call this)
     */
    function enterBattle() external payable {
        require(msg.value == BATTLE_BUY_IN, "Must pay 1 MON to enter battle");
        
        uint256 currentWeek = getCurrentWeek();
        battleTreasury[currentWeek] += 0.4 ether; // 0.4 MON goes to weekly treasury
        
        // 0.6 MON available for winner (1.5 MON total payout - 0.4 MON to treasury - 0.5 MON covers both entries)
        // Winner gets 1.5 MON total
    }
    
    /**
     * @dev Complete battle and pay winner
     */
    function completeBattle(address winner, address loser) external onlyOwner {
        require(winner != address(0) && loser != address(0), "Invalid players");
        require(winner != loser, "Winner and loser cannot be the same");
        
        // Pay winner 1.5 MON instantly
        pendingWithdrawals[winner] += 1.5 ether;
        
        // Update battle wins
        battleWins[winner]++;
        
        // Update weekly battle leaderboard
        uint256 currentWeek = getCurrentWeek();
        updateBattleLeaderboard(winner, currentWeek);
        
        emit BattleEntry(winner, loser, winner, 1.5 ether);
    }
    
    /**
     * @dev Update battle leaderboard for weekly rewards
     */
    function updateBattleLeaderboard(address player, uint256 week) internal {
        uint256 wins = battleWins[player];
        address[3] storage topPlayers = battleTopPlayers[week];
        uint256[3] storage topWins = battleTopWins[week];
        
        // Check if wins qualify for top 3
        for (uint256 i = 0; i < 3; i++) {
            if (wins > topWins[i]) {
                // Shift lower positions down
                for (uint256 j = 2; j > i; j--) {
                    topPlayers[j] = topPlayers[j-1];
                    topWins[j] = topWins[j-1];
                }
                // Insert new entry
                topPlayers[i] = player;
                topWins[i] = wins;
                break;
            }
        }
    }
    
    /**
     * @dev Distribute weekly battle rewards
     */
    function distributeBattleRewards(uint256 week) external onlyOwner {
        require(battleTreasury[week] > 0, "No battle treasury for this week");
        
        uint256 totalRewards = battleTreasury[week];
        uint256[3] memory percentages = [50, 30, 20]; // Top 3 get 50%, 30%, 20%
        uint256[3] memory amounts;
        address[3] memory winners = battleTopPlayers[week];
        
        for (uint256 i = 0; i < 3; i++) {
            if (winners[i] != address(0)) {
                amounts[i] = (totalRewards * percentages[i]) / 100;
                pendingWithdrawals[winners[i]] += amounts[i];
            }
        }
        
        battleTreasury[week] = 0; // Mark as distributed
        
        emit BattleRewardsDistributed(week, winners, amounts);
    }
    
    /**
     * @dev Play MONLUCK with instant payout
     */
    function playMonluck(uint256 monads) external payable {
        require(msg.value >= 0.1 ether && msg.value <= 2 ether, "Wager must be between 0.1 and 2 MON");
        require(monads >= 2 && monads <= 5, "Must hit 2-5 monads to win");
        
        uint256 multiplier = monluckMultipliers[monads];
        uint256 payout = (msg.value * multiplier) / 100;
        
        if (payout > 0) {
            pendingWithdrawals[msg.sender] += payout;
        }
        
        emit MonluckPayout(msg.sender, msg.value, monads, payout);
    }
    
    /**
     * @dev Withdraw pending winnings
     */
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Check if player has winnings available for withdrawal
     */
    function getPendingWithdrawal(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }
    
    /**
     * @dev Get tournament info
     */
    function getTournamentInfo(GameMode gameMode, uint256 buyInAmount, uint256 week) external view returns (
        uint256 treasury,
        uint256 endTime,
        address[5] memory topPlayers,
        uint256[5] memory topScores,
        bool distributed,
        uint256 withdrawDeadline
    ) {
        WeeklyTournament storage tournament = weeklyTournaments[gameMode][buyInAmount][week];
        return (
            tournament.treasury,
            tournament.endTime,
            tournament.topPlayers,
            tournament.topScores,
            tournament.distributed,
            tournament.withdrawDeadline
        );
    }
    
    /**
     * @dev Emergency functions for owner
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
    fallback() external payable {}
}