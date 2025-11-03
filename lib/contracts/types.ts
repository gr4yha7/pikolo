/**
 * TypeScript types for smart contracts
 */

export interface ContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

export interface MarketCreatedEvent {
  marketId: string;
  creator: string;
  question: string;
  endDate: bigint;
  oracleType: 'chainlink' | 'custom';
  oracleAddress: string;
}

export interface SharesBoughtEvent {
  marketId: string;
  buyer: string;
  outcome: 'yes' | 'no';
  shares: bigint;
  amount: bigint;
}

export interface MarketResolvedEvent {
  marketId: string;
  outcome: 'yes' | 'no';
  resolvedBy: string;
  timestamp: bigint;
}

