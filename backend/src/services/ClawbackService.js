const { Commission, ClawbackRule, StudentPayment } = require('../models/pg');
const { Op } = require('sequelize');

/**
 * Process clawback for all eligible commissions of a student.
 * Finds active clawback rules, matches based on days since payment,
 * and marks commissions accordingly.
 */
exports.processClawback = async (studentId, reason) => {
  // 1. Find most recent paid payment for this student
  const lastPayment = await StudentPayment.findOne({
    where: { student_id: studentId, status: 'paid' },
    order: [['created_at', 'DESC']]
  });

  const paymentDate = lastPayment?.created_at || null;
  const daysSincePayment = paymentDate
    ? Math.floor((Date.now() - new Date(paymentDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // 2. Find all active clawback rules, shortest window first
  const activeRules = await ClawbackRule.findAll({
    where: { is_active: true },
    order: [['clawback_window_days', 'ASC']]
  });

  // 3. Match to the most applicable rule (within window days)
  //    If no payment date found, default to first active rule (100% clawback)
  const matchedRule = activeRules.find(rule =>
    daysSincePayment === null || daysSincePayment <= rule.clawback_window_days
  ) || activeRules[0] || null;

  // 4. Find all commissions eligible for clawback
  const commissions = await Commission.findAll({
    where: {
      student_id: studentId,
      status: { [Op.in]: ['approved', 'payable', 'paid'] },
      clawback_status: 'none'
    }
  });

  if (commissions.length === 0) {
    return {
      clawed_back: 0,
      total_clawback_amount: '0.00',
      rule_applied: null,
      days_since_payment: daysSincePayment,
      commissions: []
    };
  }

  // 5. Calculate and apply clawback
  const clawbackPercentage = matchedRule
    ? parseFloat(matchedRule.clawback_percentage) / 100
    : 1.0; // default 100% if no rule configured

  const clawbackDate = new Date();
  const results = [];

  for (const commission of commissions) {
    const originalAmount = parseFloat(commission.commission_amount_gbp);
    const clawback_amount = originalAmount * clawbackPercentage;
    const clawback_status = clawbackPercentage >= 1 ? 'clawed_back' : 'partially_clawed_back';

    await commission.update({
      clawback_status,
      clawback_amount: clawback_amount.toFixed(2),
      clawback_date: clawbackDate,
      clawback_rule_id: matchedRule?.id || null,
      clawback_reason: reason || 'Clawback triggered'
    });

    results.push({
      commission_id: commission.commission_id,
      rep_id: commission.rep_id,
      original_amount: originalAmount.toFixed(2),
      clawback_amount: clawback_amount.toFixed(2),
      clawback_status
    });
  }

  const total_clawback_amount = results.reduce(
    (sum, r) => sum + parseFloat(r.clawback_amount), 0
  );

  return {
    clawed_back: results.length,
    total_clawback_amount: total_clawback_amount.toFixed(2),
    rule_applied: matchedRule
      ? { id: matchedRule.id, name: matchedRule.name, percentage: matchedRule.clawback_percentage }
      : null,
    days_since_payment: daysSincePayment,
    commissions: results
  };
};
