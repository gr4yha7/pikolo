/**
 * MezoIntegration Contract Interface
 * 
 * TypeScript wrapper for MezoIntegration.sol contract
 */

import { Address, PublicClient, WalletClient, getContract } from 'viem';
import MezoIntegrationABI from './abis/prediction/MezoIntegration.json';

export class MezoIntegrationClient {
  private contract: any;
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(
    address: Address,
    publicClient: PublicClient,
    walletClient?: WalletClient,
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.contract = getContract({
      address,
      abi: MezoIntegrationABI.abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
  }

  /**
   * Toggle auto-repay functionality
   */
  async setAutoRepay(enabled: boolean): Promise<string> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.setAutoRepay([enabled]);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Check if auto-repay is enabled for user
   */
  async isAutoRepayEnabled(userAddress: Address): Promise<boolean> {
    return await this.contract.read.autoRepayEnabled([userAddress]);
  }

  /**
   * Set hints for gas optimization
   */
  async setHints(
    upperHint: Address,
    lowerHint: Address,
  ): Promise<string> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.setHints([upperHint, lowerHint]);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Get user's hints
   */
  async getUserHints(
    userAddress: Address,
  ): Promise<{ upperHint: Address; lowerHint: Address }> {
    const [upperHint, lowerHint] = await Promise.all([
      this.contract.read.userUpperHint([userAddress]),
      this.contract.read.userLowerHint([userAddress]),
    ]);
    return { upperHint, lowerHint };
  }

  /**
   * Repay debt from MUSD balance
   */
  async repayDebtFromBalance(repayAmount: bigint): Promise<{
    hash: string;
    remaining: bigint;
  }> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.repayDebtFromBalance([repayAmount]);
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    // Query remaining MUSD balance after repayment
    // We'll query the user's MUSD balance directly
    let remaining = BigInt(0);
    if (this.walletClient?.account) {
      try {
        // Get MUSD token address from BorrowerOperations (via integration contract)
        const musdAddress = await this.getMUSDAddress();
        const musdBalance = await this.publicClient.readContract({
          address: musdAddress,
          abi: [
            {
              inputs: [{ name: 'account', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'balanceOf',
          args: [this.walletClient.account.address],
        });
        remaining = musdBalance as bigint;
      } catch (error) {
        console.warn('Failed to query remaining balance:', error);
        // Return 0 if query fails
        remaining = BigInt(0);
      }
    }

    return { hash, remaining };
  }

  /**
   * Auto-repay from balance (requires auto-repay to be enabled)
   */
  async autoRepayFromBalance(repayAmount: bigint): Promise<{
    hash: string;
    remaining: bigint;
  }> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.autoRepayFromBalance([repayAmount]);
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    // Query remaining MUSD balance after repayment
    let remaining = BigInt(0);
    if (this.walletClient?.account) {
      try {
        const musdAddress = await this.getMUSDAddress();
        const musdBalance = await this.publicClient.readContract({
          address: musdAddress,
          abi: [
            {
              inputs: [{ name: 'account', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'balanceOf',
          args: [this.walletClient.account.address],
        });
        remaining = musdBalance as bigint;
      } catch (error) {
        console.warn('Failed to query remaining balance:', error);
        remaining = BigInt(0);
      }
    }

    return { hash, remaining };
  }

  /**
   * Get BorrowerOperations address
   */
  async getBorrowerOperationsAddress(): Promise<Address> {
    return await this.contract.read.borrowerOperations();
  }

  /**
   * Get MarketFactory address
   */
  async getMarketFactoryAddress(): Promise<Address> {
    return await this.contract.read.marketFactory();
  }

  /**
   * Get MUSD token address
   */
  async getMUSDAddress(): Promise<Address> {
    return await this.contract.read.musdToken();
  }
}

