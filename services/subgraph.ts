/**
 * The Graph Subgraph queries for fetching market and position data
 */

const SUBGRAPH_URL = process.env.EXPO_PUBLIC_SUBGRAPH_URL || '';

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export interface MarketQueryResult {
  id: string;
  question: string;
  description: string | null;
  category: string;
  creator: string;
  yesShares: string;
  noShares: string;
  totalVolume: string;
  endDate: string;
  resolutionDate: string | null;
  status: 'pending' | 'resolved' | 'cancelled';
  outcome: 'yes' | 'no' | null;
  oracleType: 'chainlink' | 'custom';
  oracleAddress: string | null;
  createdAt: string;
}

export interface PositionQueryResult {
  id: string;
  market: {
    id: string;
    question: string;
  };
  user: string;
  outcome: 'yes' | 'no';
  shares: string;
  entryPrice: string;
  entryValue: string;
  status: 'open' | 'closed' | 'redeemable';
  createdAt: string;
  closedAt: string | null;
}

/**
 * Execute GraphQL query against Subgraph
 */
async function querySubgraph<T>(query: string, variables?: Record<string, any>): Promise<T> {
  if (!SUBGRAPH_URL) {
    throw new Error('Subgraph URL not configured');
  }

  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(result.errors.map((e) => e.message).join(', '));
  }

  return result.data;
}

/**
 * Fetch all markets
 */
export async function fetchMarkets(
  first: number = 50,
  skip: number = 0,
  category?: string,
): Promise<MarketQueryResult[]> {
  const categoryFilter = category ? `category: "${category}"` : '';
  const query = `
    query GetMarkets($first: Int!, $skip: Int!) {
      markets(
        first: $first
        skip: $skip
        orderBy: createdAt
        orderDirection: desc
        where: { status: "pending", ${categoryFilter} }
      ) {
        id
        question
        description
        category
        creator
        yesShares
        noShares
        totalVolume
        endDate
        resolutionDate
        status
        outcome
        oracleType
        oracleAddress
        createdAt
      }
    }
  `;

  const result = await querySubgraph<{ markets: MarketQueryResult[] }>(query, { first, skip });
  return result.markets;
}

/**
 * Fetch single market by ID
 */
export async function fetchMarket(marketId: string): Promise<MarketQueryResult | null> {
  const query = `
    query GetMarket($id: ID!) {
      market(id: $id) {
        id
        question
        description
        category
        creator
        yesShares
        noShares
        totalVolume
        endDate
        resolutionDate
        status
        outcome
        oracleType
        oracleAddress
        createdAt
      }
    }
  `;

  const result = await querySubgraph<{ market: MarketQueryResult | null }>(query, {
    id: marketId,
  });
  return result.market;
}

/**
 * Fetch user positions
 */
export async function fetchUserPositions(userAddress: string): Promise<PositionQueryResult[]> {
  const query = `
    query GetUserPositions($user: String!) {
      positions(
        where: { user: $user }
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        market {
          id
          question
        }
        user
        outcome
        shares
        entryPrice
        entryValue
        status
        createdAt
        closedAt
      }
    }
  `;

  const result = await querySubgraph<{ positions: PositionQueryResult[] }>(query, {
    user: userAddress.toLowerCase(),
  });
  return result.positions;
}

/**
 * Fetch market price history
 */
export async function fetchMarketPriceHistory(marketId: string, days: number = 7) {
  // This would query price history from Subgraph
  // Implementation depends on how price history is indexed
  const query = `
    query GetPriceHistory($marketId: String!, $days: Int!) {
      priceUpdates(
        where: { market: $marketId }
        orderBy: timestamp
        orderDirection: asc
      ) {
        timestamp
        yesPrice
        noPrice
        volume
      }
    }
  `;

  // Placeholder - actual implementation depends on Subgraph schema
  return [];
}

