/**
 * Stripe Payout Service
 * Handles Stripe Connect for rep/referrer payouts
 */
const Stripe = require('stripe');

class StripePayoutService {
  constructor() {
    this.stripe = null;
    this.initialized = false;
  }

  /**
   * Initialize Stripe with API key
   */
  init() {
    if (this.initialized) return;
    
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      console.warn('[StripePayoutService] STRIPE_SECRET_KEY not configured - payouts disabled');
      return;
    }
    
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-04-10'
    });
    this.initialized = true;
    console.log('[StripePayoutService] Initialized successfully');
  }

  /**
   * Check if Stripe is available
   */
  isAvailable() {
    return this.initialized && this.stripe !== null;
  }

  /**
   * Create a Stripe Connect Express account for a user
   * @param {Object} user - User object with email, name
   * @returns {Object} - Account creation result with onboarding link
   */
  async createConnectedAccount(user) {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      // Create Express connected account
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: user.email,
        capabilities: {
          transfers: { requested: true }
        },
        business_type: 'individual',
        business_profile: {
          name: user.name,
          product_description: 'Commission payouts for sales and referrals'
        },
        metadata: {
          user_id: user.user_id,
          platform: 'plan4growth'
        }
      });

      return {
        success: true,
        account_id: account.id,
        account
      };
    } catch (error) {
      console.error('[StripePayoutService] Error creating connected account:', error);
      throw error;
    }
  }

  /**
   * Generate account onboarding link
   * @param {string} accountId - Stripe Connect account ID
   * @param {string} returnUrl - URL to return to after onboarding
   * @param {string} refreshUrl - URL if onboarding expires
   */
  async createAccountLink(accountId, returnUrl, refreshUrl) {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return {
        success: true,
        url: accountLink.url,
        expires_at: accountLink.expires_at
      };
    } catch (error) {
      console.error('[StripePayoutService] Error creating account link:', error);
      throw error;
    }
  }

  /**
   * Get account status
   * @param {string} accountId - Stripe Connect account ID
   */
  async getAccountStatus(accountId) {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      return {
        success: true,
        account_id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        external_accounts: account.external_accounts?.data || []
      };
    } catch (error) {
      console.error('[StripePayoutService] Error getting account status:', error);
      throw error;
    }
  }

  /**
   * Create a transfer to a connected account
   * This moves funds from platform to connected account
   * @param {string} accountId - Stripe Connect account ID
   * @param {number} amount - Amount in GBP (will be converted to pence)
   * @param {Object} metadata - Additional metadata
   */
  async createTransfer(accountId, amount, metadata = {}) {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const amountInPence = Math.round(amount * 100);
      
      const transfer = await this.stripe.transfers.create({
        amount: amountInPence,
        currency: 'gbp',
        destination: accountId,
        metadata: {
          ...metadata,
          platform: 'plan4growth'
        }
      });

      return {
        success: true,
        transfer_id: transfer.id,
        amount: transfer.amount / 100,
        status: transfer.reversed ? 'reversed' : 'completed',
        transfer
      };
    } catch (error) {
      console.error('[StripePayoutService] Error creating transfer:', error);
      throw error;
    }
  }

  /**
   * Create a payout from connected account to their bank
   * This initiates the actual bank transfer
   * @param {string} accountId - Stripe Connect account ID  
   * @param {number} amount - Amount in GBP
   * @param {Object} metadata - Additional metadata
   */
  async createPayout(accountId, amount, metadata = {}) {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const amountInPence = Math.round(amount * 100);
      
      const payout = await this.stripe.payouts.create(
        {
          amount: amountInPence,
          currency: 'gbp',
          metadata: {
            ...metadata,
            platform: 'plan4growth'
          }
        },
        {
          stripeAccount: accountId
        }
      );

      return {
        success: true,
        payout_id: payout.id,
        amount: payout.amount / 100,
        status: payout.status,
        arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null,
        payout
      };
    } catch (error) {
      console.error('[StripePayoutService] Error creating payout:', error);
      throw error;
    }
  }

  /**
   * Get balance for connected account
   * @param {string} accountId - Stripe Connect account ID
   */
  async getAccountBalance(accountId) {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: accountId
      });

      const available = balance.available.find(b => b.currency === 'gbp')?.amount || 0;
      const pending = balance.pending.find(b => b.currency === 'gbp')?.amount || 0;

      return {
        success: true,
        available: available / 100,
        pending: pending / 100,
        currency: 'GBP'
      };
    } catch (error) {
      console.error('[StripePayoutService] Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * Get platform balance (for admin dashboard)
   */
  async getPlatformBalance() {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const balance = await this.stripe.balance.retrieve();
      
      const available = balance.available.find(b => b.currency === 'gbp')?.amount || 0;
      const pending = balance.pending.find(b => b.currency === 'gbp')?.amount || 0;

      return {
        success: true,
        available: available / 100,
        pending: pending / 100,
        currency: 'GBP'
      };
    } catch (error) {
      console.error('[StripePayoutService] Error getting platform balance:', error);
      throw error;
    }
  }

  /**
   * List all transfers (for admin dashboard)
   * @param {Object} options - Filter options
   */
  async listTransfers(options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const transfers = await this.stripe.transfers.list({
        limit: options.limit || 20,
        ...options
      });

      return {
        success: true,
        transfers: transfers.data.map(t => ({
          id: t.id,
          amount: t.amount / 100,
          currency: t.currency,
          destination: t.destination,
          created: new Date(t.created * 1000),
          metadata: t.metadata
        })),
        has_more: transfers.has_more
      };
    } catch (error) {
      console.error('[StripePayoutService] Error listing transfers:', error);
      throw error;
    }
  }
}

// Export singleton instance
const stripePayoutService = new StripePayoutService();
module.exports = stripePayoutService;
