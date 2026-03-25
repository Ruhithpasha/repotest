/**
 * Referral Service
 * 
 * Handles referral link generation, tracking, and fraud detection
 * Integrates with Stripe Radar for advanced fraud checks
 */

const { v4: uuidv4 } = require('uuid');
const { 
  ReferralRepository, 
  UserRepository,
  LeadRepository 
} = require('../repositories');
const AuditLogger = require('./auditLogger');

// Referral cookie duration in days
const REFERRAL_COOKIE_DAYS = 30;

/**
 * Generate a unique referral code for a user
 */
async function generateReferralCode(userId) {
  const user = await UserRepository.findByUserId(userId);
  if (!user) return null;

  // Generate code: First 3 letters of name + random alphanumeric
  const namePrefix = (user.name || 'REF').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const randomPart = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
  const code = `${namePrefix}${randomPart}`;

  // Check uniqueness
  const existing = await UserRepository.findByReferralCode(code);
  if (existing) {
    // Regenerate with more randomness
    return generateReferralCode(userId);
  }

  await UserRepository.updateUser(userId, { referral_code: code });
  return code;
}

/**
 * Track a referral click
 */
async function trackReferralClick(referralCode, ipAddress = null, userAgent = null) {
  // Find or create referral tracking record
  const referrer = await UserRepository.findByReferralCode(referralCode);
  if (!referrer) return null;

  // Get existing referrals for this code to update click count
  const existingReferrals = await ReferralRepository.findByReferralCode(referralCode);
  
  // If there's a pending referral without email, update its click count
  const pendingReferral = existingReferrals.find(r => r.status === 'pending' && !r.referred_email);
  if (pendingReferral) {
    return ReferralRepository.updateReferral(pendingReferral.referral_id, {
      click_count: (pendingReferral.click_count || 0) + 1,
      last_click_at: new Date(),
      ip_address: ipAddress
    });
  }

  // Otherwise create a new pending referral record
  const referralId = `ref_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  return ReferralRepository.createReferral({
    referral_id: referralId,
    referrer_user_id: referrer.user_id,
    referral_code: referralCode,
    referred_email: '',
    status: 'pending',
    click_count: 1,
    first_click_at: new Date(),
    last_click_at: new Date(),
    expires_at: new Date(Date.now() + REFERRAL_COOKIE_DAYS * 24 * 60 * 60 * 1000),
    ip_address: ipAddress
  });
}

/**
 * Attribute a registration to a referral
 */
async function attributeReferral(referralCode, referredEmail, referredName, leadId = null) {
  const referrer = await UserRepository.findByReferralCode(referralCode);
  if (!referrer) {
    return { success: false, error: 'Invalid referral code' };
  }

  // Check for self-referral
  if (referrer.email.toLowerCase() === referredEmail.toLowerCase()) {
    return { success: false, error: 'Self-referral not allowed', fraud: true };
  }

  // Check if email was already referred
  const existingReferral = await ReferralRepository.findByReferredEmail(referredEmail);
  if (existingReferral && existingReferral.status !== 'expired') {
    return { success: false, error: 'Email already referred', existing: existingReferral };
  }

  // Create referral record
  const referralId = `ref_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const referral = await ReferralRepository.createReferral({
    referral_id: referralId,
    referrer_user_id: referrer.user_id,
    referral_code: referralCode,
    referred_email: referredEmail,
    referred_name: referredName,
    referred_lead_id: leadId,
    status: 'registered',
    registered_at: new Date(),
    expires_at: new Date(Date.now() + REFERRAL_COOKIE_DAYS * 24 * 60 * 60 * 1000),
    first_click_at: new Date()
  });

  return { success: true, referral };
}

/**
 * Fraud detection checks
 */
