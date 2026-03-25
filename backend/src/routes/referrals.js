/**
 * Referral Routes
 * Handles student referral system - code generation, validation, and stats
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { User, Student, Referral, Commission, AuditLog, ReferralAttribution, Payout, sequelize } = require('../models/pg');
const { Op, fn, col, literal } = require('sequelize');
const authMiddleware = require('../middleware/auth');

// Cookie duration in days
const REFERRAL_COOKIE_DAYS = 30;

/**
 * Generate a unique referral code
 */
const generateReferralCode = (userId) => {
  const hash = crypto.createHash('sha256').update(userId + Date.now().toString()).digest('hex');
  return `P4G-${hash.slice(0, 8).toUpperCase()}`;
};

/**
 * POST /api/referrals/validate
 * Validate a referral code (used during registration)
 * No auth required - called before registration
 */
router.post('/validate', async (req, res) => {
  try {
    const { referral_code, registering_email, ip_address } = req.body;

    if (!referral_code) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Referral code is required' 
      });
    }

    // Find the referrer by code
    const referrer = await User.findOne({ 
      where: { referral_code: referral_code.toUpperCase() } 
    });

    if (!referrer) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Invalid referral code' 
      });
    }

    // Check if referrer is an enrolled student
    const referrerStudent = await Student.findOne({ where: { user_id: referrer.user_id } });
    if (!referrerStudent || referrerStudent.status !== 'enrolled') {
      return res.status(400).json({ 
        valid: false, 
        error: 'This referral code is no longer active' 
      });
    }

    // Fraud check 1: Self-referral attempt
    if (registering_email && referrer.email.toLowerCase() === registering_email.toLowerCase()) {
      await AuditLog.create({
        log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: referrer.user_id,
        action_type: 'referral_self_attempt',
        object_type: 'referral',
        description: JSON.stringify({ referral_code, email: registering_email, ip_address }),
        actor_role: 'system',
        ip_address
      });

      return res.status(400).json({ 
        valid: false, 
        error: 'You cannot use your own referral code' 
      });
    }

    // Fraud check 2: IP abuse - check if too many referrals from same IP in 24 hours
    if (ip_address) {
      const recentReferralsFromIP = await Referral.count({
        where: {
          ip_address: ip_address,
          created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      if (recentReferralsFromIP >= 5) {
        await AuditLog.create({
          log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
          user_id: referrer.user_id,
          action_type: 'referral_ip_abuse',
          object_type: 'referral',
          description: JSON.stringify({ referral_code, ip_address, count: recentReferralsFromIP }),
          actor_role: 'system',
          ip_address
        });

        return res.status(429).json({ 
          valid: false, 
          error: 'Too many referral attempts. Please try again later.' 
        });
      }
    }

    // Fraud check 3: Check if this email was already referred
    if (registering_email) {
      const existingReferral = await Referral.findOne({
        where: { referred_email: registering_email.toLowerCase() }
      });

      if (existingReferral) {
        return res.status(400).json({ 
          valid: false, 
          error: 'This email has already been referred' 
        });
      }
    }

    return res.json({
      valid: true,
      referrer_name: referrer.name.split(' ')[0], // First name only for privacy
      referrer_user_id: referrer.user_id,
      bonus_message: 'Your friend will earn £50 when you complete enrollment!'
    });

  } catch (error) {
    console.error('[Referrals] Error validating code:', error);
    return res.status(500).json({ 
      valid: false, 
      error: 'Failed to validate referral code' 
    });
  }
});

/**
 * POST /api/referrals/track-click
 * Track when someone clicks a referral link
 * No auth required
 */
