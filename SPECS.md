# Product Requirements Document (PRD): Pikolo - Bitcoin-Backed Predictions Market Mobile App

## 1. Product Overview
**Pikolo** is a mobile-first predictions market app built on Mezo's Bitcoin rails, enabling users to borrow MUSD (Bitcoin-backed stablecoin) against their BTC collateral at 1% fixed rates to participate in onchain prediction markets. Users maintain full BTC exposure while trading "outcome shares" (Yes/No) on real-world events like elections, sports, or crypto prices. Outcomes settle transparently via oracles, with winnings redeemable in MUSD for DeFi yields or fiat off-ramps.

- **Core Value Prop**: Transform idle BTC into leveraged bets on predictions without selling assets, blending Mezo's self-service banking with composable DeFi for risk-managed speculation.
- **Platform**: iOS/Android mobile app via React Native Expo (for cross-platform efficiency, offline-first caching, and Expo's managed workflow).
- **Blockchain**: EVM-compatible (e.g., Base or Optimism for low fees), integrated with Mezo's BTC-collateralized minting protocol.
- **MVP Scope**: User onboarding, MUSD borrowing, market creation/trading, oracle settlement, and basic portfolio tracking. Excludes advanced derivatives or social features.
- **Success Metrics**: 1K DAU in 3 months; >$1M TVL in borrowed MUSD; 80% user retention via yield-offset borrowing.

## 2. Objectives
- **Business**: Drive Mezo adoption by showcasing BTC as productive capital; generate protocol fees (0.5% on trades) funneled to MUSD yields.
- **User**: Provide intuitive, low-risk entry to predictions (no KYC for core flows); enable "hodl-and-bet" with automated borrow coverage via market yields.
- **Technical**: Ensure gas-optimized contracts (<200K gas/tx); seamless mobile UX with WalletConnect; audit-ready security.

## 3. Target Audience
- **Primary**: Crypto-curious users (Track 2/3) familiar with betting apps like Polymarket but seeking BTC integration without complexity.
- **Secondary**: DeFi power users (Track 1) looping MUSD borrows into leveraged positions.
- **Persona Example**: Alex, 28, BTC holder ($5K), uses DraftKings for sports bets but wants onchain transparency and no asset sales.

## 4. Key Features
1. **Onboarding & Wallet Setup**: Connect BTC wallet (e.g., Unisat), deposit collateral, mint MUSD via Mezo.
2. **Market Discovery**: Browse/ create markets (e.g., "Will BTC > $100K by EOY?"); resolution via Chainlink oracles or Mezo PriceFeed oracle.
3. **Borrow & Trade**: Borrow MUSD at 1% fixed; buy/sell Yes/No shares (AMM-based liquidity).
4. **Position Management**: Track collateral ratios, auto-repay from winnings, yield deployment.
5. **Settlement & Payouts**: Automatic oracle-triggered redemptions; MUSD to fiat via integrated rails (e.g., Coinbase).
6. **Risk Tools**: Collateral health dashboard; one-tap top-ups.

## 5. User Stories
As a [user type], I want [feature] so that [benefit].

- **As a new user**, I want to connect my BTC wallet and mint MUSD in <2 mins so that I can start betting without selling assets.
- **As a bettor**, I want to browse curated markets with real-time odds so that I can quickly place informed trades.
- **As a borrower**, I want to borrow MUSD against BTC with visible 1% rates and LTV sliders so that I control leverage without overexposure.
- **As a trader**, I want to buy/sell outcome shares via intuitive swipe UI so that trading feels like a mobile game.
- **As a hodler**, I want auto-yield from winnings to offset borrow costs so that my BTC remains productive.
- **As a market creator**, I want to propose events with oracle params so that community-driven markets emerge.
- **As a risk manager**, I want alerts for low collateral ratios so that I avoid liquidations proactively.

Acceptance Criteria (for all): Mobile-responsive; <3s load times; error handling for network failures; E2E testable via Detox.

## 6. Technical Specifications

### 6.1 Frontend (React Native Expo)
- **Framework**: Expo SDK 51 (for OTA updates, EAS Build); React Navigation v6 for routing; Redux Toolkit for state (positions, markets).
- **UI Library**: NativeBase/Tamagui for theming; Reanimated for smooth animations (e.g., trade confirmations).
- **Key Screens**:
  - Home: Market feed (FlatList with search/filter).
  - Borrow: Slider for LTV (max 70%); integrates Mezo SDK.
  - Trade: Detail view with charts (via Victory Native); buy/sell modals.
  - Portfolio: Tabbed dashboard (positions, yields, history).
- **Integrations**:
  - WalletConnect v2.0 for BTC/Mezo connect.
  - Web3React for EVM interactions.
  - Push notifications via Expo Notifications for settlements.
- **Offline Support**: AsyncStorage for cached markets; optimistic updates for trades.
- **Performance**: Bundle size <50MB; lazy-load heavy components (e.g., charts).
- **Security**: Encrypted local storage (expo-secure-store); biometric auth for approvals.

### 6.2 Backend & Smart Contracts
- **Architecture**: Serverless (Vercel for API routes if needed); primary logic onchain via Solidity 0.8.20.
- **Core Contracts** (deployed on Base; verified on Etherscan):
  - **MezoIntegration.sol**: Wrapper for Mezo's mint/burn (calls Mezo's Vault for BTC collateral → MUSD).
  - **PredictionMarketFactory.sol**: Creates markets; emits events for indexing.
  - **PredictionMarket.sol** (per market): AMM for Yes/No shares (using constant product formula); oracle resolution.
  - **OracleResolver.sol**: Integrates Chainlink Automation for settlement.
