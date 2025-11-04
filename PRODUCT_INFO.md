# Pikolo Product Information

## How It Works

Pikolo is a mobile-first predictions market application that enables users to borrow MUSD (a Bitcoin-backed stablecoin) against their BTC collateral using the Mezo protocol, then use those funds to trade on Bitcoin price prediction markets.

### Core Workflow

1. **Wallet Connection**: Users connect their EVM-compatible wallet (MetaMask, WalletConnect, etc.) to access the Mezo testnet (Matsnet).

2. **Collateral Deposit**: Users deposit BTC as collateral through the Mezo protocol's BorrowerOperations contract. BTC on Mezo network uses 18 decimals as the native currency.

3. **Borrow MUSD**: Against their BTC collateral, users can borrow MUSD up to ~90.91% LTV (based on 110% Minimum Collateral Ratio). The borrowing process includes:
   - 200 MUSD gas compensation (automatically added)
   - Governable borrowing fee (~0.1%)
   - Fixed interest rate (currently 1% APR, simple interest)

4. **Market Participation**: Users browse BTC price prediction markets (e.g., "Will BTC be above $70,000 by December 31?") and trade Yes/No shares using an AMM (Automated Market Maker) mechanism.

5. **Trading**: Users buy or sell outcome shares with MUSD. The AMM uses a constant product formula (x * y = k) with a 0.5% trading fee. Share prices adjust dynamically based on supply and demand.

6. **Market Resolution**: When a market expires, a backend cron job:
   - Fetches the BTC price from Mezo's PriceFeed contract
   - Compares it to the market threshold
   - Automatically resolves the market with the correct outcome

7. **Redemption**: Winners redeem their shares for MUSD (1:1 payout). Users can optionally enable auto-repay to automatically use winnings to pay down their Mezo debt.

8. **Debt Management**: Users can add collateral, repay debt, borrow more MUSD, or close their trove at any time through the loan management interface.

## Target Group

### Primary Users
- **Crypto-curious users (Track 2/3)**: Individuals familiar with traditional betting apps (like Polymarket, DraftKings) who want onchain transparency and Bitcoin integration without complexity
- **Bitcoin holders**: Users who want to maintain BTC exposure while earning yield or making predictions
- **Example Persona**: Alex, 28, holds $5K in BTC, uses DraftKings for sports bets, seeks onchain transparency without selling assets

### Secondary Users
- **DeFi power users (Track 1)**: Advanced users who want to leverage MUSD borrows into more complex positions
- **Market creators**: Users who want to create and bootstrap new prediction markets

## Product / Project Category

**Category**: Decentralized Finance (DeFi) / Prediction Markets / Bitcoin Lending Platform

**Sub-categories**:
- Prediction Markets
- Bitcoin Collateralized Lending
- Decentralized Exchange (AMM-based)
- Mobile-First DeFi Application

**Track Classification** (Hackathon Context):
- **Track 3**: Bitcoin in Digital Experiences
- **Track 1**: Advanced DeFi (for sophisticated users)

## Tech Stack

### Frontend
- **Framework**: React Native with Expo (~54.0)
- **Routing**: Expo Router (file-based routing)
- **State Management**: Redux Toolkit + React Redux
- **Data Fetching**: TanStack React Query (@tanstack/react-query)
- **UI Components**: Custom component library with React Native primitives
- **Wallet Integration**: @reown/appkit-react-native (WalletConnect v2.0)
- **Blockchain Interaction**: Viem + Wagmi
- **Charts**: react-native-chart-kit
- **Animations**: react-native-reanimated
- **Offline Support**: @react-native-async-storage/async-storage

### Backend & Smart Contracts
- **Language**: Solidity 0.8.24 (targeting EVM Paris)
- **Testing Framework**: Foundry
- **Development**: Foundry Scripts for deployment
- **Contract Architecture**:
  - PredictionMarket.sol - AMM-based prediction markets
  - PredictionMarketFactory.sol - Factory for creating markets
  - MezoIntegration.sol - Auto-repay wrapper for Mezo protocol

### Blockchain Infrastructure
- **Primary Network**: Mezo Testnet (Matsnet)
  - Chain ID: 31611
  - RPC: https://rpc.test.mezo.org
  - Native Currency: BTC (18 decimals)