router.post('/track-click', async (req, res) => {
  try {
    const { referral_code, ip_address, user_agent } = req.body;

    if (!referral_code) {
      return res.status(400).json({ error: 'Referral code required' });
    }

    const referrer = await User.findOne({ 
      where: { referral_code: referral_code.toUpperCase() } 
    });

    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Check if there's an existing pending referral from this IP
    let referral = await Referral.findOne({
      where: {
        referral_code: referral_code.toUpperCase(),
        ip_address: ip_address,
        status: 'pending'
      }
    });

    if (referral) {
      // Update click count
      await referral.update({
        click_count: referral.click_count + 1,
        last_click_at: new Date()
      });
    } else {
      // Create a new pending referral record
      referral = await Referral.create({
        referral_id: `ref_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        referrer_user_id: referrer.user_id,
        referral_code: referral_code.toUpperCase(),
        referred_email: '', // Will be filled when they register
        status: 'pending',
        click_count: 1,
        first_click_at: new Date(),
        last_click_at: new Date(),
        ip_address: ip_address,
        device_fingerprint: user_agent,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }

    return res.json({ success: true, referral_id: referral.referral_id });

  } catch (error) {
    console.error('[Referrals] Error tracking click:', error);
    return res.status(500).json({ error: 'Failed to track referral click' });
  }
});

/**
 * POST /api/referrals/track
 * NEW: Track referral click and generate click_token for cookie
 * No auth required - public endpoint
 */
router.post('/track', async (req, res) => {
  try {
    const { referral_code } = req.body;
    const ip_address = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.body.ip_address;
    const user_agent = req.headers['user-agent'] || req.body.user_agent;
    const referer_url = req.headers['referer'] || req.body.referer_url;

    if (!referral_code) {
      return res.status(400).json({ error: 'Referral code required' });
    }

    const normalizedCode = referral_code.toUpperCase();

    // Validate referral code exists
    const referrer = await User.findOne({ 
      where: { referral_code: normalizedCode } 
    });

    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Generate unique click token
    const clickToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFERRAL_COOKIE_DAYS * 24 * 60 * 60 * 1000);

    // Create attribution record
    const attribution = await ReferralAttribution.create({
      referral_code_id: normalizedCode,
      referrer_user_id: referrer.user_id,
      click_token: clickToken,
      ip_address: ip_address || null,
      user_agent: user_agent || null,
      referer_url: referer_url || null,
      expires_at: expiresAt,
      clicked_at: new Date()
    });

    // Also update legacy referral tracking for backward compatibility
    let referral = await Referral.findOne({
      where: {
        referral_code: normalizedCode,
        ip_address: ip_address,
        status: 'pending'
      }
    });

    if (referral) {
      await referral.update({
        click_count: referral.click_count + 1,
        last_click_at: new Date()
      });
    } else {
      await Referral.create({
        referral_id: `ref_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        referrer_user_id: referrer.user_id,
        referral_code: normalizedCode,
        referred_email: '',
        status: 'pending',
        click_count: 1,
        first_click_at: new Date(),
        last_click_at: new Date(),
        ip_address: ip_address,
        device_fingerprint: user_agent,
        expires_at: expiresAt
      });
    }

    // Return click token and cookie info
    return res.json({ 
      success: true, 
      click_token: clickToken,
      referrer_name: referrer.name.split(' ')[0], // First name only
      expires_at: expiresAt.toISOString(),
      cookie_name: 'ref_token',
      cookie_days: REFERRAL_COOKIE_DAYS
    });

  } catch (error) {
    console.error('[Referrals] Error tracking referral:', error);
    return res.status(500).json({ error: 'Failed to track referral' });
  }
});

/**
 * POST /api/referrals/attribute
 * Attribute an enrolment to a referral using the click_token
 * Called internally during enrolment creation
 */
