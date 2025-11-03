// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBorrowerOperations.sol";
import "../interfaces/IMUSD.sol";

/**
 * @title MockBorrowerOperations
 * @notice Mock BorrowerOperations for testing MezoIntegration
 */
contract MockBorrowerOperations is IBorrowerOperations {
    IMUSD public musdToken;
    mapping(address => uint256) public userDebt;
    mapping(address => address) public troveOwner; // Track who owns each trove

    constructor(address _musdToken) {
        musdToken = IMUSD(_musdToken);
    }

    function openTrove(
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external payable {
        // Mock implementation - just mint MUSD to user
        userDebt[msg.sender] += _debtAmount;
        musdToken.mint(msg.sender, _debtAmount);
    }

    function addColl(address _upperHint, address _lowerHint) external payable {
        // Mock implementation
    }

    function repayMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external {
        // In real BorrowerOperations, this would check the caller's trove
        // For mock, we use the upperHint to pass the debtor address
        // (In real scenario, BorrowerOperations would track troves differently)
        
        // Simple workaround: store the user address in _upperHint
        // In tests, we can pass user address as hint
        address debtor = _upperHint != address(0) && _upperHint.code.length == 0 
            ? _upperHint 
            : msg.sender; // Fallback to caller
        
        // Transfer MUSD from caller (integration contract) and burn it
        require(
            musdToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
            
        // Cap repayment at actual debt (real BorrowerOperations would do this)
        uint256 actualRepay = _amount;
        if (_amount > userDebt[debtor]) {
            actualRepay = userDebt[debtor];
        }
        
        require(userDebt[debtor] > 0, "No debt to repay");
        userDebt[debtor] -= actualRepay;
        
        // Burn only the amount that was actually repaid
        musdToken.burn(address(this), actualRepay);
        
        // If we tried to repay more than debt, refund the excess
        if (_amount > actualRepay) {
            require(
                musdToken.transfer(debtor, _amount - actualRepay),
                "Refund failed"
            );
        }
    }

    function closeTrove() external {
        userDebt[msg.sender] = 0;
    }
}