- **Secondary Network**: Sepolia Testnet (for EVM compatibility)
- **Integration**: Mezo Protocol contracts
  - BorrowerOperations: Manages troves and borrowing
  - TroveManager: Manages trove state and liquidations
  - PriceFeed: Oracle for BTC/USD prices
  - InterestRateManager: Manages interest rates

### Services
- **Price Resolution**: Backend cron job service for market resolution
- **Data Indexing**: Subgraph (The Graph) for offchain queries (prepared)
- **Oracle**: Mezo PriceFeed contract for BTC price data

### Development Tools
- **TypeScript**: Full type safety across the codebase
- **ESLint**: Code linting
- **Expo**: Managed workflow for mobile development

## Unique Value Proposition (UVP)

### Primary UVP
**"Transform idle Bitcoin into leveraged prediction bets without selling your assets"**

### Key Differentiators

1. **Bitcoin-First**: Only platform combining Mezo's Bitcoin-backed stablecoin (MUSD) with prediction markets, allowing users to maintain full BTC exposure while participating in markets.

2. **No Asset Disposal**: Unlike traditional prediction markets where users must convert to fiat or sell crypto, Pikolo users borrow against BTC collateral—never selling their holdings.

3. **Automated Yield Coverage**: Built-in auto-repay functionality allows winnings to automatically pay down borrowing costs, creating a self-sustaining loop where successful predictions offset debt.

4. **Mobile-First Design**: Native mobile experience optimized for quick trading, unlike web-based competitors that feel clunky on mobile devices.

5. **Transparent Settlement**: Onchain resolution via Mezo PriceFeed contract ensures verifiable, trustless market outcomes without centralized oracle dependencies.

6. **Low Barrier Entry**: 
   - 1% fixed APR (simple interest, non-compounding)
   - No KYC required for core flows
   - Intuitive mobile UI similar to betting apps users already know

7. **Risk Management**: 
   - Real-time collateral health monitoring
   - Liquidation price warnings
   - Interactive borrowing power calculator
   - One-tap collateral top-ups

8. **Composable DeFi**: Integration with Mezo protocol enables users to:
   - Borrow at predictable rates
   - Use borrowed funds for prediction markets
   - Redeem winnings for yield farming or other DeFi activities
   - Repay debt seamlessly

## Future Milestones

### Phase 1: MVP Completion (Current)
- ✅ Core wallet integration (EVM)
- ✅ Mezo protocol integration
- ✅ Prediction market contracts deployment
- ✅ Basic trading interface
- ✅ Loan management dashboard
- ✅ Market resolution system

### Phase 2: Enhanced Features (December 2025)
- **Multi-Event Markets**: Expand beyond BTC price predictions to sports, elections, and other events
- **Oracle Integration**: Chainlink oracles for non-price event resolution
- **Social Features**: Market creation by users, market curation, trending markets
- **Portfolio Analytics**: Advanced charts, P&L tracking, historical performance

### Phase 3: Advanced Trading (Q1 2026)
- **Limit Orders**: Set price targets for automatic execution
- **Market Analytics**: Volume indicators, sentiment analysis, market depth
- **Leverage Options**: Additional borrowing strategies and position management
- **Referral Program**: Social sharing and referral rewards

### Phase 4: Mainnet Launch (Q1 2026)
- **Mezo Mainnet Integration**: Full production deployment
- **Fiat On-Ramps**: Direct USD → MUSD conversion via Coinbase/MoonPay
- **Multi-Chain Support**: Base, Optimism, or other EVM chains
- **Audit & Security**: Full smart contract audit, bug bounty program

### Phase 5: Enterprise Features (Q2 2026)
- **Institutional Tools**: API access, white-label solutions
- **Advanced Risk Management**: Insurance pools, portfolio hedging
- **Derivatives**: Options, futures, and structured products
- **Governance**: DAO structure, token distribution, protocol governance

### Long-Term Vision
- **Global Adoption**: Support for multiple languages and regions
- **Regulatory Compliance**: KYC/AML integrations where required
- **Cross-Chain**: Bitcoin native chain integration (beyond EVM)
- **Ecosystem Integration**: Partnerships with other DeFi protocols for yield optimization

