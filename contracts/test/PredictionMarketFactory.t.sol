// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PredictionMarketFactory} from "../src/PredictionMarketFactory.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockMUSD} from "../src/test/MockMUSD.sol";

contract PredictionMarketFactoryTest is Test {
    PredictionMarketFactory public factory;
    MockMUSD public musdToken;

    address public creator1 = address(1);
    address public creator2 = address(2);

    function setUp() public {
        musdToken = new MockMUSD();
        factory = new PredictionMarketFactory(address(musdToken));

        // Setup accounts with MUSD
        vm.startPrank(address(this));
        musdToken.mint(creator1, 10000 * 1e18);
        musdToken.mint(creator2, 10000 * 1e18);
        vm.stopPrank();
    }

    function test_CreateMarket() public {
        uint256 threshold = 70000;
        uint256 expirationTime = block.timestamp + 30 days;
        uint256 initialLiquidity = 1000 * 1e18;

        vm.startPrank(creator1);
        musdToken.approve(address(factory), initialLiquidity);
        address marketAddress = factory.createMarket(
            threshold,
            expirationTime,
            initialLiquidity
        );
        vm.stopPrank();

        assertTrue(marketAddress != address(0));
        assertTrue(factory.isMarket(marketAddress));
        assertEq(factory.getMarketCount(), 1);
        assertEq(factory.getMarket(0), marketAddress);
    }

    function test_GetAllMarkets() public {
        uint256 initialLiquidity = 1000 * 1e18;

        // Create 3 markets
        vm.startPrank(creator1);
        musdToken.approve(address(factory), initialLiquidity * 3);
        
        address market1 = factory.createMarket(70000, block.timestamp + 30 days, initialLiquidity);
        address market2 = factory.createMarket(80000, block.timestamp + 30 days, initialLiquidity);
        address market3 = factory.createMarket(90000, block.timestamp + 30 days, initialLiquidity);
        vm.stopPrank();

        address[] memory allMarkets = factory.getAllMarkets();
        assertEq(allMarkets.length, 3);
        assertEq(allMarkets[0], market1);
        assertEq(allMarkets[1], market2);
        assertEq(allMarkets[2], market3);
    }

    function test_GetMarketsByCreator() public {
        uint256 initialLiquidity = 1000 * 1e18;

        // Creator1 creates 2 markets
        vm.startPrank(creator1);
        musdToken.approve(address(factory), initialLiquidity * 2);
        address market1 = factory.createMarket(70000, block.timestamp + 30 days, initialLiquidity);
        address market2 = factory.createMarket(80000, block.timestamp + 30 days, initialLiquidity);
        vm.stopPrank();

        // Creator2 creates 1 market
        vm.startPrank(creator2);
        musdToken.approve(address(factory), initialLiquidity);
        address market3 = factory.createMarket(90000, block.timestamp + 30 days, initialLiquidity);
        vm.stopPrank();

        address[] memory creator1Markets = factory.getMarketsByCreator(creator1);
        assertEq(creator1Markets.length, 2);
        assertEq(creator1Markets[0], market1);
        assertEq(creator1Markets[1], market2);

        address[] memory creator2Markets = factory.getMarketsByCreator(creator2);
        assertEq(creator2Markets.length, 1);
        assertEq(creator2Markets[0], market3);
    }

    function test_FactoryFailsInvalidParams() public {
        vm.expectRevert("Threshold must be > 0");
        factory.createMarket(0, block.timestamp + 30 days, 1000 * 1e18);

        vm.expectRevert("Invalid expiration time");
        factory.createMarket(70000, block.timestamp - 1, 1000 * 1e18);

        vm.expectRevert("Initial liquidity must be > 0");
        factory.createMarket(70000, block.timestamp + 30 days, 0);
    }

    function test_GetMarketIndex() public {
        uint256 initialLiquidity = 1000 * 1e18;

        vm.startPrank(creator1);
        musdToken.approve(address(factory), initialLiquidity);
        address market1 = factory.createMarket(70000, block.timestamp + 30 days, initialLiquidity);
        vm.stopPrank();

        assertEq(factory.getMarket(0), market1);

        vm.expectRevert("Index out of bounds");
        factory.getMarket(1);
    }

    function test_MarketCountIncrements() public {
        uint256 initialLiquidity = 1000 * 1e18;

        assertEq(factory.getMarketCount(), 0);

        vm.startPrank(creator1);
        musdToken.approve(address(factory), initialLiquidity * 3);
        factory.createMarket(70000, block.timestamp + 30 days, initialLiquidity);
        assertEq(factory.getMarketCount(), 1);

        factory.createMarket(80000, block.timestamp + 30 days, initialLiquidity);
        assertEq(factory.getMarketCount(), 2);

        factory.createMarket(90000, block.timestamp + 30 days, initialLiquidity);
        assertEq(factory.getMarketCount(), 3);
        vm.stopPrank();
    }
}

