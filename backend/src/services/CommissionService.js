/**
 * Commission Service
 * Handles commission creation, rule matching, manager chain, and lifecycle management
 */
const { v4: uuidv4 } = require('uuid');
const { Commission, CommissionRule, User, Student, AuditLog, FraudAlert, Program, Referral } = require('../models/pg');
const { Op } = require('sequelize');

class CommissionService {
  
  /**
   * Process a successful payment and create commissions for the entire chain
   * @param {Object} payment - Payment record
   * @param {Object} student - Student record
   * @param {string} triggeredBy - 'webhook' or 'manual'
   */
  static async processPaymentCommissions(payment, student, triggeredBy = 'webhook') {
    const createdCommissions = [];
    
    try {
      console.log(`[CommissionService] Processing payment ${payment.payment_id} for student ${student.student_id}`);
      
      // Skip if commissions already exist for this payment
      const existingCommission = await Commission.findOne({ where: { payment_id: payment.payment_id } });
      if (existingCommission) {
        console.log(`[CommissionService] Commissions already exist for payment ${payment.payment_id}`);
        return { success: true, message: 'Commissions already created', commissions: [] };
      }

      const saleAmount = parseFloat(payment.amount_gbp || payment.amount || 7999);
      const programId = student.course_id || student.program_id || null;

      // 1. Find the rep who registered this student
      if (student.rep_id) {
        const rep = await User.findByPk(student.rep_id);
        if (rep && rep.is_active) {
          // Find matching commission rule for rep
          const repRule = await this.findMatchingRule('rep', programId, saleAmount);
          if (repRule) {
            const repCommission = await this.createCommission({
              recipientId: rep.user_id,
              studentId: student.student_id,
              paymentId: payment.payment_id,
              programId,
              rule: repRule,
              saleAmount,
              roleType: 'rep'
            });
            createdCommissions.push(repCommission);
            console.log(`[CommissionService] Created rep commission: ${repCommission.commission_id}`);
          }
          
          // Also check sales_user rules (rep = sales_user unification)
          const salesRule = await this.findMatchingRule('sales_user', programId, saleAmount);
          if (salesRule && !repRule) {
            const salesCommission = await this.createCommission({
              recipientId: rep.user_id,
              studentId: student.student_id,
              paymentId: payment.payment_id,
              programId,
              rule: salesRule,
              saleAmount,
              roleType: 'sales_user'
            });
            createdCommissions.push(salesCommission);
            console.log(`[CommissionService] Created sales_user commission: ${salesCommission.commission_id}`);
          }

          // 2. Walk up the manager chain
          await this.processManagerChain(rep, student, payment, programId, saleAmount, createdCommissions);
        }
      }

      // 3. Check for referral commission - student was referred by another enrolled student
      // Always try to process - will check Referral table if student.referred_by is not set
      console.log(`[CommissionService] Checking for referral commission for student: ${student.student_id}`);
      await this.processReferralCommission(student, payment, programId, saleAmount, createdCommissions);

      // 4. Log audit event
      await this.logAuditEvent('commission_created', {
        payment_id: payment.payment_id,
        student_id: student.student_id,
        commissions_count: createdCommissions.length,
        triggered_by: triggeredBy
      }, 'system');

      return { 
        success: true, 
        message: `Created ${createdCommissions.length} commission(s)`,
        commissions: createdCommissions 
      };

    } catch (error) {
      console.error('[CommissionService] Error processing commissions:', error);
      
      // Log failed attempt
      await this.logAuditEvent('commission_creation_failed', {
        payment_id: payment.payment_id,
        student_id: student.student_id,
        error: error.message
      }, 'system');

      throw error;
    }
  }

