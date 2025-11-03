// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMUSD.sol";

/**
 * @title PredictionMarket
 * @notice AMM-based prediction market for BTC price predictions
 * @dev Uses constant product formula (x * y = k) for pricing Yes/No shares
 */
contract PredictionMarket is ReentrancyGuard, Ownable {
    // ============ Constants ============
    uint256 public constant FEE_BPS = 50; // 0.5% trading fee (50 basis points)
    uint256 public constant INITIAL_LIQUIDITY_MULTIPLIER = 1; // 1:1 initial price

    // ============ State Variables ============
    enum MarketStatus {
        Pending,
        Resolved,
        Cancelled
    }

    struct MarketData {
        uint256 threshold; // Price threshold in USD (scaled by 1e18)
        uint256 expirationTime; // Unix timestamp when market expires
        MarketStatus status;
        uint8 outcome; // 0 = No, 1 = Yes (only set when resolved)
        uint256 resolvedPrice; // BTC price used for resolution (scaled by 1e18)
        address creator;
        uint256 createdAt;
    }

    MarketData public marketData;

    // AMM Reserves
    uint256 public reserveYes; // Total Yes shares in circulation
    uint256 public reserveNo; // Total No shares in circulation

    // User balances
    mapping(address => uint256) public yesShares; // User's Yes shares
    mapping(address => uint256) public noShares; // User's No shares

    // Total trading volume
    uint256 public totalVolume;

    // MUSD token
    IMUSD public immutable musdToken;

    // ============ Events ============
    event SharesBought(
        address indexed buyer,
        bool indexed isYes,
        uint256 amountIn,
        uint256 sharesOut,
        uint256 fee
    );

    event SharesSold(
        address indexed seller,
        bool indexed isYes,
        uint256 sharesAmount,
        uint256 amountOut,
        uint256 fee
    );

    event MarketResolved(
        uint8 outcome,
        uint256 resolvedPrice,
        uint256 timestamp
    );

    event Redeemed(
        address indexed user,
        bool indexed isYes,
        uint256 sharesAmount,
        uint256 payout
    );

    // ============ Modifiers ============
    modifier onlyPending() {
        require(marketData.status == MarketStatus.Pending, "Market not pending");
        _;
    }

    modifier onlyResolved() {
        require(marketData.status == MarketStatus.Resolved, "Market not resolved");
        _;
    }

    // ============ Constructor ============
    constructor(
        address _musdToken,
        address _creator,
        uint256 _threshold,
        uint256 _expirationTime,
        uint256 _initialLiquidity
    ) Ownable(_creator) {
        require(_musdToken != address(0), "Invalid MUSD address");
        require(_threshold > 0, "Threshold must be > 0");
        require(_expirationTime > block.timestamp, "Invalid expiration time");
        require(_initialLiquidity > 0, "Initial liquidity must be > 0");

        musdToken = IMUSD(_musdToken);
        marketData = MarketData({
            threshold: _threshold,
            expirationTime: _expirationTime,
            status: MarketStatus.Pending,
            outcome: 0,
            resolvedPrice: 0,
            creator: _creator,
            createdAt: block.timestamp
        });

        // Initialize AMM with equal reserves
        // Half goes to Yes pool, half to No pool
        uint256 halfLiquidity = _initialLiquidity / 2;
        reserveYes = halfLiquidity;
        reserveNo = halfLiquidity;

        // Note: Initial liquidity should already be in this contract
        // The factory will transfer it before deployment completes
    }

    // ============ Trading Functions ============

    /**
     * @notice Buy Yes or No shares
     * @param _isYes True to buy Yes shares, false for No shares
     * @param _amountIn Amount of MUSD to spend
     * @return sharesOut Number of shares received
     */
    function buyShares(
        bool _isYes,
        uint256 _amountIn
    ) external nonReentrant onlyPending returns (uint256 sharesOut) {
        require(_amountIn > 0, "Amount must be > 0");
        require(
            musdToken.transferFrom(msg.sender, address(this), _amountIn),
            "Transfer failed"
        );

        // Calculate fee
        uint256 fee = (_amountIn * FEE_BPS) / 10000;
        uint256 amountInWithFee = _amountIn - fee;

        // Calculate shares using AMM formula
        if (_isYes) {
            sharesOut = _calculateSharesOut(amountInWithFee, reserveNo, reserveYes);
            reserveNo += amountInWithFee;
            reserveYes += sharesOut;
            yesShares[msg.sender] += sharesOut;
        } else {
            sharesOut = _calculateSharesOut(amountInWithFee, reserveYes, reserveNo);
            reserveYes += amountInWithFee;
            reserveNo += sharesOut;
            noShares[msg.sender] += sharesOut;
        }

        totalVolume += _amountIn;

        emit SharesBought(msg.sender, _isYes, _amountIn, sharesOut, fee);
        return sharesOut;
    }

    /**
     * @notice Sell Yes or No shares
     * @param _isYes True to sell Yes shares, false for No shares
     * @param _sharesAmount Number of shares to sell
     * @return amountOut Amount of MUSD received
     */
    function sellShares(
        bool _isYes,
        uint256 _sharesAmount
    ) external nonReentrant onlyPending returns (uint256 amountOut) {
        require(_sharesAmount > 0, "Shares must be > 0");

        uint256 amountOutWithFee;
        uint256 fee;

        if (_isYes) {
            require(yesShares[msg.sender] >= _sharesAmount, "Insufficient Yes shares");
            yesShares[msg.sender] -= _sharesAmount;

            // Calculate MUSD output using AMM formula
            amountOutWithFee = _calculateAmountOut(_sharesAmount, reserveYes, reserveNo);
            fee = (amountOutWithFee * FEE_BPS) / (10000 + FEE_BPS);
            amountOut = amountOutWithFee - fee;

            reserveYes -= _sharesAmount;
            reserveNo -= amountOutWithFee;
        } else {
            require(noShares[msg.sender] >= _sharesAmount, "Insufficient No shares");
            noShares[msg.sender] -= _sharesAmount;

            // Calculate MUSD output using AMM formula
            amountOutWithFee = _calculateAmountOut(_sharesAmount, reserveNo, reserveYes);
            fee = (amountOutWithFee * FEE_BPS) / (10000 + FEE_BPS);
            amountOut = amountOutWithFee - fee;

            reserveNo -= _sharesAmount;
            reserveYes -= amountOutWithFee;
        }

        require(
            musdToken.transfer(msg.sender, amountOut),
            "Transfer failed"
        );

        totalVolume += amountOut;

        emit SharesSold(msg.sender, _isYes, _sharesAmount, amountOut, fee);
        return amountOut;
    }

    // ============ Resolution Functions ============

    /**
     * @notice Resolve the market with BTC price
     * @param _price BTC price from Mezo PriceFeed (scaled by 1e18)
     * @param _outcome 0 = No, 1 = Yes
     * @dev Can only be called after expiration time
     */
    function resolve(uint256 _price, uint8 _outcome) external onlyOwner onlyPending {
        require(block.timestamp >= marketData.expirationTime, "Market not expired");
        require(_outcome == 0 || _outcome == 1, "Invalid outcome");
        require(_price > 0, "Price must be > 0");

        marketData.status = MarketStatus.Resolved;
        marketData.outcome = _outcome;
        marketData.resolvedPrice = _price;

        emit MarketResolved(_outcome, _price, block.timestamp);
    }

    /**
     * @notice Redeem winning shares for MUSD
     * @param _isYes True to redeem Yes shares, false for No shares
     * @param _sharesAmount Number of shares to redeem
     * @return payout Amount of MUSD received
     */
    function redeem(
        bool _isYes,
        uint256 _sharesAmount
    ) external nonReentrant onlyResolved returns (uint256 payout) {
        require(_sharesAmount > 0, "Shares must be > 0");

        // Check if user has winning shares
        bool isWinner = (_isYes && marketData.outcome == 1) || (!_isYes && marketData.outcome == 0);
        require(isWinner, "Not a winning position");

        if (_isYes) {
            require(yesShares[msg.sender] >= _sharesAmount, "Insufficient Yes shares");
            yesShares[msg.sender] -= _sharesAmount;
            reserveYes -= _sharesAmount;
        } else {
            require(noShares[msg.sender] >= _sharesAmount, "Insufficient No shares");
            noShares[msg.sender] -= _sharesAmount;
            reserveNo -= _sharesAmount;
        }

        // Payout 1:1 MUSD per winning share
        payout = _sharesAmount;

        // Transfer MUSD to caller (could be user or integration contract)
        require(
            musdToken.transfer(msg.sender, payout),
            "Transfer failed"
        );

        emit Redeemed(msg.sender, _isYes, _sharesAmount, payout);
        return payout;
    }

    // ============ View Functions ============

    /**
     * @notice Get current price per share
     * @param _isYes True for Yes shares, false for No shares
     * @return price Price per share (0-1 range, scaled by 1e18)
     */
    function getSharePrice(bool _isYes) external view returns (uint256 price) {
        uint256 total = reserveYes + reserveNo;
        if (total == 0) return 5e17; // 0.5 (50/50) if no liquidity

        if (_isYes) {
            // Yes price = No reserve / Total
            price = (reserveNo * 1e18) / total;
        } else {
            // No price = Yes reserve / Total
            price = (reserveYes * 1e18) / total;
        }
    }

    /**
     * @notice Get market data
     */
    function getMarketData() external view returns (MarketData memory) {
        return marketData;
    }

    /**
     * @notice Get user's position
     * @param _user User address
     * @return userYesShares User's Yes shares
     * @return userNoShares User's No shares
     */
    function getUserPosition(
        address _user
    ) external view returns (uint256 userYesShares, uint256 userNoShares) {
        return (yesShares[_user], noShares[_user]);
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate shares output using constant product formula
     * @param _amountIn Amount of MUSD in (after fee)
     * @param _reserveIn Reserve of input token
     * @param _reserveOut Reserve of output token (shares)
     * @return sharesOut Shares received
     */
    function _calculateSharesOut(
        uint256 _amountIn,
        uint256 _reserveIn,
        uint256 _reserveOut
    ) internal pure returns (uint256 sharesOut) {
        if (_reserveIn == 0 || _reserveOut == 0) {
            // Initial liquidity - 1:1 rate
            return _amountIn;
        }

        // Constant product: k = reserveIn * reserveOut
        // After adding amountIn: k = (reserveIn + amountIn) * (reserveOut - sharesOut)
        // sharesOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        uint256 numerator = _amountIn * _reserveOut;
        uint256 denominator = _reserveIn + _amountIn;
        sharesOut = numerator / denominator;
    }

    /**
     * @notice Calculate amount output when selling shares
     * @param _sharesIn Amount of shares to sell
     * @param _reserveIn Reserve of shares being sold
     * @param _reserveOut Reserve of MUSD
     * @return amountOut MUSD received (before fee)
     */
    function _calculateAmountOut(
        uint256 _sharesIn,
        uint256 _reserveIn,
        uint256 _reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(_reserveIn > 0 && _reserveOut > 0, "No liquidity");
        require(_sharesIn < _reserveIn, "Insufficient reserve");

        // Constant product: k = reserveIn * reserveOut
        // After removing sharesIn: k = (reserveIn - sharesIn) * (reserveOut - amountOut)
        // amountOut = (sharesIn * reserveOut) / (reserveIn - sharesIn)
        uint256 numerator = _sharesIn * _reserveOut;
        uint256 denominator = _reserveIn - _sharesIn;
        amountOut = numerator / denominator;
    }
}

