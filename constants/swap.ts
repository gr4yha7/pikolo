/**
 * Swap Contract Addresses
 * Tigris DEX Router and Pool addresses for Mezo Testnet
 */

import type { Address } from 'viem';

// Router Contract (Tigris DEX)
export const ROUTER_ADDRESS = '0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9' as Address;

// Token Addresses
export const MUSD_ADDRESS = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503' as Address;
export const BTC_ADDRESS = '0x7b7C000000000000000000000000000000000000' as Address;

// Pool Factory (to get pool address)
export const POOL_FACTORY_ADDRESS = '0x4947243CC818b627A5D06d14C4eCe7398A23Ce1A' as Address;

// MUSD/BTC Pool is volatile (stable = false)
export const MUSD_BTC_STABLE = false;