  /**
   * Process referral commission for enrolled student referrers
   */
  static async processReferralCommission(student, payment, programId, saleAmount, commissionsArray) {
    try {
      // First check student.referred_by, then check Referral table by email
      let referrerId = student.referred_by;
      let referralRecord = null;
      
      // If no direct referral, check by email in Referral table
      if (!referrerId) {
        const user = await User.findByPk(student.user_id);
        if (user) {
          referralRecord = await Referral.findOne({
            where: { 
              referred_email: user.email.toLowerCase(),
              status: { [Op.in]: ['registered', 'payment_pending'] }
            }
          });
          
          if (referralRecord) {
            referrerId = referralRecord.referrer_user_id;
            console.log(`[CommissionService] Found referral via email lookup: ${referrerId}`);
            
            // Update student record with referral info
            await student.update({
              referred_by: referrerId,
              referral_code_used: referralRecord.referral_code
            });
            
            // Update referral record with student ID
            await referralRecord.update({
              referred_student_id: student.student_id,
              status: 'paid',
              paid_at: new Date()
            });
          }
        }
      }
      
      if (!referrerId) {
        console.log(`[CommissionService] No referrer found for student ${student.student_id}`);
        return;
      }

      const referrer = await User.findByPk(referrerId);
      if (!referrer || !referrer.is_active) {
        console.log(`[CommissionService] Referrer not found or inactive: ${referrerId}`);
        return;
      }

      // Verify referrer is an enrolled student
      const referrerStudent = await Student.findOne({ where: { user_id: referrer.user_id } });
      if (!referrerStudent || referrerStudent.status !== 'enrolled') {
        console.log(`[CommissionService] Referrer is not an enrolled student`);
        return;
      }

      // Find referral commission rule - £50 flat bonus
      let referralRule = await this.findMatchingRule('referrer', programId, saleAmount);
      
      // If no rule exists, create a default £50 flat commission
      if (!referralRule) {
        console.log(`[CommissionService] No referral rule found, using default £50 flat bonus`);
        referralRule = {
          rule_id: 'default_referral',
          commission_type: 'fixed',
          commission_value: 50,
          hold_days: 14
        };
      }

      const referralCommission = await this.createCommission({
        recipientId: referrer.user_id,
        studentId: student.student_id,
        paymentId: payment.payment_id,
        programId,
        rule: referralRule,
        saleAmount,
        roleType: 'referrer',
        notes: `Referral bonus for referring ${student.student_id}`
      });
      commissionsArray.push(referralCommission);
      console.log(`[CommissionService] Created referral commission: ${referralCommission.commission_id}`);

      // Update the referral record if it exists
      if (!referralRecord) {
        referralRecord = await Referral.findOne({
          where: {
            referrer_user_id: referrer.user_id,
            referred_student_id: student.student_id
          }
        });
      }

      if (referralRecord) {
        await referralRecord.update({
          status: 'commission_created',
          commission_amount: referralCommission.commission_amount_gbp
        });
      } else {
        // Create referral record if it doesn't exist (for manual referrals)
        await Referral.create({
          referral_id: `ref_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
          referrer_user_id: referrer.user_id,
          referral_code: referrer.referral_code || 'MANUAL',
          referred_email: '', // Will be filled from student data
          referred_student_id: student.student_id,
          status: 'commission_created',
          commission_amount: referralCommission.commission_amount_gbp,
          paid_at: new Date()
        });
      }

      // Log the referral commission
      await this.logAuditEvent('referral_commission_created', {
        referrer_id: referrer.user_id,
        student_id: student.student_id,
        commission_id: referralCommission.commission_id,
        amount: referralCommission.commission_amount_gbp
      }, 'system');

    } catch (error) {
      console.error('[CommissionService] Error processing referral commission:', error);
    }
  }

  /**
   * Walk up the manager chain and create manager commissions
   */
  static async processManagerChain(rep, student, payment, programId, saleAmount, commissionsArray) {
    let currentUserId = rep.manager_id;
    let depth = 0;
    const maxDepth = 5; // Prevent infinite loops

    while (currentUserId && depth < maxDepth) {
      const manager = await User.findByPk(currentUserId);
      
      if (!manager || !manager.is_active || manager.role !== 'manager') {
        break;
      }

      // Find manager commission rule
      const managerRule = await this.findMatchingRule('manager', programId, saleAmount);
      
      if (managerRule) {
        const managerCommission = await this.createCommission({
          recipientId: manager.user_id,
          studentId: student.student_id,
          paymentId: payment.payment_id,
          programId,
          rule: managerRule,
          saleAmount,
          roleType: 'manager',
          notes: `Manager commission (level ${depth + 1}) for rep ${rep.name}`
        });
        commissionsArray.push(managerCommission);
        console.log(`[CommissionService] Created manager commission (L${depth + 1}): ${managerCommission.commission_id}`);
      }

      // Move up the chain
      currentUserId = manager.manager_id;
      depth++;
    }
  }

  /**
   * Find the matching commission rule by priority
   * Priority: Programme-specific rules > Global rules (program_id IS NULL)
   * If no rule is found, throw error and flag for admin review
   */
  static async findMatchingRule(roleType, programId, saleAmount) {
    const now = new Date();
    
    // First, try to find a programme-specific rule
    let rules = [];
    
    if (programId) {
      rules = await CommissionRule.findAll({
        where: {
          role_type: roleType,
          is_active: true,
          program_id: programId,
          [Op.and]: [
            {
              [Op.or]: [
                { start_date: null },
                { start_date: { [Op.lte]: now } }
              ]
            },
            {
              [Op.or]: [
                { end_date: null },
                { end_date: { [Op.gte]: now } }
              ]
            }
          ]
        },
        order: [['priority', 'DESC']]
      });
      
      // Check if any programme-specific rule matches minimum sale amount
      for (const rule of rules) {
        if (!rule.minimum_sale_amount || saleAmount >= parseFloat(rule.minimum_sale_amount)) {
          console.log(`[CommissionService] Found programme-specific rule: ${rule.rule_id} for program ${programId}`);
          return rule;
        }
      }
    }
    
    // Fallback: Find global rule (program_id IS NULL)
    const globalRules = await CommissionRule.findAll({
      where: {
        role_type: roleType,
        is_active: true,
        program_id: null,
        [Op.and]: [
          {
            [Op.or]: [
              { start_date: null },
              { start_date: { [Op.lte]: now } }
            ]
          },
          {
            [Op.or]: [
              { end_date: null },
              { end_date: { [Op.gte]: now } }
            ]
          }
        ]
      },
      order: [['priority', 'DESC']]
    });

    // Check if any global rule matches minimum sale amount
    for (const rule of globalRules) {
      if (!rule.minimum_sale_amount || saleAmount >= parseFloat(rule.minimum_sale_amount)) {
        console.log(`[CommissionService] Found global rule: ${rule.rule_id} (fallback)`);
        return rule;
      }
    }

    // No matching rule found - log warning for admin review
    console.warn(`[CommissionService] No matching commission rule found for roleType=${roleType}, programId=${programId}, saleAmount=${saleAmount}`);

    // Default fallback: use hardcoded rates if no rules are configured in DB
    if (roleType === 'rep' || roleType === 'sales_user') {
      console.log(`[CommissionService] Using default rep rule (4%)`);
      return { rule_id: null, commission_type: 'percentage', commission_value: 0.04, hold_days: 14 };
    }
    if (roleType === 'manager') {
      console.log(`[CommissionService] Using default manager rule (2%)`);
      return { rule_id: null, commission_type: 'percentage', commission_value: 0.02, hold_days: 14 };
    }
    return null;
  }

  /**
   * Create a commission record
   */
  static async createCommission({ recipientId, studentId, paymentId, programId, rule, saleAmount, roleType, notes }) {
    const holdDays = rule.hold_days || 14;
    const holdUntil = new Date();
    holdUntil.setDate(holdUntil.getDate() + holdDays);

    let commissionAmount;
    if (rule.commission_type === 'percentage') {
      commissionAmount = saleAmount * parseFloat(rule.commission_value);
    } else {
      commissionAmount = parseFloat(rule.commission_value);
    }

    const commission = await Commission.create({
      commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      rep_id: recipientId,
      student_id: studentId,
      payment_id: paymentId,
      program_id: programId,
      rule_id: rule.rule_id,
      role_type: roleType,
      sale_amount_gbp: saleAmount,
      commission_type: rule.commission_type,
      commission_value: rule.commission_value,
      commission_amount_gbp: commissionAmount,
      status: 'pending_validation',
      hold_until: holdUntil,
      notes: notes || null
    });

    return commission;
  }

  /**
   * Process pending_validation commissions that have passed their hold period
   * Called by daily cron job
   */
  static async processPendingValidations() {
    const now = new Date();
    
    const commissions = await Commission.findAll({
      where: {
        status: 'pending_validation',
        hold_until: { [Op.lte]: now }
      }
    });

    console.log(`[CommissionService] Processing ${commissions.length} pending validations`);

    let processed = 0;
    for (const commission of commissions) {
      try {
        await commission.update({ status: 'pending_approval' });
        processed++;

        await this.logAuditEvent('commission_validated', {
          commission_id: commission.commission_id,
          rep_id: commission.rep_id,
          amount: commission.commission_amount_gbp
        }, 'system');

      } catch (error) {
        console.error(`[CommissionService] Error validating commission ${commission.commission_id}:`, error);
      }
    }

    return { processed, total: commissions.length };
  }

  /**
   * Handle refund - cancel pending commissions, flag approved ones
   */
  static async processRefund(paymentId, refundAmount, reason = 'Stripe refund') {
    const commissions = await Commission.findAll({
      where: { payment_id: paymentId }
    });

    console.log(`[CommissionService] Processing refund for payment ${paymentId}, ${commissions.length} commissions`);

    const results = {
      cancelled: [],
      flagged: []
    };

    for (const commission of commissions) {
      try {
        if (['pending_validation', 'pending_approval', 'pending'].includes(commission.status)) {
          // Cancel pending commissions
          await commission.update({
            status: 'cancelled',
            cancelled_reason: reason,
            cancelled_by: 'system',
            cancelled_at: new Date()
          });
          results.cancelled.push(commission.commission_id);

          await this.logAuditEvent('commission_cancelled', {
            commission_id: commission.commission_id,
            reason: reason,
            refund_amount: refundAmount
          }, 'system');

        } else if (['approved', 'payable', 'paid'].includes(commission.status)) {
          // Create fraud alert for already approved/paid commissions
          await FraudAlert.create({
            alert_id: `fra_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
            alert_type: 'payout_spike',
            severity: commission.status === 'paid' ? 'high' : 'medium',
            related_user_id: commission.rep_id,
            description: `Refund received for payment ${paymentId} but commission was already ${commission.status}. Amount: £${commission.commission_amount_gbp}. Requires manual review.`,
            related_entity_type: 'commission',
            related_entity_ids: [commission.commission_id],
            status: 'open'
          });
          results.flagged.push(commission.commission_id);

          await this.logAuditEvent('commission_refund_alert', {
            commission_id: commission.commission_id,
            status: commission.status,
            refund_amount: refundAmount
          }, 'system');
        }

      } catch (error) {
        console.error(`[CommissionService] Error processing refund for commission ${commission.commission_id}:`, error);
      }
    }

