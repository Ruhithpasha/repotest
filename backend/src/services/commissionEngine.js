/**
 * Commission Engine Service
 * 
 * Calculates commissions based on configurable rules
 * Handles commission lifecycle: creation, validation, approval, payout
 */

const { v4: uuidv4 } = require('uuid');
const { 
  CommissionRuleRepository, 
  CommissionRepository,
  StudentRepository,
  UserRepository,
  StudentPaymentRepository,
  ProgramRepository
} = require('../repositories');
const AuditLogger = require('./auditLogger');

/**
 * Calculate commission amount based on rules
 */
async function calculateCommission(programId, saleAmount, roleType) {
  // Find applicable rule
  const rule = await CommissionRuleRepository.findApplicableRule(programId, roleType);
  
  if (!rule) {
    // Fallback to default rates
    const defaultRates = {
      sales_user: 0.10,  // 10%
      manager: 0.02,     // 2% override
      rep: 0.04,         // 4%
      referrer: 0.05     // 5%
    };
    const rate = defaultRates[roleType] || 0.04;
    return {
      amount: saleAmount * rate,
      rule_id: null,
      commission_type: 'percentage',
      commission_value: rate,
      hold_days: 14
    };
  }

  let amount;
  if (rule.commission_type === 'percentage') {
    amount = saleAmount * parseFloat(rule.commission_value);
  } else {
    amount = parseFloat(rule.commission_value);
  }

  return {
    amount: Math.round(amount * 100) / 100,
    rule_id: rule.rule_id,
    commission_type: rule.commission_type,
    commission_value: parseFloat(rule.commission_value),
    hold_days: rule.hold_days || 14
  };
}

/**
 * Create commission record for a sale
 */
async function createCommissionForSale(req, {
  studentId,
  paymentId,
  programId,
  saleAmount,
  repId,
  salesUserId = null,
  managerId = null
}) {
  const commissions = [];

  // 1. Rep Commission (if rep exists)
  if (repId) {
    const repCalc = await calculateCommission(programId, saleAmount, 'rep');
    const repCommission = await CommissionRepository.createCommission({
      commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      rep_id: repId,
      student_id: studentId,
      payment_id: paymentId,
      program_id: programId,
      sale_amount_gbp: saleAmount,
      commission_type: repCalc.commission_type,
      commission_value: repCalc.commission_value,
      commission_amount_gbp: repCalc.amount,
      rule_id: repCalc.rule_id,
      role_type: 'rep',
      status: 'pending_validation',
      hold_until: new Date(Date.now() + repCalc.hold_days * 24 * 60 * 60 * 1000)
    });
    commissions.push(repCommission);
    
    if (req) {
      await AuditLogger.commissionCreated(req, repCommission);
    }
  }

  // 2. Sales User Commission (if sales user exists)
  if (salesUserId) {
    const salesCalc = await calculateCommission(programId, saleAmount, 'sales_user');
    const salesCommission = await CommissionRepository.createCommission({
      commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      rep_id: salesUserId,
      student_id: studentId,
      payment_id: paymentId,
      program_id: programId,
      sale_amount_gbp: saleAmount,
      commission_type: salesCalc.commission_type,
      commission_value: salesCalc.commission_value,
      commission_amount_gbp: salesCalc.amount,
      rule_id: salesCalc.rule_id,
      role_type: 'sales_user',
      status: 'pending_validation',
      hold_until: new Date(Date.now() + salesCalc.hold_days * 24 * 60 * 60 * 1000)
    });
    commissions.push(salesCommission);
  }

  // 3. Manager Override Commission (if manager exists)
  if (managerId) {
    const managerCalc = await calculateCommission(programId, saleAmount, 'manager');
    const managerCommission = await CommissionRepository.createCommission({
      commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      rep_id: managerId,
      student_id: studentId,
      payment_id: paymentId,
      program_id: programId,
      sale_amount_gbp: saleAmount,
      commission_type: managerCalc.commission_type,
      commission_value: managerCalc.commission_value,
      commission_amount_gbp: managerCalc.amount,
      rule_id: managerCalc.rule_id,
      role_type: 'manager',
      status: 'pending_validation',
      hold_until: new Date(Date.now() + managerCalc.hold_days * 24 * 60 * 60 * 1000)
    });
    commissions.push(managerCommission);
  }

  return commissions;
}

/**
 * Create referral commission
 */
