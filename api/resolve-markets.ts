/**
 * Vercel Serverless Function for Market Resolution
 * 
 * This endpoint is called by Vercel Cron Jobs to resolve expired prediction markets.
 * 
 * Cron Schedule: Every 5 minutes
 * Configure in vercel.json
 * 
 * Environment Variables Required:
 * - RESOLVER_PRIVATE_KEY: Private key for the resolver account
 * - PREDICTION_MARKET_FACTORY_ADDRESS: Address of the PredictionMarketFactory contract
 * - MEZO_RPC_URL: RPC URL for Mezo testnet (optional, defaults to https://rpc.test.mezo.org)
 */

import { resolveExpiredMarkets } from '../services/price-resolution';

export default async function handler(req: any, res: any) {
  // Only allow POST requests (Vercel cron jobs use GET, but we can accept both)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Market resolution cron job started at', new Date().toISOString());
    
    const result = await resolveExpiredMarkets();
    
    console.log(`Market resolution completed: ${result.resolved} resolved, ${result.failed} failed`);
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

