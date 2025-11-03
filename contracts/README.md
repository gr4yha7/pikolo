# Pikolo Prediction Market Contracts

Smart contracts for BTC price prediction markets on Mezo network, targeting EVM version Paris (Shanghai).

## Contracts

### Core Contracts

1. **PredictionMarket.sol**
   - AMM-based prediction market using constant product formula (x * y = k)
   - Supports Yes/No shares for BTC price predictions
   - 0.5% trading fee on all trades
   - Resolution by owner (backend cron job) using Mezo PriceFeed
   - 1:1 redemption for winning shares

2. **PredictionMarketFactory.sol**
   - Factory contract for creating new prediction markets
   - Tracks all markets and markets by creator
   - Market creation with threshold, expiration time, and initial liquidity

3. **MezoIntegration.sol** (Optional)
   - Wrapper for integrating market winnings with Mezo protocol
   - Auto-repay Mezo debt from winnings
   - User-configurable preferences

### Interfaces

- **IMUSD.sol** - MUSD token interface
- **IPriceFeed.sol** - Mezo PriceFeed interface
- **IBorrowerOperations.sol** - Mezo BorrowerOperations interface

## Compilation

```bash
forge build
```

## Testing

```bash
forge test
```

## Deployment

### Deploy to Mezo Testnet (Matsnet)

1. Set environment variables:
```bash
export MATSNET_PRIVATE_KEY=your_private_key
export MUSD_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503  # Matsnet MUSD
```

2. Deploy Factory:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.test.mezo.org --broadcast --verify
```

3. Deploy MezoIntegration (optional):
```bash
forge script script/Deploy.s.sol:DeployMezoIntegration --rpc-url https://rpc.test.mezo.org --broadcast --verify
```

## Contract Architecture

### Market Flow

1. **Market Creation**
   - User calls `Factory.createMarket(threshold, expirationTime, initialLiquidity)`
   - Factory deploys new `PredictionMarket` contract
   - Initial liquidity split 50/50 between Yes/No pools
   - Market is in `Pending` status

2. **Trading**
   - Users buy/sell Yes/No shares via AMM
   - Constant product formula: `x * y = k`
   - 0.5% fee on all trades
   - Shares tracked per user

3. **Resolution**
   - Backend cron job fetches BTC price from Mezo PriceFeed
   - Calls `market.resolve(price, outcome)`
   - Market status changes to `Resolved`
   - Outcome: 0 = No, 1 = Yes

4. **Redemption**
   - Users redeem winning shares for 1:1 MUSD
   - Optional: Use `MezoIntegration.redeemAndRepay()` to auto-repay debt

### AMM Pricing

- **Buy Shares**: `sharesOut = (amountIn * reserveOut) / (reserveIn + amountIn)`
- **Sell Shares**: `amountOut = (sharesIn * reserveOut) / (reserveIn - sharesIn)`
- **Share Price**: `price = oppositeReserve / totalReserves`

### Market Format

**BTC Price Prediction Market:**
- Question: "Will BTC be above $X on [date]?"
- Threshold: Price threshold in USD (scaled to 1e18)
- Expiration: Unix timestamp
- Resolution: Compares BTC price (from Mezo PriceFeed) to threshold

## Security Features

- ReentrancyGuard on all state-changing functions
- Ownable for market resolution
- Input validation on all parameters
- Safe math via Solidity 0.8.24 built-in checks

## Configuration

See `foundry.toml` for compiler settings:
- Solidity version: 0.8.24
- EVM version: Paris (Shanghai)
- Optimizer: Enabled (200 runs)

## Network Details

### Mezo Testnet (Matsnet)
- Chain ID: 31611
- RPC URL: https://rpc.test.mezo.org
- Explorer: https://explorer.test.mezo.org
- MUSD: `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- PriceFeed: `0x86bCF0841622a5dAC14A313a15f96A95421b9366`

## License

MIT
