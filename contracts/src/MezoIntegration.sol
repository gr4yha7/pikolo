// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IMUSD.sol";
import "./interfaces/IBorrowerOperations.sol";
import "./PredictionMarket.sol";
import "./PredictionMarketFactory.sol";

/**
 * @title MezoIntegration
 * @notice Optional wrapper for integrating prediction market winnings with Mezo protocol
 * @dev Allows users to automatically repay Mezo debt from market winnings
 */
contract MezoIntegration is Ownable, ReentrancyGuard {
    // ============ State Variables ============
    IMUSD public immutable musdToken;
    IBorrowerOperations public borrowerOperations;
    PredictionMarketFactory public immutable marketFactory;

    // User preferences
    mapping(address => bool) public autoRepayEnabled; // Whether user wants auto-repay
    mapping(address => address) public userUpperHint; // Upper hint for gas optimization
    mapping(address => address) public userLowerHint; // Lower hint for gas optimization

    // ============ Events ============
    event AutoRepayToggled(address indexed user, bool enabled);
    event HintsUpdated(address indexed user, address upperHint, address lowerHint);
    event DebtRepaid(address indexed user, uint256 amount, address indexed market);

    // ============ Constructor ============
    constructor(
        address _musdToken,
        address _borrowerOperations,
        address _marketFactory
    ) Ownable(msg.sender) {
        require(_musdToken != address(0), "Invalid MUSD address");
        require(_borrowerOperations != address(0), "Invalid BorrowerOperations address");
        require(_marketFactory != address(0), "Invalid MarketFactory address");

        musdToken = IMUSD(_musdToken);
        borrowerOperations = IBorrowerOperations(_borrowerOperations);
        marketFactory = PredictionMarketFactory(_marketFactory);
    }

    // ============ User Functions ============

    /**
     * @notice Toggle auto-repay functionality
     * @param _enabled True to enable auto-repay, false to disable
     */
    function setAutoRepay(bool _enabled) external {
        autoRepayEnabled[msg.sender] = _enabled;
        emit AutoRepayToggled(msg.sender, _enabled);
    }

    /**
     * @notice Update hints for gas optimization
     * @param _upperHint Upper hint address
     * @param _lowerHint Lower hint address
     */
    function updateHints(address _upperHint, address _lowerHint) external {
        userUpperHint[msg.sender] = _upperHint;
        userLowerHint[msg.sender] = _lowerHint;
        emit HintsUpdated(msg.sender, _upperHint, _lowerHint);
    }

    /**
     * @notice Helper function to repay debt from MUSD balance
     * @param _repayAmount Amount of MUSD to use for debt repayment (0 = use all available)
     * @return remaining Amount of MUSD remaining after repayment
     */
    function repayDebtFromBalance(uint256 _repayAmount) external nonReentrant returns (uint256 remaining) {
        uint256 balance = musdToken.balanceOf(msg.sender);
        require(balance > 0, "No balance");

        uint256 repay = _repayAmount == 0 ? balance : _repayAmount;
        if (repay > balance) repay = balance;

        // User needs to approve this contract to spend MUSD
        require(
            musdToken.transferFrom(msg.sender, address(this), repay),
            "Transfer failed"
        );

        // Approve BorrowerOperations to spend MUSD
        require(
            musdToken.approve(address(borrowerOperations), repay),
            "Approve failed"
        );

        // Repay debt
        address upperHint = userUpperHint[msg.sender] != address(0)
            ? userUpperHint[msg.sender]
            : address(0);
        address lowerHint = userLowerHint[msg.sender] != address(0)
            ? userLowerHint[msg.sender]
            : address(0);

        borrowerOperations.repayMUSD(repay, upperHint, lowerHint);

        emit DebtRepaid(msg.sender, repay, address(0));
        return balance - repay;
    }

    /**
     * @notice Redeem market winnings and optionally repay Mezo debt
     * @dev User must first redeem shares from market, then can use this to auto-repay
     * @param _repayAmount Amount of MUSD to use for debt repayment (0 = repay all debt, or balance if debt is higher)
     * @return remaining Amount of MUSD remaining after repayment
     */
    function autoRepayFromBalance(uint256 _repayAmount) external nonReentrant returns (uint256 remaining) {
        require(autoRepayEnabled[msg.sender], "Auto-repay not enabled");

        uint256 balanceBefore = musdToken.balanceOf(msg.sender);
        require(balanceBefore > 0, "No balance");

        uint256 repay = _repayAmount;
        if (_repayAmount == 0) {
            // When 0, repay all available balance
            // The BorrowerOperations contract will cap at actual debt amount
            // and refund any excess (handled by the contract)
            repay = balanceBefore;
        }
        if (repay > balanceBefore) repay = balanceBefore;

        // User needs to approve this contract to spend MUSD
        require(
            musdToken.transferFrom(msg.sender, address(this), repay),
            "Transfer failed"
        );

        // Approve BorrowerOperations to spend MUSD
        require(
            musdToken.approve(address(borrowerOperations), repay),
            "Approve failed"
        );

        // Repay debt
        // Use user address as upperHint for mock compatibility (real contract uses hints)
        address upperHint = userUpperHint[msg.sender] != address(0)
            ? userUpperHint[msg.sender]
            : msg.sender; // Use user address as hint for mock compatibility
        address lowerHint = userLowerHint[msg.sender] != address(0)
            ? userLowerHint[msg.sender]
            : address(0);

        // Transfer repay amount from user to this contract
        // The BorrowerOperations contract will enforce debt limits
        // and refund any excess if repay amount > debt
        borrowerOperations.repayMUSD(repay, upperHint, lowerHint);
        
        // Get final balance after repayment (includes any refund if repay > debt)
        uint256 balanceAfter = musdToken.balanceOf(msg.sender);
        
        // Calculate actual amount repaid (money taken from user)
        // If repay > debt, BorrowerOperations refunds excess, so:
        // balanceAfter = balanceBefore - actualDebtRepaid
        // Therefore: actualDebtRepaid = balanceBefore - balanceAfter
        uint256 actualRepaid;
        if (balanceBefore > balanceAfter) {
            actualRepaid = balanceBefore - balanceAfter;
        } else {
            // This shouldn't happen, but handle gracefully
            actualRepaid = 0;
        }

        emit DebtRepaid(msg.sender, actualRepaid, address(0));
        // Return remaining balance (what user actually has after repayment)
        remaining = balanceAfter;
        return remaining;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update BorrowerOperations address (admin only)
     * @param _borrowerOperations New BorrowerOperations address
     */
    function setBorrowerOperations(address _borrowerOperations) external onlyOwner {
        require(_borrowerOperations != address(0), "Invalid address");
        borrowerOperations = IBorrowerOperations(_borrowerOperations);
    }
}

