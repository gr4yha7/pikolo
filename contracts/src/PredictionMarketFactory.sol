// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PredictionMarket.sol";
import "./interfaces/IMUSD.sol";

/**
 * @title PredictionMarketFactory
 * @notice Factory contract for creating BTC price prediction markets
 */
contract PredictionMarketFactory is Ownable {
    // ============ State Variables ============
    IMUSD public immutable musdToken;
    address[] public markets;
    mapping(address => bool) public isMarket;
    mapping(address => address[]) public creatorMarkets;

    // ============ Events ============
    event MarketCreated(
        address indexed market,
        address indexed creator,
        uint256 threshold,
        uint256 expirationTime,
        uint256 initialLiquidity,
        uint256 indexed marketIndex
    );

    // ============ Constructor ============
    constructor(address _musdToken) Ownable(msg.sender) {
        require(_musdToken != address(0), "Invalid MUSD address");
        musdToken = IMUSD(_musdToken);
    }

    // ============ Market Creation ============

    /**
     * @notice Create a new BTC price prediction market
     * @param _threshold Price threshold in USD (will be scaled to 1e18 internally)
     * @param _expirationTime Unix timestamp when market expires
     * @param _initialLiquidity Initial liquidity in MUSD (will be split 50/50 between Yes/No)
     * @return market Address of the newly created market
     */
    function createMarket(
        uint256 _threshold,
        uint256 _expirationTime,
        uint256 _initialLiquidity
    ) external returns (address market) {
        require(_threshold > 0, "Threshold must be > 0");
        require(_expirationTime > block.timestamp, "Invalid expiration time");
        require(_initialLiquidity > 0, "Initial liquidity must be > 0");

        // Scale threshold to 1e18 for consistency with price feed
        uint256 scaledThreshold = _threshold * 1e18;

        // Transfer initial liquidity to this contract first
        require(
            musdToken.transferFrom(msg.sender, address(this), _initialLiquidity),
            "Transfer failed"
        );

        // Deploy new PredictionMarket
        PredictionMarket newMarket = new PredictionMarket(
            address(musdToken),
            msg.sender,
            scaledThreshold,
            _expirationTime,
            _initialLiquidity
        );

        market = address(newMarket);

        // Transfer initial liquidity to the new market
        require(
            musdToken.transfer(market, _initialLiquidity),
            "Transfer to market failed"
        );
        markets.push(market);
        isMarket[market] = true;
        creatorMarkets[msg.sender].push(market);

        emit MarketCreated(
            market,
            msg.sender,
            scaledThreshold,
            _expirationTime,
            _initialLiquidity,
            markets.length - 1
        );

        return market;
    }

    // ============ View Functions ============

    /**
     * @notice Get all markets
     * @return Array of market addresses
     */
    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }

    /**
     * @notice Get total number of markets
     * @return Total market count
     */
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    /**
     * @notice Get markets created by a specific address
     * @param _creator Creator address
     * @return Array of market addresses
     */
    function getMarketsByCreator(address _creator) external view returns (address[] memory) {
        return creatorMarkets[_creator];
    }

    /**
     * @notice Get market at index
     * @param _index Market index
     * @return Market address
     */
    function getMarket(uint256 _index) external view returns (address) {
        require(_index < markets.length, "Index out of bounds");
        return markets[_index];
    }
}

