# Pikolo

> Bitcoin-Backed Predictions Market Mobile App

Pikolo is a mobile-first predictions market application that enables users to borrow MUSD (a Bitcoin-backed stablecoin) against their BTC collateral using the Mezo protocol, then use those funds to trade on Bitcoin price prediction markets. **Never sell your Bitcoin—use it as collateral to bet on predictions.**

## Features

- **Borrow MUSD against BTC**: Deposit BTC collateral and borrow up to ~90.91% LTV at 1% fixed APR
- **Trade Prediction Markets**: Buy/sell Yes/No shares on BTC price predictions via AMM (above/below threshold markets)
- **Swap MUSD/BTC**: Seamlessly swap between MUSD and BTC using Mezo Router
- **Trove Management**: Add collateral, repay debt, and manage your loan position
- **Loan Management Dashboard**: Comprehensive view of your loan position, metrics, and transaction history
- **Borrowing Power Calculator**: Interactive tool to estimate borrowing capacity and liquidation risks
- **Auto-Repay from Winnings**: Automatically use market winnings to pay down debt
- **Real-time Collateral Health**: Monitor collateral ratios and liquidation risks
- **Market Resolution**: Automated market resolution via Vercel cron jobs using Mezo PriceFeed
- **Portfolio Tracking**: View open and closed positions with performance metrics
- **Mobile-First Design**: Native iOS/Android experience optimized for quick trading

## Demo Video
https://drive.google.com/file/d/1ZMAv2szgswUSfABszg_Vqy_RnPa5NrsJ/view?usp=sharing

## How It Works

1. **Connect Wallet**: Connect your EVM-compatible wallet via AppKit (MetaMask, WalletConnect, etc.)
2. **Deposit Collateral**: Deposit BTC through Mezo's BorrowerOperations contract
3. **Borrow MUSD**: Borrow MUSD against your BTC (up to 90.91% LTV, 1% APR)
4. **Swap Tokens**: Swap between MUSD and BTC using the Mezo Router
5. **Trade Markets**: Buy/sell Yes/No shares on BTC price predictions (above or below threshold)
6. **Create Markets**: Create new prediction markets with custom thresholds and expiration times
7. **Market Resolution**: Markets auto-resolve via Vercel cron jobs using Mezo PriceFeed when they expire
8. **Redeem Winnings**: Winners redeem shares for MUSD (1:1 payout)
9. **Manage Trove**: Add collateral, repay debt, or close your trove
10. **Auto-Repay**: Optionally auto-repay debt from winnings

## Tech Stack

### Frontend
- **React Native** with Expo (~54.0)
- **Expo Router** for file-based routing
- **Redux Toolkit** for state management
- **TanStack React Query** for data fetching
- **Viem + Wagmi** for blockchain interactions
- **@reown/appkit-react-native** for wallet connectivity (AppKit)
- **react-native-chart-kit** for market visualization
- **AsyncStorage** for client-side metadata storage

### Smart Contracts
- **Solidity 0.8.24** (targeting EVM Paris)
- **Foundry** for development and testing
- Contracts deployed on **Mezo Testnet (Matsnet)**
- **Mezo Router** for token swaps (MUSD/BTC)
- **Mezo Protocol** for borrowing and trove management

### Blockchain
- **Primary Network**: Mezo Testnet (Chain ID: 31611)
- **RPC**: https://rpc.test.mezo.org
- **Explorer**: https://explorer.test.mezo.org

## Prerequisites

- Node.js 18+ and npm
- Expo CLI
- iOS Simulator (Mac) or Android Emulator
- EVM-compatible wallet (MetaMask, WalletConnect, etc.)

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# For iOS (Mac only)
cd ios && pod install && cd ..

# Start the development server
npx expo start
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Mezo Testnet (Matsnet)
EXPO_PUBLIC_CHAIN_ID=31611
EXPO_PUBLIC_MEZO_TESTNET_RPC_URL=https://rpc.test.mezo.org