async function createReferralCommission(req, {
  referrerId,
  studentId,
  paymentId,
  programId,
  saleAmount
}) {
  const calc = await calculateCommission(programId, saleAmount, 'referrer');
  
  const commission = await CommissionRepository.createCommission({
    commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    rep_id: referrerId,
    student_id: studentId,
    payment_id: paymentId,
    program_id: programId,
    sale_amount_gbp: saleAmount,
    commission_type: calc.commission_type,
    commission_value: calc.commission_value,
    commission_amount_gbp: calc.amount,
    rule_id: calc.rule_id,
    role_type: 'referrer',
    status: 'pending_validation',
    hold_until: new Date(Date.now() + calc.hold_days * 24 * 60 * 60 * 1000)
  });

  if (req) {
    await AuditLogger.commissionCreated(req, commission);
  }

  return commission;
}

/**
 * Validate commission (move from pending_validation to pending_approval)
 */
async function validateCommission(commissionId) {
  const commission = await CommissionRepository.findByCommissionId(commissionId);
  if (!commission) return null;
  
  // Check if payment is still valid (not refunded)
  if (commission.payment_id) {
    const payment = await StudentPaymentRepository.findByPaymentId(commission.payment_id);
    if (payment && payment.status === 'refunded') {
      return CommissionRepository.updateStatus(commissionId, 'cancelled', {
        cancelled_reason: 'Payment was refunded'
      });
    }
  }

  return CommissionRepository.updateStatus(commissionId, 'pending_approval');
}

/**
 * Approve commission (move from pending_approval to approved)
 */
async function approveCommission(req, commissionId) {
  const commission = await CommissionRepository.findByCommissionId(commissionId);
  if (!commission) return null;

  const updatedCommission = await CommissionRepository.updateStatus(commissionId, 'approved', {
    approved_by: req.user?.user_id,
    approved_at: new Date()
  });

  await AuditLogger.commissionApproved(req, commissionId, commission.commission_amount_gbp);
  
  return updatedCommission;
}

/**
 * Check and update commissions that have passed hold period
 */
async function processHoldPeriodCommissions() {
  const commissions = await CommissionRepository.findPastHoldPeriod();
  const processed = [];

  for (const commission of commissions) {
    if (commission.status === 'pending_validation') {
      await validateCommission(commission.commission_id);
      processed.push(commission.commission_id);
    } else if (commission.status === 'approved') {
      // Move to payable
      await CommissionRepository.updateStatus(commission.commission_id, 'payable');
      processed.push(commission.commission_id);
    }
  }

  return processed;
}

/**
 * Reverse/cancel a commission
 */
async function reverseCommission(req, commissionId, reason) {
  const commission = await CommissionRepository.findByCommissionId(commissionId);
  if (!commission) return null;

  // Only pending or approved commissions can be reversed
  if (!['pending_validation', 'pending_approval', 'approved', 'payable'].includes(commission.status)) {
    throw new Error('Commission cannot be reversed in current status');
  }

  const updatedCommission = await CommissionRepository.updateStatus(commissionId, 'cancelled', {
    cancelled_reason: reason,
    cancelled_by: req.user?.user_id,
    cancelled_at: new Date()
  });

  await AuditLogger.commissionReversed(req, commissionId, reason);
  
  return updatedCommission;
}

/**
 * Get commission summary for a user
 */
async function getUserCommissionSummary(userId) {
  const commissions = await CommissionRepository.findByRepId(userId);
  
  const summary = {
    total_earned: 0,
    pending: 0,
    approved: 0,
    payable: 0,
    paid: 0,
    cancelled: 0,
    count_by_status: {}
  };

  for (const comm of commissions) {
    const amount = parseFloat(comm.commission_amount_gbp) || 0;
    
    summary.count_by_status[comm.status] = (summary.count_by_status[comm.status] || 0) + 1;
    
    switch (comm.status) {
      case 'pending_validation':
      case 'pending_approval':
        summary.pending += amount;
        break;
      case 'approved':
        summary.approved += amount;
        break;
      case 'payable':
        summary.payable += amount;
        break;
      case 'paid':
        summary.paid += amount;
        summary.total_earned += amount;
        break;
      case 'cancelled':
        summary.cancelled += amount;
        break;
    }
  }

  return summary;
}

const CommissionEngine = {
  calculateCommission,
  createCommissionForSale,
  createReferralCommission,
  validateCommission,
  approveCommission,
  processHoldPeriodCommissions,
  reverseCommission,
  getUserCommissionSummary
};

module.exports = CommissionEngine;
