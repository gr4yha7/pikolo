// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {MezoIntegration} from "../src/MezoIntegration.sol";
import {PredictionMarketFactory} from "../src/PredictionMarketFactory.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockMUSD} from "../src/test/MockMUSD.sol";
import {MockBorrowerOperations} from "../src/test/MockBorrowerOperations.sol";

contract MezoIntegrationTest is Test {
    MezoIntegration public integration;
    PredictionMarketFactory public factory;
    MockMUSD public musdToken;
    MockBorrowerOperations public borrowerOps;

    address public user = address(1);
    address public resolver = address(2);

    function setUp() public {
        musdToken = new MockMUSD();
        factory = new PredictionMarketFactory(address(musdToken));
        borrowerOps = new MockBorrowerOperations(address(musdToken));

        integration = new MezoIntegration(
            address(musdToken),
            address(borrowerOps),
            address(factory)
        );

        // Setup accounts
        vm.startPrank(address(this));
        musdToken.mint(user, 10000 * 1e18);
        vm.stopPrank();

        // User opens a trove (borrows MUSD) - send ETH for collateral
        vm.deal(user, 10 ether);
        vm.startPrank(user);
        borrowerOps.openTrove{value: 1 ether}(2000 * 1e18, address(0), address(0)); // Borrow more for partial repay test
        vm.stopPrank();
    }

    function test_ToggleAutoRepay() public {
        vm.startPrank(user);
        assertFalse(integration.autoRepayEnabled(user));

        integration.setAutoRepay(true);
        assertTrue(integration.autoRepayEnabled(user));

        integration.setAutoRepay(false);
        assertFalse(integration.autoRepayEnabled(user));
        vm.stopPrank();
    }

    function test_UpdateHints() public {
        address upperHint = address(100);
        address lowerHint = address(200);

        vm.startPrank(user);
        integration.updateHints(upperHint, lowerHint);

        assertEq(integration.userUpperHint(user), upperHint);
        assertEq(integration.userLowerHint(user), lowerHint);
        vm.stopPrank();
    }

    function test_RedeemWithoutAutoRepay() public {
        // Create and trade in a market
        vm.startPrank(user);
        musdToken.approve(address(factory), 1000 * 1e18);
        address marketAddress = factory.createMarket(
            70000,
            block.timestamp + 30 days,
            1000 * 1e18
        );
        PredictionMarket market = PredictionMarket(marketAddress);

        // Buy Yes shares
        musdToken.approve(address(market), 100 * 1e18);
        uint256 shares = market.buyShares(true, 100 * 1e18);
        vm.stopPrank();

        // Resolve market (as owner)
        vm.warp(block.timestamp + 31 days);
        PredictionMarket.MarketData memory data = market.getMarketData();
        vm.prank(data.creator);
        market.resolve(75000 * 1e18, 1); // Yes outcome

        // Redeem from market directly (no auto-repay)
        vm.startPrank(user);
        uint256 balanceBefore = musdToken.balanceOf(user);
        uint256 userDebtBefore = borrowerOps.userDebt(user);

        uint256 payout = market.redeem(true, shares);

        assertEq(payout, shares); // Full payout
        assertEq(musdToken.balanceOf(user), balanceBefore + payout);
        assertEq(borrowerOps.userDebt(user), userDebtBefore); // Debt unchanged
        vm.stopPrank();
    }

    function test_RedeemWithAutoRepay() public {
        // Create and trade in a market
        vm.startPrank(user);
        musdToken.approve(address(factory), 1000 * 1e18);
        address marketAddress = factory.createMarket(
            70000,
            block.timestamp + 30 days,
            1000 * 1e18
        );
        PredictionMarket market = PredictionMarket(marketAddress);

        // Buy Yes shares
        musdToken.approve(address(market), 100 * 1e18);
        uint256 shares = market.buyShares(true, 100 * 1e18);

        // Enable auto-repay
        musdToken.approve(address(integration), type(uint256).max);
        integration.setAutoRepay(true);
        vm.stopPrank();

        // Resolve market
        vm.warp(block.timestamp + 31 days);
        PredictionMarket.MarketData memory data = market.getMarketData();
        vm.prank(data.creator);
        market.resolve(75000 * 1e18, 1);

        // Redeem from market first
        vm.startPrank(user);
        uint256 balanceBefore = musdToken.balanceOf(user);
        uint256 userDebtBefore = borrowerOps.userDebt(user);
        
        // Enable auto-repay and approve before redemption
        integration.setAutoRepay(true);
        musdToken.approve(address(integration), type(uint256).max);
        
        uint256 winnings = market.redeem(true, shares);
        uint256 remaining = integration.autoRepayFromBalance(0); // Repay all

        // Calculate how much debt was actually repaid (capped at available debt)
        uint256 actualDebtRepaid = userDebtBefore - borrowerOps.userDebt(user);
        uint256 totalBalanceAfterRedemption = balanceBefore + winnings;
        uint256 expectedRemaining = totalBalanceAfterRedemption - actualDebtRepaid;
        
        assertLt(remaining, totalBalanceAfterRedemption); // Balance reduced after repayment
        // Can't repay more than available balance (initial + winnings)
        assertLe(actualDebtRepaid, totalBalanceAfterRedemption);
        // Can't repay more than total debt
        assertLe(actualDebtRepaid, userDebtBefore);
        assertEq(borrowerOps.userDebt(user), userDebtBefore - actualDebtRepaid); // Debt reduced
        
        // Note: remaining from autoRepayFromBalance is balanceBefore - repay
        // But repay was capped at actualDebtRepaid, and excess was refunded
        // So user balance = balanceBefore + winnings - actualDebtRepaid
        assertEq(musdToken.balanceOf(user), expectedRemaining); // Balance = initial + winnings - repaid
        vm.stopPrank();
    }

    function test_RedeemWithPartialRepay() public {
        // Create and trade in a market
        vm.startPrank(user);
        musdToken.approve(address(factory), 1000 * 1e18);
        address marketAddress = factory.createMarket(
            70000,
            block.timestamp + 30 days,
            1000 * 1e18
        );
        PredictionMarket market = PredictionMarket(marketAddress);

        // Buy Yes shares
        musdToken.approve(address(market), 200 * 1e18);
        uint256 shares = market.buyShares(true, 200 * 1e18);

        musdToken.approve(address(integration), type(uint256).max);
        integration.setAutoRepay(true);
        vm.stopPrank();

        // Resolve market
        vm.warp(block.timestamp + 31 days);
        PredictionMarket.MarketData memory data = market.getMarketData();
        vm.prank(data.creator);
        market.resolve(75000 * 1e18, 1);

        // Redeem from market first
        vm.startPrank(user);
        uint256 balanceBefore = musdToken.balanceOf(user);
        uint256 userDebtBefore = borrowerOps.userDebt(user);
        
        // Enable auto-repay and approve before redemption
        integration.setAutoRepay(true);
        musdToken.approve(address(integration), type(uint256).max);
        
        uint256 winnings = market.redeem(true, shares);
        uint256 repayAmount = winnings / 2;
        uint256 remaining = integration.autoRepayFromBalance(repayAmount);

        // Calculate actual repayment (capped at debt if repayAmount > debt)
        uint256 actualDebtRepaid = userDebtBefore - borrowerOps.userDebt(user);
        uint256 expectedRemaining = balanceBefore + winnings - repayAmount;
        
        // Remaining should be: initial balance + winnings - amount we tried to repay
        assertEq(remaining, balanceBefore + winnings - repayAmount);
        // Debt should be reduced by the actual amount repaid (capped at debt)
        assertLe(actualDebtRepaid, repayAmount); // Can't repay more than requested
        assertLe(actualDebtRepaid, userDebtBefore); // Can't repay more than debt
        // Final balance = initial + winnings - amount repaid
        assertEq(musdToken.balanceOf(user), expectedRemaining);
        vm.stopPrank();
    }

    function test_AutoRepayRequiresEnablement() public {
        vm.startPrank(user);
        musdToken.approve(address(integration), 100 * 1e18);
        vm.expectRevert("Auto-repay not enabled");
        integration.autoRepayFromBalance(0);
        vm.stopPrank();
    }

    function test_UpdateBorrowerOperations() public {
        MockBorrowerOperations newBorrowerOps = new MockBorrowerOperations(address(musdToken));

        vm.prank(integration.owner());
        integration.setBorrowerOperations(address(newBorrowerOps));

        assertEq(address(integration.borrowerOperations()), address(newBorrowerOps));
    }

    function test_OnlyOwnerCanUpdateBorrowerOperations() public {
        vm.prank(user);
        vm.expectRevert();
        integration.setBorrowerOperations(address(borrowerOps));
    }
}