# Contract Addresses (Matsnet)
EXPO_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS=0x789e9a1c5f886bc2e59d67d87359021f3a9c9bf0
EXPO_PUBLIC_MEZO_INTEGRATION_ADDRESS=0xec80d798a06df33511a3efc94c244553d132499e

# Mezo Protocol Contracts
EXPO_PUBLIC_MEZO_BORROWER_OPERATIONS_ADDRESS=0xCdF7028ceAB81fA0C6971208e83fa7872994beE5
EXPO_PUBLIC_MEZO_TROVE_MANAGER_ADDRESS=0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0
EXPO_PUBLIC_MEZO_MUSD_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
EXPO_PUBLIC_MEZO_PRICE_FEED_ADDRESS=0x86bCF0841622a5dAC14A313a15f96A95421b9366

# Mezo Router (for swaps)
EXPO_PUBLIC_MEZO_ROUTER_ADDRESS=0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9
EXPO_PUBLIC_MEZO_POOL_FACTORY_ADDRESS=0x4947243CC818b627A5D06d14C4eCe7398A23Ce1A

# BTC Address (Mezo Testnet)
EXPO_PUBLIC_BTC_ADDRESS=0x7b7C000000000000000000000000000000000000

# WalletConnect / AppKit
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on web
npx expo start --web
```

## Project Structure

```
pikolo/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen (markets list)
│   │   ├── wallet.tsx     # Wallet screen
│   │   └── portfolio.tsx  # Portfolio screen
│   ├── borrow.tsx         # Borrow MUSD screen
│   ├── buy.tsx            # Buy shares screen
│   ├── sell.tsx           # Sell shares screen
│   ├── redeem.tsx         # Redeem winnings screen
│   ├── swap.tsx           # Swap MUSD/BTC screen
│   ├── create-market.tsx  # Create new market
│   ├── add-collateral.tsx # Add BTC collateral
│   ├── repay-debt.tsx     # Repay MUSD debt
│   ├── your-loan.tsx      # Loan dashboard
│   ├── prediction/[id].tsx # Market detail screen
│   ├── leaderboard.tsx    # Leaderboard with earn/referral
│   └── check-borrowing-power.tsx
├── api/                   # API routes
│   └── resolve-markets.ts # Market resolution cron endpoint
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── prediction-card.tsx
│   ├── app-header.tsx
│   ├── borrowing-power-checker.tsx
│   ├── loan-metric-card.tsx
│   └── collateral-health.tsx
├── constants/             # Constants and configs
│   ├── chain.ts          # Chain configurations
│   └── swap.ts           # Swap contract addresses
├── contracts/            # Smart contracts (Foundry)
│   ├── src/             # Solidity contracts
│   ├── test/            # Contract tests
│   └── script/          # Deployment scripts
├── hooks/               # React hooks
│   ├── useMezo.ts      # Mezo protocol hook
│   ├── usePredictionMarket.ts
│   ├── useMarketFactory.ts
│   └── useSwap.ts      # Swap functionality hook
├── lib/                 # Core libraries
│   ├── contracts/      # Contract clients & ABIs
│   │   └── abis/       # Contract ABIs (Mezo, etc.)
│   ├── mezo/           # Mezo protocol integration
│   └── wallet/         # Wallet utilities
├── services/           # Backend services
│   └── price-resolution.ts  # Market resolution logic
├── store/              # Redux store & slices
├── utils/              # Utility functions
│   ├── format-shares.ts    # Share formatting
│   ├── market-metadata.ts  # Market metadata storage
│   └── onboarding.ts       # Onboarding utilities
└── vercel.json         # Vercel cron configuration
```

## 🔌 Smart Contracts

### Deployed Contracts (Mezo Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| PredictionMarketFactory | `0x789e9a1c5f886bc2e59d67d87359021f3a9c9bf0` | Creates new prediction markets |
| MezoIntegration | `0xec80d798a06df33511a3efc94c244553d132499e` | Auto-repay integration |

### Mezo Protocol Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| BorrowerOperations | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` | Open/close troves, borrow MUSD |
| TroveManager | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` | Manages trove state |
| MUSD Token | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | Bitcoin-backed stablecoin |
| PriceFeed | `0x86bCF0841622a5dAC14A313a15f96A95421b9366` | BTC/USD price oracle |
| Router | `0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9` | Token swap router |
| Pool Factory | `0x4947243CC818b627A5D06d14C4eCe7398A23Ce1A` | AMM pool factory |
| BTC (Wrapped) | `0x7b7C000000000000000000000000000000000000` | Native BTC on Mezo |

[View on Explorer](https://explorer.test.mezo.org)

## Documentation

- [Product Information](PRODUCT_INFO.md) - How it works, target group, UVP, milestones
- [Product Requirements](SPECS.md) - Full PRD and specifications

## Security

- Smart contracts use OpenZeppelin libraries (Ownable, ReentrancyGuard)
- Foundry tests with high coverage
- Contracts audited via Foundry's fuzzing capabilities
- Error handling for contract revert reasons
- Graceful fallbacks for price feed failures
- Production-ready: Mainnet audit pending

## Recent Updates

- ✅ Added MUSD/BTC swap functionality via Mezo Router
- ✅ Implemented trove management (add collateral, repay debt)
- ✅ Added market direction support (above/below threshold)
- ✅ Improved error handling with user-friendly messages
- ✅ Added empty states for disconnected wallets
- ✅ Implemented automated market resolution via cron
- ✅ Added portfolio tracking with position performance
- ✅ Improved share and price formatting consistency
- ✅ Fixed infinite refresh loops and market fetching issues
- ✅ Added market metadata storage for client-side data

## Key Features

### Market Creation
- Create prediction markets with custom BTC price thresholds
- Set expiration times (minutes, hours, or days)
- Choose market direction (above or below threshold)
- Provide initial liquidity in MUSD

### Trading
- Buy/sell Yes/No shares via AMM
- Real-time price updates based on market odds
- Share formatting (4 decimal places)
- Price formatting (4 decimal places)

### Market Resolution
- Automatic resolution via Vercel cron jobs (every 5 minutes)
- Uses Mezo PriceFeed for BTC/USD price
- Supports both "above" and "below" threshold markets
- Manual resolution available for testing

### Wallet & Portfolio
- Empty states for disconnected wallets
- USD-denominated total balance calculation
- Real-time balance refresh on screen focus
- Portfolio tracking with open/closed positions

### Swap Functionality
- Swap between MUSD and BTC
- Real-time quote calculation
- Automatic slippage protection
- Formatted balances (BTC: 4-8 decimals, MUSD: 2 decimals)

### Trove Management
- Add BTC collateral to existing trove
- Repay MUSD debt
- View collateral health and liquidation risk
- Calculate borrowing power

## Testing

### Contract Tests

```bash
cd contracts
forge test
```

### App Tests

```bash
npm test
```

### Manual Testing

The app includes several testing features:
- Minute-based market expiration for quick testing
- Manual market resolution button (for expired markets)
- Debug onboarding reset button (in wallet screen header)

## Deployment

### Smart Contracts

```bash
cd contracts

# Set up environment
cp .env.example .env
# Add MATSNET_PRIVATE_KEY to .env

# Deploy to Mezo Testnet
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.test.mezo.org --broadcast --verify
```

### Mobile App

```bash
# Build for production
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Market Resolution Cron

The market resolution cron job is automatically deployed with Vercel:
- Endpoint: `/api/resolve-markets`
- Schedule: Every 5 minutes
- Configured in `vercel.json`

To deploy or update:
```bash
vercel deploy
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## 🔗 Links

- **Mezo Protocol**: https://mezo.org
- **Mezo Docs**: https://mezo.org/docs
- **Mezo GitHub**: https://github.com/mezo-org/musd
- **Explorer**: https://explorer.test.mezo.org

## Acknowledgments

- Built on Mezo protocol for Bitcoin-backed stablecoins
- Inspired by Liquity and Threshold USD architecture
- Mobile-first design optimized for DeFi on the go

---

**Built with ❤️ for Bitcoin holders who want to bet without selling**
