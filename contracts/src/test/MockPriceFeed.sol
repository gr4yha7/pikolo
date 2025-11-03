// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IPriceFeed.sol";

/**
 * @title MockPriceFeed
 * @notice Mock PriceFeed for testing
 */
contract MockPriceFeed is IPriceFeed {
    uint256 public price;

    constructor(uint256 _initialPrice) {
        price = _initialPrice; // Price in wei (1e18 decimals)
    }

    function fetchPrice() external view override returns (uint256) {
        return price;
    }

    function setPrice(uint256 _newPrice) external {
        price = _newPrice;
    }
}