router.post('/attribute', async (req, res) => {
  try {
    const { click_token, enrolment_id, student_email } = req.body;

    if (!click_token) {
      return res.json({ success: false, error: 'No click token provided' });
    }

    // Find the attribution record
    const attribution = await ReferralAttribution.findOne({
      where: { 
        click_token: click_token,
        converted: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!attribution) {
      return res.json({ success: false, error: 'Invalid or expired click token' });
    }

    // Mark as converted
    await attribution.update({
      converted: true,
      converted_at: new Date(),
      enrolment_id: enrolment_id
    });

    // Return referrer info for commission creation
    return res.json({ 
      success: true, 
      referrer_user_id: attribution.referrer_user_id,
      referral_code: attribution.referral_code_id,
      attribution_id: attribution.id
    });

  } catch (error) {
    console.error('[Referrals] Error attributing referral:', error);
    return res.status(500).json({ success: false, error: 'Failed to attribute referral' });
  }
});

/**
 * GET /api/referrals/payout-requests
 * Get all referral payout requests for admin
 * Auth required - super_admin only
 */
router.get('/payout-requests', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status } = req.query;

    // Get all payouts where the user is a student (referrer payouts)
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const payouts = await Payout.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: 100
    });

    // Filter to only include referrer payouts (students with referral bonuses)
    const enrichedPayouts = await Promise.all(payouts.map(async (payout) => {
      const user = await User.findByPk(payout.user_id);
      const student = await Student.findOne({ where: { user_id: payout.user_id } });
      
      // Get commissions linked to this payout
      const commissions = payout.commission_ids ? await Commission.findAll({
        where: { commission_id: { [Op.in]: payout.commission_ids } }
      }) : [];
      
      const isReferrerPayout = commissions.some(c => c.role_type === 'referrer') || 
                               (student && payout.notes?.includes('referral'));

      return {
        ...payout.toJSON(),
        user_name: user?.name || payout.user_name,
        user_email: user?.email || payout.user_email,
        user_role: user?.role,
        is_student: !!student,
        is_referrer_payout: isReferrerPayout,
        commissions: commissions.map(c => ({
          commission_id: c.commission_id,
          amount: c.commission_amount_gbp,
          role_type: c.role_type,
          status: c.status
        }))
      };
    }));

    // Filter to only show referrer payouts if needed
    const referrerPayouts = enrichedPayouts.filter(p => p.is_referrer_payout || p.is_student);

    return res.json(referrerPayouts);

  } catch (error) {
    console.error('[Referrals] Error getting payout requests:', error);
    return res.status(500).json({ error: 'Failed to get payout requests' });
  }
});

