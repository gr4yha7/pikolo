# Contract Deployment Information

## Mezo Testnet (Matsnet) Deployment

**Chain ID**: 31611  
**RPC URL**: https://rpc.test.mezo.org  
**Explorer**: https://explorer.test.mezo.org

## Deployed Contracts

### PredictionMarketFactory
- **Address**: `0x789e9a1c5f886bc2e59d67d87359021f3a9c9bf0`
- **Purpose**: Factory contract for creating new prediction markets
- **Contract**: `src/PredictionMarketFactory.sol`

### MezoIntegration
- **Address**: `0xec80d798a06df33511a3efc94c244553d132499e`
- **Purpose**: Auto-repay wrapper for integrating market winnings with Mezo protocol
- **Contract**: `src/MezoIntegration.sol`

## Deployment Details

- **Deployer**: `0xd06e922AACEe8d326102C3643f40507265f51369`
- **Gas Used**: ~3,863,273 gas
- **Transaction Hash**: See `broadcast/Deploy.s.sol/31611/run-latest.json`

## Environment Variables for App

Update your app's `.env` or environment configuration with:

```env
EXPO_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS=0x789e9a1c5f886bc2e59d67d87359021f3a9c9bf0
EXPO_PUBLIC_MEZO_INTEGRATION_ADDRESS=0xec80d798a06df33511a3efc94c244553d132499e
```

## Verification Links

- Factory: https://explorer.test.mezo.org/address/0x789e9a1c5f886bc2e59d67d87359021f3a9c9bf0
- MezoIntegration: https://explorer.test.mezo.org/address/0xec80d798a06df33511a3efc94c244553d132499e

## Next Steps

1. Update app environment variables with the contract addresses above
2. Restart the app to load new contract addresses
3. Test market creation through the Factory
4. Test auto-repay functionality through MezoIntegration

