/**
 * Reports Routes
 * Super Admin only - analytics and reporting
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { Student, Commission, Payout, Lead, Referral, User, StudentPayment } = require('../models/pg');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/postgres');

// All routes require auth + super_admin role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Super Admin access required' });
  }
  next();
});

/**
 * GET /api/reports/enrollments - Enrollment report
 */
router.get('/enrollments', async (req, res) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    // Get enrolled students in date range
    const students = await Student.findAll({
      where: {
        status: 'enrolled',
        created_at: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: User, as: 'rep', attributes: ['user_id', 'name'] }
      ]
    });

    // Group by period
    const grouped = {};
    students.forEach(s => {
      let key;
      const date = new Date(s.created_at);
      if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) grouped[key] = { date: key, count: 0, revenue: 0 };
      grouped[key].count++;
      grouped[key].revenue += 7999; // Fixed course price
    });

    // Rep breakdown
    const repStats = {};
    students.forEach(s => {
      const repId = s.rep?.user_id || 'unassigned';
      const repName = s.rep?.name || 'Unassigned';
      if (!repStats[repId]) {
        repStats[repId] = { rep_id: repId, rep_name: repName, enrollments: 0, revenue: 0 };
      }
      repStats[repId].enrollments++;
      repStats[repId].revenue += 7999;
    });

    // Summary
    const total = students.length;
    const prevPeriodStart = new Date(startDate);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const prevCount = await Student.count({
      where: {
        status: 'enrolled',
        created_at: { [Op.between]: [prevPeriodStart, startDate] }
      }
    });

    const changePercent = prevCount > 0 ? ((total - prevCount) / prevCount * 100).toFixed(1) : 0;

    res.json({
      summary: {
        total_enrolled: total,
        this_period: total,
        vs_last_period_percent: parseFloat(changePercent)
      },
      chart_data: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      table_data: Object.values(repStats).sort((a, b) => b.enrollments - a.enrollments)
    });
  } catch (error) {
    console.error('Enrollments report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/commissions - Commission report
 */
router.get('/commissions', async (req, res) => {
  try {
    const { from, to, status } = req.query;
    
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const where = {
      created_at: { [Op.between]: [startDate, endDate] }
    };
    if (status && status !== 'all') where.status = status;

    const commissions = await Commission.findAll({
      where,
      include: [{ model: User, as: 'rep', attributes: ['user_id', 'name', 'role'] }]
    });

    // Group by status for chart
    const byStatus = { pending: 0, approved: 0, paid: 0, cancelled: 0 };
    commissions.forEach(c => {
      if (byStatus[c.status] !== undefined) {
        byStatus[c.status] += parseFloat(c.amount) || 0;
      }
    });

    // Summary stats
    const totalGenerated = commissions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalApproved = commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    // Rep breakdown
    const repStats = {};
    commissions.forEach(c => {
      const repId = c.rep?.user_id || c.rep_id;
      const repName = c.rep?.name || 'Unknown';
      const role = c.earner_role || c.rep?.role || 'rep';
      if (!repStats[repId]) {
        repStats[repId] = { rep_id: repId, rep_name: repName, role, amount: 0, status: c.status };
      }
      repStats[repId].amount += parseFloat(c.amount) || 0;
    });

    res.json({
      summary: {
        total_generated: totalGenerated,
        total_approved: totalApproved,
        total_paid: totalPaid,
        avg_per_rep: commissions.length > 0 ? (totalGenerated / Object.keys(repStats).length).toFixed(2) : 0
      },
      chart_data: Object.entries(byStatus).map(([status, amount]) => ({ status, amount })),
      table_data: Object.values(repStats).sort((a, b) => b.amount - a.amount)
    });
  } catch (error) {
    console.error('Commissions report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/payouts - Payout report
 */
router.get('/payouts', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const startDate = from ? new Date(from) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const payouts = await Payout.findAll({
      where: {
        created_at: { [Op.between]: [startDate, endDate] }
      },
      include: [{ model: User, as: 'user', attributes: ['user_id', 'name', 'role'] }]
    });

    // Group by month for chart
    const byMonth = {};
    payouts.filter(p => p.status === 'paid').forEach(p => {
      const date = new Date(p.paid_at || p.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { month: key, amount: 0 };
      byMonth[key].amount += parseFloat(p.total_amount) || 0;
    });

    // Summary
    const totalPaid = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
    const pendingAmount = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
    const avgPayoutSize = payouts.length > 0 ? (totalPaid / payouts.filter(p => p.status === 'paid').length).toFixed(2) : 0;

    res.json({
      summary: {
        total_paid_out: totalPaid,
        pending_amount: pendingAmount,
        avg_payout_size: parseFloat(avgPayoutSize)
      },
      chart_data: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
      table_data: payouts.map(p => ({
        recipient: p.user?.name || 'Unknown',
        role: p.user?.role || 'rep',
        amount: parseFloat(p.total_amount) || 0,
        status: p.status,
        date: p.created_at
      }))
    });
  } catch (error) {
    console.error('Payouts report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/lead-funnel - Lead funnel report
 */
router.get('/lead-funnel', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const where = {};
    if (from) where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    if (to) where.created_at = { ...where.created_at, [Op.lte]: new Date(to) };

    // Count by status
    const stages = ['new', 'contacted', 'interested', 'application_started', 'enrolled', 'paid_in_full'];
    const counts = {};
    
    for (const stage of stages) {
      counts[stage] = await Lead.count({ where: { ...where, status: stage } });
    }

    const totalLeads = Object.values(counts).reduce((a, b) => a + b, 0);
    const convertedCount = counts.enrolled + counts.paid_in_full;
    const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : 0;

    // Calculate drop-off
    const funnelData = stages.map((stage, i) => {
      const count = counts[stage];
      const percentOfTotal = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : 0;
      let dropOff = 0;
      if (i > 0) {
        const prevTotal = stages.slice(i).reduce((sum, s) => sum + counts[s], 0);
        const currentTotal = stages.slice(i + 1).reduce((sum, s) => sum + counts[s], 0) + count;
        dropOff = prevTotal > 0 ? (((prevTotal - currentTotal) / prevTotal) * 100).toFixed(1) : 0;
      }
      return { stage, count, percent_of_total: parseFloat(percentOfTotal), drop_off_percent: parseFloat(dropOff) };
    });

    res.json({
      summary: {
        total_leads: totalLeads,
        conversion_rate: parseFloat(conversionRate),
        avg_days_to_enroll: 14 // Placeholder
      },
      chart_data: funnelData,
      table_data: funnelData
    });
  } catch (error) {
    console.error('Lead funnel report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/referrals - Referral report
 */
router.get('/referrals', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const where = {};
    if (from) where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    if (to) where.created_at = { ...where.created_at, [Op.lte]: new Date(to) };

    const referrals = await Referral.findAll({
      where,
      include: [{ model: User, as: 'referrer', attributes: ['user_id', 'name', 'role'] }]
    });

    // Summary
    const totalReferrals = referrals.length;
    // Use 'paid' or 'commission_created' as converted status
    const converted = referrals.filter(r => ['paid', 'commission_created', 'commission_paid'].includes(r.status)).length;
    const bonusPaid = referrals.filter(r => r.status === 'commission_paid').reduce((sum, r) => sum + (parseFloat(r.commission_amount) || 50), 0);

    // Group by referrer
    const referrerStats = {};
    referrals.forEach(r => {
      const refId = r.referrer?.user_id || r.referrer_user_id;
      const refName = r.referrer?.name || 'Unknown';
      const role = r.referrer?.role || 'delegate';
      if (!referrerStats[refId]) {
        referrerStats[refId] = { referrer_id: refId, referrer_name: refName, role, referrals: 0, converted: 0, bonus: 0 };
      }
      referrerStats[refId].referrals++;
      if (['paid', 'commission_created', 'commission_paid'].includes(r.status)) referrerStats[refId].converted++;
      if (r.status === 'commission_paid') referrerStats[refId].bonus += parseFloat(r.commission_amount) || 50;
    });

    // Referred vs organic - count students with referral records
    const referredCount = referrals.filter(r => ['paid', 'commission_created', 'commission_paid'].includes(r.status)).length;
    
    // Estimate organic as total students minus referred
    const totalStudents = await Student.count({ where });
    const organicCount = Math.max(0, totalStudents - referredCount);

    res.json({
      summary: {
        total_referrals: totalReferrals,
        converted: converted,
        bonus_paid_out: bonusPaid
      },
      chart_data: [
        { type: 'Referred', count: converted },
        { type: 'Organic', count: organicCount }
      ],
      table_data: Object.values(referrerStats).sort((a, b) => b.referrals - a.referrals)
    });
  } catch (error) {
    console.error('Referrals report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

// Export endpoints
router.get('/enrollments/export', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=enrollments_report.csv');
  res.send('Rep Name,Enrollments,Revenue\nSample Rep,10,79990');
});

router.get('/commissions/export', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=commissions_report.csv');
  res.send('Rep/Manager,Role,Amount,Status,Period\nSample Rep,rep,319.96,paid,March 2026');
});

router.get('/payouts/export', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=payouts_report.csv');
  res.send('Recipient,Role,Amount,Status,Date\nSample Rep,rep,639.92,paid,2026-03-10');
});

module.exports = router;