/**
 * GET /api/referrals/analytics
 * Get referral click analytics for Super Admin (Referral Analytics tab)
 * Auth required - super_admin only
 */
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Super Admin access required' });
    }

    const { date_from, date_to, referral_code } = req.query;

    // Build where clause for ReferralAttribution (click tracking)
    const clickWhere = {};
    if (referral_code) {
      clickWhere.referral_code_id = referral_code.toUpperCase();
    }
    if (date_from || date_to) {
      clickWhere.clicked_at = {};
      if (date_from) clickWhere.clicked_at[Op.gte] = new Date(date_from);
      if (date_to) clickWhere.clicked_at[Op.lte] = new Date(date_to);
    }

    // Build where clause for Referrals table (direct registrations)
    const refWhere = {};
    if (referral_code) {
      refWhere.referral_code = referral_code.toUpperCase();
    }
    if (date_from || date_to) {
      refWhere.created_at = {};
      if (date_from) refWhere.created_at[Op.gte] = new Date(date_from);
      if (date_to) refWhere.created_at[Op.lte] = new Date(date_to);
    }

    // Get total clicks from ReferralAttribution
    const totalClicks = await ReferralAttribution.count({ where: clickWhere });

    // Get total conversions from ReferralAttribution
    const attrConversions = await ReferralAttribution.count({
      where: { ...clickWhere, converted: true }
    });

    // Get referrals from Referrals table (direct sign-ups with referral code)
    const referrals = await Referral.findAll({ where: refWhere });
    const totalReferrals = referrals.length;
    const referralConversions = referrals.filter(r => r.status === 'paid').length;

    // Combine totals
    const combinedClicks = totalClicks + totalReferrals;
    const combinedConversions = attrConversions + referralConversions;

    // Get clicks by referral code from ReferralAttribution
    const clicksByCode = await ReferralAttribution.findAll({
      where: clickWhere,
      attributes: [
        'referral_code_id',
        'referrer_user_id',
        [fn('COUNT', col('id')), 'clicks'],
        [literal('SUM(CASE WHEN converted THEN 1 ELSE 0 END)'), 'conversions']
      ],
      group: ['referral_code_id', 'referrer_user_id'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true
    });

    // Get referrals by code from Referrals table - count all as we filter conversions separately
    const referralsByCode = await Referral.findAll({
      where: refWhere,
      attributes: [
        'referral_code',
        'referrer_user_id',
        [fn('COUNT', col('referral_id')), 'referrals']
      ],
      group: ['referral_code', 'referrer_user_id'],
      order: [[fn('COUNT', col('referral_id')), 'DESC']],
      raw: true
    });

    // Merge and enrich both datasets
    const codeMap = new Map();
    
    for (const item of clicksByCode) {
      const key = item.referral_code_id;
      if (!codeMap.has(key)) {
        codeMap.set(key, { referral_code: key, referrer_user_id: item.referrer_user_id, clicks: 0, referrals: 0, conversions: 0 });
      }
      codeMap.get(key).clicks += parseInt(item.clicks) || 0;
      codeMap.get(key).conversions += parseInt(item.conversions) || 0;
    }
    
    for (const item of referralsByCode) {
      const key = item.referral_code;
      if (!codeMap.has(key)) {
        codeMap.set(key, { referral_code: key, referrer_user_id: item.referrer_user_id, clicks: 0, referrals: 0, conversions: 0 });
      }
      codeMap.get(key).referrals += parseInt(item.referrals) || 0;
      // Conversions counted separately from referrals with paid status
    }
    
    // Count paid conversions per code
    const paidReferrals = referrals.filter(r => r.status === 'paid');
    for (const r of paidReferrals) {
      if (codeMap.has(r.referral_code)) {
        codeMap.get(r.referral_code).conversions += 1;
      }
    }

    const enrichedByCode = await Promise.all([...codeMap.values()].map(async (item) => {
      const referrer = await User.findByPk(item.referrer_user_id, {
        attributes: ['name', 'email', 'role']
      });
      const total = item.clicks + item.referrals;
      return {
        referral_code: item.referral_code,
        referrer_name: referrer?.name || 'Unknown',
        referrer_email: referrer?.email || '',
        referrer_role: referrer?.role || '',
        clicks: item.clicks,
        referrals: item.referrals,
        conversions: item.conversions,
        conversion_rate: total > 0 ? ((item.conversions / total) * 100).toFixed(1) : '0.0'
      };
    }));

    // Get recent clicks (last 50) from ReferralAttribution
    const recentClicks = await ReferralAttribution.findAll({
      where: clickWhere,
      order: [['clicked_at', 'DESC']],
      limit: 50,
      include: [{ model: User, as: 'referrer', attributes: ['name', 'email'] }]
    });

    // Get recent referrals (last 50) from Referrals table
    const recentReferrals = await Referral.findAll({
      where: refWhere,
      order: [['created_at', 'DESC']],
      limit: 50,
      include: [{ model: User, as: 'referrer', attributes: ['name', 'email'] }]
    });

    // Combine recent activity
    const recentActivity = [
      ...recentClicks.map(c => ({
        id: c.id,
        type: 'click',
        referral_code: c.referral_code_id,
        referrer_name: c.referrer?.name,
        ip_address: c.ip_address,
        timestamp: c.clicked_at,
        converted: c.converted,
        converted_at: c.converted_at
      })),
      ...recentReferrals.map(r => ({
        id: r.referral_id,
        type: 'registration',
        referral_code: r.referral_code,
        referrer_name: r.referrer?.name,
        referred_email: r.referred_email,
        referred_name: r.referred_name,
        timestamp: r.created_at,
        status: r.status,
        converted: r.status === 'paid'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

    // Count active referrers
    const activeReferrers = codeMap.size;

    return res.json({
      total_clicks: combinedClicks,
      total_conversions: combinedConversions,
      conversion_rate: combinedClicks > 0 ? ((combinedConversions / combinedClicks) * 100).toFixed(1) : '0.0',
      active_referrers: activeReferrers,
      by_referral_code: enrichedByCode,
      recent_clicks: recentActivity
    });

  } catch (error) {
    console.error('[Referrals] Error getting analytics:', error);
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Apply auth middleware to remaining routes that require authentication
router.use(authMiddleware);

/**
 * GET /api/referrals/my-code
 * Get or generate the student's referral code
 * Only enrolled students can get a referral code
 */
router.get('/my-code', async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Check if user is an enrolled student
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return res.status(403).json({ 
        error: 'Not a student',
        eligible: false,
        message: 'You must be a registered student to access referrals.'
      });
    }

    if (student.status !== 'enrolled') {
      return res.status(403).json({ 
        error: 'Not enrolled',
        eligible: false,
        status: student.status,
        message: 'Complete your enrollment and payment to unlock referral features.'
      });
    }

    // Check if user already has a referral code
    let user = await User.findByPk(userId);
    
    if (!user.referral_code) {
      // Generate a new referral code
      const newCode = generateReferralCode(userId);
      await user.update({ referral_code: newCode });
      user = await User.findByPk(userId);
      
      // Log the code generation
      await AuditLog.create({
        log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: userId,
        action_type: 'referral_code_generated',
        object_type: 'user',
        object_id: userId,
        description: JSON.stringify({ referral_code: newCode }),
        actor_role: 'student'
      });
    }

    return res.json({
      eligible: true,
      referral_code: user.referral_code,
      share_link: `${process.env.FRONTEND_URL || 'https://plan4growth.uk'}/register?ref=${user.referral_code}`,
      bonus_amount: 50 // £50 flat bonus per enrolled referral
    });

  } catch (error) {
    console.error('[Referrals] Error getting referral code:', error);
    return res.status(500).json({ error: 'Failed to get referral code' });
  }
});

/**
 * GET /api/referrals/my-stats
 * Get referral statistics for the logged-in student
 */
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Check if user is an enrolled student
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student || student.status !== 'enrolled') {
      return res.status(403).json({ 
        error: 'Not eligible',
        message: 'Only enrolled students can view referral stats.'
      });
    }

    const user = await User.findByPk(userId);
    if (!user.referral_code) {
      return res.json({
        total_referrals: 0,
        pending_referrals: 0,
        enrolled_referrals: 0,
        total_earned: 0,
        pending_earnings: 0,
        payable_earnings: 0,
        payable_count: 0,
        referrals: [],
        existing_payout: null
      });
    }

    // Get all referrals made by this user
    const referrals = await Referral.findAll({
      where: { referrer_user_id: userId },
      order: [['created_at', 'DESC']]
    });

    // Get commission stats for this user's referrals
    const commissions = await Commission.findAll({
      where: { 
        rep_id: userId,
        role_type: 'referrer'
      }
    });

    const totalEarned = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + parseFloat(c.commission_amount_gbp || 0), 0);

    const pendingCommissions = commissions.filter(c => 
      ['pending_validation', 'pending_approval', 'approved'].includes(c.status)
    );
    const pendingEarnings = pendingCommissions
      .reduce((sum, c) => sum + parseFloat(c.commission_amount_gbp || 0), 0);

    // Payable commissions (ready to claim)
    const payableCommissions = commissions.filter(c => 
      c.status === 'payable' && !c.payout_id
    );
    const payableEarnings = payableCommissions
      .reduce((sum, c) => sum + parseFloat(c.commission_amount_gbp || 0), 0);

    // Check for existing pending/approved payout
    const existingPayout = await Payout.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: ['pending', 'approved'] }
      },
      order: [['created_at', 'DESC']]
    });

    // Map referrals with status
    const referralDetails = await Promise.all(referrals.map(async (ref) => {
      // Get referred student status if they enrolled
      let referredStudent = null;
      let commissionStatus = null;
      
      if (ref.referred_student_id) {
        referredStudent = await Student.findByPk(ref.referred_student_id);
        
        // Find associated commission
        const relatedCommission = commissions.find(c => c.student_id === ref.referred_student_id);
        if (relatedCommission) {
          commissionStatus = relatedCommission.status;
        }
      }

      return {
        referral_id: ref.referral_id,
        referred_email: ref.referred_email,
        referred_name: ref.referred_name,
        status: ref.status,
        bonus_amount: ref.commission_amount || 50,
        commission_status: commissionStatus,
        created_at: ref.created_at,
        enrolled_at: referredStudent?.enrolled_at || null
      };
    }));

    return res.json({
      total_referrals: referrals.length,
      pending_referrals: referrals.filter(r => ['pending', 'registered', 'payment_pending'].includes(r.status)).length,
      enrolled_referrals: referrals.filter(r => ['paid', 'commission_created', 'commission_paid'].includes(r.status)).length,
      total_earned: totalEarned,
      pending_earnings: pendingEarnings,
      payable_earnings: payableEarnings,
      payable_count: payableCommissions.length,
      referrals: referralDetails,
      existing_payout: existingPayout ? {
        payout_id: existingPayout.payout_id,
        total_amount: existingPayout.total_amount,
        status: existingPayout.status,
        created_at: existingPayout.created_at
      } : null
    });

  } catch (error) {
    console.error('[Referrals] Error getting stats:', error);
    return res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

/**
 * POST /api/referrals/claim-bonus
 * Student claims their referral bonus - creates a payout request
 * Auth required - enrolled students only
 */
router.post('/claim-bonus', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Must be a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    // Find student record
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Must be enrolled
    if (student.status !== 'enrolled') {
      return res.status(400).json({ error: 'Only enrolled students can claim referral bonuses' });
    }

    // Find payable referrer commissions for this student (as referrer)
    const payableCommissions = await Commission.findAll({
      where: {
        rep_id: userId,
        role_type: 'referrer',
        status: 'payable',
        payout_id: null
      }
    });

    if (payableCommissions.length === 0) {
      return res.status(400).json({ error: 'No payable referral bonuses to claim' });
    }

    // Check if there's already a pending or approved payout for this user
    const existingPayout = await Payout.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    });

    if (existingPayout) {
      return res.status(400).json({ 
        error: 'You already have a pending payout request',
        payout_id: existingPayout.payout_id
      });
    }

    // Calculate total amount
    const totalAmount = payableCommissions.reduce(
      (sum, c) => sum + parseFloat(c.commission_amount_gbp || 0), 
      0
    );

    // Create payout
    const payoutId = `payout_${require('crypto').randomBytes(6).toString('hex')}`;
    const payout = await Payout.create({
      payout_id: payoutId,
      user_id: userId,
      total_amount: totalAmount,
      commission_count: payableCommissions.length,
      status: 'pending',
      notes: 'Student referral bonus claim'
    });

    // Link commissions to payout
    const commissionIds = payableCommissions.map(c => c.commission_id);
    await Commission.update(
      { payout_id: payoutId },
      { where: { commission_id: { [Op.in]: commissionIds } } }
    );

    // Get user details for response
    const user = await User.findByPk(userId);

    return res.status(201).json({
      message: 'Payout request submitted successfully',
      payout: {
        payout_id: payout.payout_id,
        total_amount: totalAmount,
        commission_count: payableCommissions.length,
        status: 'pending',
        user_name: user?.name,
        user_email: user?.email,
        created_at: payout.created_at
      }
    });

  } catch (error) {
    console.error('[Referrals] Error claiming bonus:', error);
    return res.status(500).json({ error: 'Failed to claim bonus' });
  }
});

module.exports = router;