- **Gas Optimizations**: Batch mint/burn; immutable params where possible.
- **APIs**: Subgraph (The Graph) for offchain querying (markets, user positions).

#### Pseudocode for Key Smart Contracts (Solidity Snippets)
```solidity
// MezoIntegration.sol
pragma solidity ^0.8.20;
// Use Mezo BorrowerOperations.sol - confirm from docs and github repositories
import {IMezoVault} from "mezo/interfaces/IMezoVault.sol";

contract MezoIntegration {
    IMezoVault public mezoVault;
    mapping(address => uint256) public userDebt;

    function borrowMUSD(uint256 btcAmount, uint256 musdAmount) external {
        // Transfer BTC collateral to Mezo
        // Call mezoVault.mint(musdAmount, btcAmount); // Ensures 1% fixed rate
        userDebt[msg.sender] += musdAmount;
        // Emit BorrowEvent
    }

    function repayMUSD(uint256 amount) external {
        // Transfer MUSD to vault
        // mezoVault.burn(amount);
        userDebt[msg.sender] -= amount;
    }
}

// PredictionMarket.sol
contract PredictionMarket {
    enum Outcome { Pending, Yes, No }
    Outcome public resolution;
    uint256 public yesShares; // Total Yes liquidity
    uint256 public noShares;
    address public oracle;
    uint256 public constant FEE = 50; // 0.5% basis points

    // AMM: k = yes * no (constant product)
    function buyShares(bool isYes, uint256 musdAmount) external returns (uint256 shares) {
        require(resolution == Outcome.Pending, "Market resolved");
        uint256 fee = (musdAmount * FEE) / 10000;
        uint256 netAmount = musdAmount - fee;
        if (isYes) {
            shares = (netAmount * yesShares) / (noShares + netAmount);
            yesShares += shares;
            noShares -= (shares * noShares) / (yesShares + shares); // Simplified calc
        } // Symmetric for No
        // Transfer MUSD from buyer
    }

    function resolve(bool isYes) external {
        require(msg.sender == oracle, "Unauthorized");
        resolution = isYes ? Outcome.Yes : Outcome.No;
        // Payout: Winners redeem 1:1 MUSD per share
    }

    function redeem(uint256 shares) external returns (uint256 payout) {
        require(resolution != Outcome.Pending, "Unresolved");
        bool won = (resolution == Outcome.Yes && /* user held Yes */) || /* symmetric */;
        payout = won ? shares : 0;
        // Burn shares, transfer MUSD
    }
}
```
- **Deployment**: Hardhat for local testing; Foundry for fuzzing; Slither for audits.
- **Testing**: 90% coverage (Mocha/Chai); E2E with Ganache fork of Base.

### 6.3 Integrations & Data Flows
- **Fiat Rails**: Coinbase/MoonPay for MUSD → USD (post-MVP).
- **Oracles**: Chainlink Price Feeds for BTC prices; custom for events.
- **Analytics**: Dune for TVL dashboards; Mixpanel for app events.
- **Scalability**: Layer 2 focus; rate limits on API (100 req/min/user).

## 7. Flow Charts
### 7.1 User Onboarding & Borrow Flow (Text-Based Mermaid Diagram)
```
graph TD
    A[Open App] --> B[Connect Wallet (BTC via Unisat)]
    B --> C[Deposit BTC Collateral to Mezo]
    C --> D[Select LTV (e.g., 50%) & Borrow MUSD]
    D --> E[MUSD Minted | Collateral Ratio: 200%]
    E --> F[Navigate to Markets]
    style D fill:#f9f
```
*(In app: Linear stepper UI with progress bar; error: "Insufficient BTC" modal.)*

### 7.2 Trade & Settlement Flow
```
graph LR
    F[Browse Market] --> G[Buy Yes/No Shares with MUSD]
    G --> H[AMM Swap | Update Liquidity]
    H --> I[Event Resolves via Oracle]
    I --> J{User Shares?}
    J -->|Yes| K[Redeem 1:1 MUSD Winnings]
    J -->|No| L[0 Payout | Optional Auto-Repay Debt]
    K --> M[Deploy Winnings to Yield | Offset 1% Borrow]
    style K fill:#90EE90
```
*(Mobile: Swipe to confirm trade; push alert for resolution; auto-repay if ratio <150%.)*

## 8. UI/UX Considerations
- **Design System**: Dark/light mode; Bitcoin orange accents; haptic feedback on trades.
- **Accessibility**: VoiceOver support; large tap targets.
- **Onboarding Tour**: 3-slide carousel explaining "Borrow without selling BTC."
- **Wireframes** (Conceptual): Home - Vertical scroll feed; Trade - Half-screen modal with odds ticker.

## 9. Risks & Mitigations
- **Oracle Failure**: Fallback to community vote; Chainlink redundancy.
- **Liquidation Risk**: In-app warnings; Mezo's user-controlled closes.
- **Regulatory**: USDC-like compliance for MUSD; geo-fencing for restricted markets.

## 10. Resources
- **Mezo User Documentation**: https://mezo.org/docs/users.
- **Mezo Developer Documentation**: https://mezo.org/docs/developers.
- **Mezo MUSD repository**: https://github.com/mezo-org/musd/tree/main.
- **Mezo Gauge System & DEX repository**: https://github.com/mezo-org/tigris.

This PRD aligns with Mezo's ethos, positioning Pikolo as a hackathon standout in Track 3 (Bitcoin in digital experiences) with Track 1 sophistication. For iterations, reference hackathon ideas like "Bitcoin Options Vault" for future extensions.