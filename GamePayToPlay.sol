// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * GamePayToPlay - Simple pay-to-play contract for MEMOMU Game on Monad
 * Players pay 0.01 MON to play games, funds go to contract owner
 */
contract GamePayToPlay {
    address public owner;
    uint256 public constant PLAY_COST = 0.01 ether; // 0.01 MON (using ether units for MON)
    uint256 public totalCollected;
    
    // Events for tracking payments
    event PaymentReceived(address indexed player, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    
    // Track payments by player
    mapping(address => uint256) public playerPayments;
    mapping(address => uint256) public playerGameCount;
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * Pay to play function - players call this to pay before playing
     * Must send exactly 0.01 MON
     */
    function payToPlay() external payable {
        require(msg.value == PLAY_COST, "Must pay exactly 0.01 MON to play");
        
        // Record payment
        playerPayments[msg.sender] += msg.value;
        playerGameCount[msg.sender] += 1;
        totalCollected += msg.value;
        
        emit PaymentReceived(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * Get player's total payments
     */
    function getPlayerPayments(address player) external view returns (uint256) {
        return playerPayments[player];
    }
    
    /**
     * Get player's game count
     */
    function getPlayerGameCount(address player) external view returns (uint256) {
        return playerGameCount[player];
    }
    
    /**
     * Owner can withdraw collected funds
     */
    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(address(this).balance > 0, "No funds to withdraw");
        
        uint256 amount = address(this).balance;
        emit FundsWithdrawn(owner, amount);
        
        payable(owner).transfer(amount);
    }
    
    /**
     * Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * Transfer ownership (if needed)
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner can transfer ownership");
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}