async function checkForFraud(referral, additionalData = {}) {
  const fraudFlags = [];
  let fraudScore = 0;

  // 1. Check for same email domain as referrer
  const referrer = await UserRepository.findByUserId(referral.referrer_user_id);
  if (referrer) {
    const referrerDomain = referrer.email.split('@')[1];
    const referredDomain = referral.referred_email.split('@')[1];
    if (referrerDomain === referredDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(referrerDomain)) {
      fraudFlags.push({ type: 'same_email_domain', details: referrerDomain });
      fraudScore += 30;
    }
  }

  // 2. Check for high volume referrals from same referrer in short time
  const recentReferrals = await ReferralRepository.findByReferrer(referral.referrer_user_id);
  const last24Hours = recentReferrals.filter(r => 
    new Date(r.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  if (last24Hours.length > 5) {
    fraudFlags.push({ type: 'high_volume', details: `${last24Hours.length} referrals in 24 hours` });
    fraudScore += 20;
  }

  // 3. Check for same IP address
  if (additionalData.ipAddress && referral.ip_address === additionalData.ipAddress) {
    fraudFlags.push({ type: 'same_ip', details: additionalData.ipAddress });
    fraudScore += 40;
  }

  // 4. Check phone number similarity (if provided)
  if (additionalData.phone && additionalData.referrerPhone) {
    // Same phone number
    if (additionalData.phone === additionalData.referrerPhone) {
      fraudFlags.push({ type: 'same_phone', details: 'Phone numbers match' });
      fraudScore += 50;
    }
  }

  // Determine if manual review is needed
  const needsReview = fraudScore >= 30;

  // Update referral with fraud data
  await ReferralRepository.updateReferral(referral.referral_id, {
    fraud_flags: fraudFlags.length > 0 ? fraudFlags : null,
    fraud_score: fraudScore,
    fraud_review_status: needsReview ? 'pending' : 'not_required'
  });

  return {
    fraudScore,
    fraudFlags,
    needsReview,
    isBlocked: fraudScore >= 70
  };
}

/**
 * Mark referral as paid and eligible for commission
 */
async function markReferralPaid(referralId, paymentDetails) {
  const referral = await ReferralRepository.findByReferralId(referralId);
  if (!referral) return null;

  // Check fraud status
  if (referral.fraud_review_status === 'pending') {
    return { success: false, error: 'Referral pending fraud review' };
  }
  if (referral.fraud_review_status === 'rejected') {
    return { success: false, error: 'Referral rejected due to fraud' };
  }

  await ReferralRepository.updateStatus(referralId, 'paid', {
    paid_at: new Date(),
    sale_amount: paymentDetails.amount,
    commission_amount: paymentDetails.amount * parseFloat(referral.referral_percent || 0.05)
  });

  return { success: true };
}

/**
 * Get referrer's dashboard data
 */
async function getReferrerDashboard(userId) {
  const user = await UserRepository.findByUserId(userId);
  if (!user) return null;

  // Ensure user has a referral code
  let referralCode = user.referral_code;
  if (!referralCode) {
    referralCode = await generateReferralCode(userId);
  }

  // Get referral stats
  const stats = await ReferralRepository.getReferrerStats(userId);
  const totalEarnings = await ReferralRepository.getTotalEarnings(userId);
  const pendingEarnings = await ReferralRepository.getPendingEarnings(userId);

  // Get recent referrals
  const referrals = await ReferralRepository.findByReferrer(userId);

  return {
    referral_code: referralCode,
    referral_link: `${process.env.FRONTEND_URL || 'https://plan4growth.uk'}/register?ref=${referralCode}`,
    stats: {
      total_clicks: stats.total_clicks || 0,
      total_registrations: referrals.filter(r => r.status !== 'pending').length,
      total_paid: referrals.filter(r => ['paid', 'commission_created', 'commission_paid'].includes(r.status)).length,
      total_earnings: totalEarnings,
      pending_earnings: pendingEarnings
    },
    recent_referrals: referrals.slice(0, 10).map(r => ({
      referral_id: r.referral_id,
      referred_name: r.referred_name || 'Anonymous',
      status: r.status,
      created_at: r.created_at,
      commission_amount: r.commission_amount
    }))
  };
}

const ReferralService = {
  generateReferralCode,
  trackReferralClick,
  attributeReferral,
  checkForFraud,
  markReferralPaid,
  getReferrerDashboard,
  REFERRAL_COOKIE_DAYS
};

module.exports = ReferralService;