    return results;
  }

  /**
   * Log audit event
   */
  static async logAuditEvent(actionType, details, userId = 'system') {
    try {
      await AuditLog.create({
        log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: userId === 'system' ? null : userId,
        action_type: actionType,
        object_type: 'commission',
        object_id: details.commission_id || details.payment_id || null,
        description: JSON.stringify(details),
        actor_role: userId === 'system' ? 'system' : null
      });
    } catch (error) {
      console.error('[CommissionService] Audit log error:', error);
    }
  }

  /**
   * Get commission statistics
   */
  static async getStats() {
    const [total, pendingValidation, pendingApproval, approved, payable, paid, cancelled] = await Promise.all([
      Commission.count(),
      Commission.count({ where: { status: 'pending_validation' } }),
      Commission.count({ where: { status: 'pending_approval' } }),
      Commission.count({ where: { status: 'approved' } }),
      Commission.count({ where: { status: 'payable' } }),
      Commission.count({ where: { status: 'paid' } }),
      Commission.count({ where: { status: 'cancelled' } })
    ]);

    const totalAmount = await Commission.sum('commission_amount_gbp') || 0;
    const paidAmount = await Commission.sum('commission_amount_gbp', { where: { status: 'paid' } }) || 0;

    return {
      total,
      pending_validation: pendingValidation,
      pending_approval: pendingApproval,
      approved,
      payable,
      paid,
      cancelled,
      total_amount: parseFloat(totalAmount).toFixed(2),
      paid_amount: parseFloat(paidAmount).toFixed(2)
    };
  }
}

module.exports = CommissionService;
