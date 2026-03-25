const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const authMiddleware = require('../middleware/auth');
const stripePayoutService = require('../services/StripePayoutService');
const { User } = require('../models/pg');

// Initialize Stripe service
stripePayoutService.init();

// All routes require authentication
router.use(authMiddleware);

// ============================================
// STRIPE CONNECT ROUTES
// ============================================

/**
 * GET /api/payouts/stripe/status
 * Check if Stripe payouts are available and get platform balance
 */
router.get('/stripe/status', async (req, res) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }

  try {
    if (!stripePayoutService.isAvailable()) {
      return res.json({
        available: false,
        message: 'Stripe is not configured'
      });
    }

    const balance = await stripePayoutService.getPlatformBalance();
    return res.json({
      available: true,
      platform_balance: balance
    });
  } catch (error) {
    console.error('[Payouts] Stripe status error:', error);
    return res.json({
      available: false,
      message: error.message
    });
  }
});

/**
 * POST /api/payouts/stripe/create-account
 * Create a Stripe Connect account for a user
 */
router.post('/stripe/create-account', async (req, res) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }

  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ detail: 'user_id is required' });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Check if user already has a Stripe account
    if (user.bank_details?.stripe_account_id) {
      return res.status(400).json({ 
        detail: 'User already has a Stripe Connect account',
        stripe_account_id: user.bank_details.stripe_account_id
      });
    }

    const result = await stripePayoutService.createConnectedAccount(user);

    // Save the Stripe account ID to user's bank_details
    const bankDetails = user.bank_details || {};
    bankDetails.stripe_account_id = result.account_id;
    bankDetails.stripe_setup_complete = false;
    await user.update({ bank_details: bankDetails });

    return res.json({
      success: true,
      account_id: result.account_id,
      message: 'Stripe Connect account created. User needs to complete onboarding.'
    });
  } catch (error) {
    console.error('[Payouts] Create Stripe account error:', error);
    return res.status(500).json({ detail: error.message });
  }
});

/**
 * POST /api/payouts/stripe/onboarding-link
 * Generate an onboarding link for a user to complete Stripe setup
 */
router.post('/stripe/onboarding-link', async (req, res) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }

  try {
    const { user_id, return_url, refresh_url } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ detail: 'user_id is required' });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const stripeAccountId = user.bank_details?.stripe_account_id;
    if (!stripeAccountId) {
      return res.status(400).json({ detail: 'User does not have a Stripe Connect account' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://plan4growth.uk';
    const result = await stripePayoutService.createAccountLink(
      stripeAccountId,
      return_url || `${baseUrl}/portal/crm/payouts?stripe_setup=complete`,
      refresh_url || `${baseUrl}/portal/crm/payouts?stripe_setup=refresh`
    );

    return res.json(result);
  } catch (error) {
    console.error('[Payouts] Create onboarding link error:', error);
    return res.status(500).json({ detail: error.message });
  }
});

/**
 * GET /api/payouts/stripe/account/:userId
 * Get Stripe Connect account status for a user
 */
router.get('/stripe/account/:userId', async (req, res) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }

  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const stripeAccountId = user.bank_details?.stripe_account_id;
    if (!stripeAccountId) {
      return res.json({
        has_account: false,
        message: 'User does not have a Stripe Connect account'
      });
    }

    const status = await stripePayoutService.getAccountStatus(stripeAccountId);
    
    // Update user's bank_details with setup status
    if (status.payouts_enabled && !user.bank_details.stripe_setup_complete) {
      const bankDetails = { ...user.bank_details, stripe_setup_complete: true };
      await user.update({ bank_details: bankDetails });
    }

    return res.json({
      has_account: true,
      ...status
    });
  } catch (error) {
    console.error('[Payouts] Get account status error:', error);
    return res.status(500).json({ detail: error.message });
  }
});

/**
 * POST /api/payouts/:payoutId/stripe-transfer
 * Initiate a Stripe transfer for an approved payout
 */
router.post('/:payoutId/stripe-transfer', async (req, res) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }

  try {
    const { payoutId } = req.params;
    const { PayoutRepository } = require('../repositories');
    
    const payout = await PayoutRepository.findByPayoutId(payoutId);
    if (!payout) {
      return res.status(404).json({ detail: 'Payout not found' });
    }

    if (payout.status !== 'approved') {
      return res.status(400).json({ detail: 'Payout must be approved before transfer' });
    }

    const user = await User.findByPk(payout.user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const stripeAccountId = user.bank_details?.stripe_account_id;
    if (!stripeAccountId) {
      return res.status(400).json({ 
        detail: 'User does not have a Stripe Connect account. Create one first.',
        needs_stripe_setup: true
      });
    }

    // Check if user's Stripe account is ready for payouts
    const accountStatus = await stripePayoutService.getAccountStatus(stripeAccountId);
    if (!accountStatus.payouts_enabled) {
      return res.status(400).json({
        detail: 'User has not completed Stripe onboarding',
        needs_onboarding: true,
        requirements: accountStatus.requirements
      });
    }

    // Create the transfer
    const transfer = await stripePayoutService.createTransfer(
      stripeAccountId,
      parseFloat(payout.total_amount),
      {
        payout_id: payoutId,
        user_id: payout.user_id,
        type: 'commission_payout'
      }
    );

    // Update payout status
    await PayoutRepository.markPaid(payoutId, req.user.user_id, transfer.transfer_id);

    return res.json({
      success: true,
      transfer_id: transfer.transfer_id,
      amount: transfer.amount,
      message: `£${transfer.amount.toFixed(2)} transferred to ${user.name}'s Stripe account`
    });
  } catch (error) {
    console.error('[Payouts] Stripe transfer error:', error);
    return res.status(500).json({ detail: error.message });
  }
});

// ============================================
// EXISTING PAYOUT ROUTES
// ============================================

// Get payout statistics (admin)
router.get('/stats', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.getStats);

// Export payouts (admin only)
router.get('/export', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.exportPayouts);

// Get my payouts
router.get('/my-payouts', payoutController.getMyPayouts);

// Get all payouts
router.get('/', payoutController.getPayouts);

// Get payout by ID
router.get('/:payoutId', payoutController.getPayout);

// Get batch items for a payout (admin or owner only)
router.get('/:payoutId/items', payoutController.getBatchItems);

// Create payout (admin only)
router.post('/', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.createPayout);

// Approve payout (admin only) - supports both POST and PATCH
router.post('/:payoutId/approve', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.approvePayout);

router.patch('/:payoutId/approve', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.approvePayout);

// Mark payout as paid (admin only) - supports both POST and PATCH
router.post('/:payoutId/paid', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.markPaid);

router.patch('/:payoutId/paid', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.markPaid);

// Cancel payout (admin only)
router.post('/:payoutId/cancel', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.cancelPayout);

// Reject payout (alias for cancel - supports both POST and PATCH)
router.patch('/:payoutId/reject', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.cancelPayout);

router.post('/:payoutId/reject', (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}, payoutController.cancelPayout);

module.exports = router;
