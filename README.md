# Pikolo

> Bitcoin-Backed Predictions Market Mobile App

Pikolo is a mobile-first predictions market application that enables users to borrow MUSD (a Bitcoin-backed stablecoin) against their BTC collateral using the Mezo protocol, then use those funds to trade on Bitcoin price prediction markets. **Never sell your Bitcoin—use it as collateral to bet on predictions.**

## Features

- **Borrow MUSD against BTC**: Deposit BTC collateral and borrow up to ~90.91% LTV at 1% fixed APR
- **Trade Prediction Markets**: Buy/sell Yes/No shares on BTC price predictions via AMM
- **Loan Management Dashboard**: Comprehensive view of your loan position, metrics, and transaction history
- **Borrowing Power Calculator**: Interactive tool to estimate borrowing capacity and liquidation risks
- **Auto-Repay from Winnings**: Automatically use market winnings to pay down debt
- **Real-time Collateral Health**: Monitor collateral ratios and liquidation risks
- **Mobile-First Design**: Native iOS/Android experience optimized for quick trading

## Screenshots

- Home screen with active prediction markets
- Borrowing power calculator
- Loan dashboard with comprehensive metrics
- Trading interface for buying/selling shares

## How It Works

1. **Connect Wallet**: Connect your EVM-compatible wallet (MetaMask, WalletConnect, etc.)
2. **Deposit Collateral**: Deposit BTC through Mezo's BorrowerOperations contract
3. **Borrow MUSD**: Borrow MUSD against your BTC (up to 90.91% LTV, 1% APR)
4. **Trade Markets**: Buy/sell Yes/No shares on BTC price predictions
5. **Market Resolution**: Markets auto-resolve via Mezo PriceFeed when they expire
6. **Redeem Winnings**: Winners redeem shares for MUSD (1:1 payout)
7. **Auto-Repay**: Optionally auto-repay debt from winnings

## Tech Stack

### Frontend
- **React Native** with Expo (~54.0)
- **Expo Router** for file-based routing
- **Redux Toolkit** for state management
- **TanStack React Query** for data fetching
- **Viem + Wagmi** for blockchain interactions
- **@reown/appkit-react-native** for wallet connectivity

### Smart Contracts
- **Solidity 0.8.24** (targeting EVM Paris)
- **Foundry** for development and testing
- Contracts deployed on **Mezo Testnet (Matsnet)**

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

# WalletConnect
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
│   ├── borrow.tsx         # Borrow MUSD screen
│   ├── buy.tsx            # Buy shares screen
│   ├── sell.tsx           # Sell shares screen
│   ├── redeem.tsx         # Redeem winnings screen
│   ├── create-market.tsx  # Create new market
│   ├── your-loan.tsx      # Loan dashboard
│   └── check-borrowing-power.tsx
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── borrowing-power-checker.tsx
│   ├── loan-metric-card.tsx
│   └── collateral-health.tsx
├── contracts/            # Smart contracts (Foundry)
│   ├── src/             # Solidity contracts
│   ├── test/            # Contract tests
│   └── script/          # Deployment scripts
├── hooks/               # React hooks
│   ├── useMezo.ts      # Mezo protocol hook
│   ├── usePredictionMarket.ts
│   └── useMarketFactory.ts
├── lib/                 # Core libraries
│   ├── contracts/      # Contract clients & ABIs
│   └── mezo/           # Mezo protocol integration
├── services/           # Backend services
│   └── price-resolution.ts  # Market resolution cron
├── store/              # Redux store & slices
└── utils/              # Utility functions
```

## 🔌 Smart Contracts

### Deployed Contracts (Mezo Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| PredictionMarketFactory | `0x789e9a1c5f886bc2e59d67d87359021f3a9c9bf0` | Creates new prediction markets |
| MezoIntegration | `0xec80d798a06df33511a3efc94c244553d132499e` | Auto-repay integration |

### Mezo Protocol Contracts

| Contract | Address |
|----------|---------|
| BorrowerOperations | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` |
| TroveManager | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` |
| MUSD Token | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| PriceFeed | `0x86bCF0841622a5dAC14A313a15f96A95421b9366` |

[View on Explorer](https://explorer.test.mezo.org)

## Documentation

- [Product Information](PRODUCT_INFO.md) - How it works, target group, UVP, milestones
- [Product Requirements](SPECS.md) - Full PRD and specifications
- [Implementation Plan](PLAN.md) - Development phases and tasks
- [Contract Deployment](contracts/DEPLOYMENT.md) - Deployment details

## Security

- Smart contracts use OpenZeppelin libraries (Ownable, ReentrancyGuard)
- Foundry tests with high coverage
- Contracts audited via Foundry's fuzzing capabilities
- Production-ready: Mainnet audit pending

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
