// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockMUSD} from "../src/test/MockMUSD.sol";
import {PredictionMarketFactory} from "../src/PredictionMarketFactory.sol";

contract PredictionMarketTest is Test {
    PredictionMarket public market;
    PredictionMarketFactory public factory;
    MockMUSD public musdToken;

    address public creator = address(1);
    address public trader1 = address(2);
    address public trader2 = address(3);

    uint256 public constant THRESHOLD = 70000 * 1e18; // $70,000
    uint256 public constant INITIAL_LIQUIDITY = 1000 * 1e18; // 1000 MUSD
    uint256 public expirationTime;

    function setUp() public {
        // Deploy MUSD token
        musdToken = new MockMUSD();

        // Deploy Factory
        factory = new PredictionMarketFactory(address(musdToken));

        // Set expiration to 30 days from now
        expirationTime = block.timestamp + 30 days;

        // Setup accounts with MUSD
        vm.startPrank(address(this));
        musdToken.mint(creator, 10000 * 1e18);
        musdToken.mint(trader1, 10000 * 1e18);
        musdToken.mint(trader2, 10000 * 1e18);
        vm.stopPrank();

        // Create market as creator
        vm.startPrank(creator);
        musdToken.approve(address(factory), INITIAL_LIQUIDITY);
        address marketAddress = factory.createMarket(
            THRESHOLD / 1e18, // Threshold in USD (will be scaled internally)
            expirationTime,
            INITIAL_LIQUIDITY
        );
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
    }

    // ============ Market Creation Tests ============

    function test_MarketCreation() public {
        PredictionMarket.MarketData memory data = market.getMarketData();
        assertEq(data.threshold, THRESHOLD);
        assertEq(data.expirationTime, expirationTime);
        assertEq(data.creator, creator);
        assertTrue(data.status == PredictionMarket.MarketStatus.Pending);
        assertEq(market.reserveYes(), INITIAL_LIQUIDITY / 2);
        assertEq(market.reserveNo(), INITIAL_LIQUIDITY / 2);
    }

    function test_MarketCreationFailsInvalidParams() public {
        vm.expectRevert("Threshold must be > 0");
        new PredictionMarket(
            address(musdToken),
            creator,
            0,
            expirationTime,
            INITIAL_LIQUIDITY
        );

        vm.expectRevert("Invalid expiration time");
        new PredictionMarket(
            address(musdToken),
            creator,
            THRESHOLD,
            block.timestamp - 1,
            INITIAL_LIQUIDITY
        );

        vm.expectRevert("Initial liquidity must be > 0");
        new PredictionMarket(
            address(musdToken),
            creator,
            THRESHOLD,
            expirationTime,
            0
        );
    }

    // ============ Trading Tests ============

    function test_BuyYesShares() public {
        uint256 buyAmount = 100 * 1e18; // 100 MUSD

        vm.startPrank(trader1);
        musdToken.approve(address(market), buyAmount);
        
        uint256 sharesBefore = market.yesShares(trader1);
        uint256 reserveYesBefore = market.reserveYes();
        uint256 reserveNoBefore = market.reserveNo();

        uint256 sharesReceived = market.buyShares(true, buyAmount);

        assertGt(sharesReceived, 0);
        assertEq(market.yesShares(trader1), sharesBefore + sharesReceived);
        assertGt(market.reserveYes(), reserveYesBefore);
        assertGt(market.reserveNo(), reserveNoBefore); // No pool increases when buying Yes
        vm.stopPrank();
    }

    function test_BuyNoShares() public {
        uint256 buyAmount = 100 * 1e18;

        vm.startPrank(trader1);
        musdToken.approve(address(market), buyAmount);
        
        uint256 sharesReceived = market.buyShares(false, buyAmount);

        assertGt(sharesReceived, 0);
        assertGt(market.noShares(trader1), 0);
        vm.stopPrank();
    }

    function test_TradingFee() public {
        uint256 buyAmount = 1000 * 1e18;
        uint256 expectedFee = (buyAmount * 50) / 10000; // 0.5%

        vm.startPrank(trader1);
        musdToken.approve(address(market), buyAmount);
        uint256 sharesReceived = market.buyShares(true, buyAmount);

        // With fee, we should get less shares than amount spent
        assertLt(sharesReceived, buyAmount);
        vm.stopPrank();
    }

    function test_SellShares() public {
        uint256 buyAmount = 100 * 1e18;

        // First buy shares
        vm.startPrank(trader1);
        musdToken.approve(address(market), buyAmount);
        uint256 sharesBought = market.buyShares(true, buyAmount);

        // Get balance before selling
        uint256 balanceBefore = musdToken.balanceOf(trader1);

        // Sell half of shares
        uint256 sharesToSell = sharesBought / 2;
        uint256 amountReceived = market.sellShares(true, sharesToSell);

        assertGt(amountReceived, 0);
        // Amount received should be less than what was originally spent to buy these shares
        // (accounting for fees and AMM slippage)
        assertLt(amountReceived, buyAmount / 2); // We're selling half, so should get less than half of original buy
        assertEq(market.yesShares(trader1), sharesBought - sharesToSell);
        // Balance should increase by amount received
        uint256 balanceAfter = musdToken.balanceOf(trader1);
        assertEq(balanceAfter, balanceBefore + amountReceived); // Exact match since MUSD transfers are atomic
        vm.stopPrank();
    }

    function test_CannotSellMoreThanOwned() public {
        vm.startPrank(trader1);
        vm.expectRevert("Insufficient Yes shares");
        market.sellShares(true, 100 * 1e18);
        vm.stopPrank();
    }

    function test_CannotTradeAfterExpiration() public {
        // Move time past expiration
        vm.warp(expirationTime + 1);

        // First resolve the market
        vm.prank(creator);
        market.resolve(75000 * 1e18, 1);

        vm.startPrank(trader1);
        musdToken.approve(address(market), 100 * 1e18);
        vm.expectRevert("Market not pending");
        market.buyShares(true, 100 * 1e18);
        vm.stopPrank();
    }

    // ============ Resolution Tests ============

    function test_ResolveMarket() public {
        uint256 resolvedPrice = 75000 * 1e18; // $75,000
        uint8 outcome = 1; // Yes (price above threshold)

        // Move time past expiration
        vm.warp(expirationTime + 1);

        vm.prank(creator);
        market.resolve(resolvedPrice, outcome);

        PredictionMarket.MarketData memory data = market.getMarketData();
        assertTrue(data.status == PredictionMarket.MarketStatus.Resolved);
        assertEq(data.outcome, outcome);
        assertEq(data.resolvedPrice, resolvedPrice);
    }

    function test_CannotResolveBeforeExpiration() public {
        uint256 resolvedPrice = 75000 * 1e18;
        uint8 outcome = 1;

        vm.prank(creator);
        vm.expectRevert("Market not expired");
        market.resolve(resolvedPrice, outcome);
    }

    function test_OnlyOwnerCanResolve() public {
        vm.warp(expirationTime + 1);

        vm.prank(trader1);
        vm.expectRevert();
        market.resolve(75000 * 1e18, 1);
    }

    // ============ Redemption Tests ============

    function test_RedeemWinningShares() public {
        // Buy Yes shares
        vm.startPrank(trader1);
        musdToken.approve(address(market), 100 * 1e18);
        uint256 sharesBought = market.buyShares(true, 100 * 1e18);
        vm.stopPrank();

        // Resolve market with Yes outcome
        vm.warp(expirationTime + 1);
        vm.prank(creator);
        market.resolve(75000 * 1e18, 1); // Price above threshold = Yes

        // Redeem winning shares
        vm.startPrank(trader1);
        uint256 balanceBefore = musdToken.balanceOf(trader1);
        uint256 payout = market.redeem(true, sharesBought);

        assertEq(payout, sharesBought); // 1:1 redemption
        assertEq(musdToken.balanceOf(trader1), balanceBefore + payout);
        assertEq(market.yesShares(trader1), 0);
        vm.stopPrank();
    }

    function test_CannotRedeemLosingShares() public {
        // Buy Yes shares
        vm.startPrank(trader1);
        musdToken.approve(address(market), 100 * 1e18);
        uint256 sharesBought = market.buyShares(true, 100 * 1e18);
        vm.stopPrank();

        // Resolve market with No outcome (price below threshold)
        vm.warp(expirationTime + 1);
        vm.prank(creator);
        market.resolve(65000 * 1e18, 0); // Price below threshold = No

        // Try to redeem Yes shares (losing position)
        vm.startPrank(trader1);
        vm.expectRevert("Not a winning position");
        market.redeem(true, sharesBought);
        vm.stopPrank();
    }

    function test_CannotRedeemUnresolvedMarket() public {
        vm.startPrank(trader1);
        musdToken.approve(address(market), 100 * 1e18);
        uint256 sharesBought = market.buyShares(true, 100 * 1e18);

        vm.expectRevert("Market not resolved");
        market.redeem(true, sharesBought);
        vm.stopPrank();
    }

    // ============ Price Calculation Tests ============

    function test_GetSharePrice() public {
        uint256 priceYes = market.getSharePrice(true);
        uint256 priceNo = market.getSharePrice(false);

        // Initially should be ~50/50
        assertApproxEqAbs(priceYes, 5e17, 1e15); // ~0.5
        assertApproxEqAbs(priceNo, 5e17, 1e15); // ~0.5
    }

    function test_PriceChangesAfterTrading() public {
        uint256 initialPriceYes = market.getSharePrice(true);

        // Buy Yes shares (should increase Yes price)
        vm.startPrank(trader1);
        musdToken.approve(address(market), 100 * 1e18);
        market.buyShares(true, 100 * 1e18);
        vm.stopPrank();

        uint256 newPriceYes = market.getSharePrice(true);
        assertGt(newPriceYes, initialPriceYes);
    }

    // ============ Edge Cases ============

    function test_InitialLiquidityOddAmount() public {
        // Test with odd initial liquidity
        uint256 oddLiquidity = 1001 * 1e18;

        vm.startPrank(creator);
        musdToken.approve(address(factory), oddLiquidity);
        address newMarket = factory.createMarket(
            50000 * 1e18 / 1e18,
            block.timestamp + 30 days,
            oddLiquidity
        );

        PredictionMarket oddMarket = PredictionMarket(newMarket);
        // Should handle odd splits (one pool gets extra wei)
        uint256 totalReserves = oddMarket.reserveYes() + oddMarket.reserveNo();
        assertEq(totalReserves, oddLiquidity);
        vm.stopPrank();
    }

    function test_MultipleTrades() public {
        // Multiple traders buying different sides
        vm.startPrank(trader1);
        musdToken.approve(address(market), 500 * 1e18);
        market.buyShares(true, 500 * 1e18);
        vm.stopPrank();

        vm.startPrank(trader2);
        musdToken.approve(address(market), 300 * 1e18);
        market.buyShares(false, 300 * 1e18);
        vm.stopPrank();

        // Verify both have positions
        assertGt(market.yesShares(trader1), 0);
        assertGt(market.noShares(trader2), 0);
    }
}

