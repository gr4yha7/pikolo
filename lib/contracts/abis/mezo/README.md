# Mezo Protocol Contract ABIs

This directory contains the ABIs for Mezo protocol contracts deployed on Matsnet (testnet).

## Contract Addresses (Matsnet / Chain ID: 31611)

- **BorrowerOperations**: `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5`
- **TroveManager**: `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0`
- **MUSD Token**: `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- **Bitcoin (Native)**: Native currency (sent via `value` field in transactions)

## RPC URL

- **Matsnet**: `https://rpc.test.mezo.org`
- **Chain ID**: `31611`

## Key Protocol Parameters

- **Minimum Collateral Ratio (MCR)**: 110%
- **Critical Collateral Ratio (CCR)**: 150%
- **Max LTV**: ~90.91% (1/1.1)
- **MUSD Gas Compensation**: 200 MUSD
- **Interest Rate**: Fixed (simple interest, not compounding)
- **BTC Decimals**: 18 (native currency on Mezo network)

## Function Reference

### BorrowerOperations
- `openTrove(uint256 _debtAmount, address _upperHint, address _lowerHint)` - payable, opens a new trove
- `addColl(address _upperHint, address _lowerHint)` - payable, adds BTC collateral
- `withdrawMUSD(uint256 _amount, address _upperHint, address _lowerHint)` - borrows more MUSD
- `repayMUSD(uint256 _amount, address _upperHint, address _lowerHint)` - repays MUSD debt
- `closeTrove()` - closes trove and withdraws all collateral
- `adjustTrove(...)` - adjusts both collateral and debt simultaneously

### TroveManager
- `getEntireDebtAndColl(address _borrower)` - gets complete trove info including pending rewards
- `getCurrentICR(address _borrower, uint256 _price)` - gets current collateralization ratio
- `getTroveStatus(address _borrower)` - gets trove status

Note: Full ABIs are stored in JSON format from deployment artifacts. Import using:
```typescript
import BorrowerOperationsABI from './BorrowerOperations.json';
import TroveManagerABI from './TroveManager.json';
import MUSDABI from './MUSD.json';
```

