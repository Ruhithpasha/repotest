/**
 * Manager Portal Routes
 * All routes prefixed with /api/manager
 * Manager role only - scoped to manager's team
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { User, Lead, Student, Commission, Payout, AuditLog, CommissionRule } = require('../models/pg');
const { Op, fn, col, literal } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// All routes require auth
router.use(authMiddleware);

// Manager scope guard middleware
const managerScopeGuard = async (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ detail: 'Manager access required' });
  }
  next();
};

router.use(managerScopeGuard);

/**
 * Helper: Get manager's rep IDs
 */
const getManagerRepIds = async (managerId) => {
  const reps = await User.findAll({
    where: { 
      manager_id: managerId,
      role: { [Op.in]: ['rep', 'sales_user'] },
      is_active: true
    },
    attributes: ['user_id']
  });
  return reps.map(r => r.user_id);
};

/**
 * GET /api/manager/stats - Manager dashboard stats
 */
router.get('/stats', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const repIds = await getManagerRepIds(managerId);

    // Total team leads
    const totalTeamLeads = await Lead.count({
      where: { assigned_to: { [Op.in]: repIds } }
    });

    // Enrolled this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const enrolledThisMonth = await Student.count({
      where: {
        rep_id: { [Op.in]: repIds },
        status: 'enrolled',
        created_at: { [Op.gte]: startOfMonth }
      }
    });

    // My commission earned (manager's own commissions)
    const myCommissionEarned = await Commission.sum('commission_amount_gbp', {
      where: {
        rep_id: managerId,
        status: { [Op.in]: ['approved', 'payable', 'paid'] }
      }
    }) || 0;

    // Active reps count
    const activeRepsCount = repIds.length;

    res.json({
      totalTeamLeads,
      enrolledThisMonth,
      myCommissionEarned: parseFloat(myCommissionEarned).toFixed(2),
      activeRepsCount
    });
  } catch (error) {
    console.error('Manager stats error:', error);
    res.status(500).json({ detail: 'Failed to get stats' });
  }
});

/**
 * GET /api/manager/top-reps - Top 5 reps by enrollment
 */
router.get('/top-reps', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const repIds = await getManagerRepIds(managerId);

    if (repIds.length === 0) {
      return res.json([]);
    }

    // Get reps with their enrollment counts
    const reps = await User.findAll({
      where: { user_id: { [Op.in]: repIds } },
      attributes: ['user_id', 'name', 'email']
    });

    const enriched = await Promise.all(reps.map(async (rep) => {
      const enrollments = await Student.count({
        where: { rep_id: rep.user_id, status: 'enrolled' }
      });
      
      const commissionEarned = await Commission.sum('commission_amount_gbp', {
        where: {
          rep_id: rep.user_id,
          status: { [Op.in]: ['approved', 'payable', 'paid'] }
        }
      }) || 0;

      return {
        repId: rep.user_id,
        name: rep.name,
        email: rep.email,
        enrollments,
        commissionEarned: parseFloat(commissionEarned).toFixed(2)
      };
    }));

    // Sort by enrollments and return top 5
    enriched.sort((a, b) => b.enrollments - a.enrollments);
    res.json(enriched.slice(0, 5));
  } catch (error) {
    console.error('Top reps error:', error);
    res.status(500).json({ detail: 'Failed to get top reps' });
  }
});

/**
 * GET /api/manager/commission-summary - Manager's commission breakdown
 */
router.get('/commission-summary', async (req, res) => {
  try {
    const managerId = req.user.user_id;

    const [pendingValidation, pendingApproval, approved, payable, paid] = await Promise.all([
      Commission.sum('commission_amount_gbp', { 
        where: { rep_id: managerId, status: 'pending_validation' } 
      }),
      Commission.sum('commission_amount_gbp', { 
        where: { rep_id: managerId, status: 'pending_approval' } 
      }),
      Commission.sum('commission_amount_gbp', { 
        where: { rep_id: managerId, status: 'approved' } 
      }),
      Commission.sum('commission_amount_gbp', { 
        where: { rep_id: managerId, status: 'payable' } 
      }),
      Commission.sum('commission_amount_gbp', { 
        where: { rep_id: managerId, status: 'paid' } 
      })
    ]);

    res.json({
      pendingValidation: parseFloat(pendingValidation || 0).toFixed(2),
      pendingApproval: parseFloat(pendingApproval || 0).toFixed(2),
      approved: parseFloat(approved || 0).toFixed(2),
      payable: parseFloat(payable || 0).toFixed(2),
      paid: parseFloat(paid || 0).toFixed(2)
    });
  } catch (error) {
    console.error('Commission summary error:', error);
    res.status(500).json({ detail: 'Failed to get commission summary' });
  }
});

/**
 * GET /api/manager/team-performance - Full team performance data
 */
router.get('/team-performance', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const repIds = await getManagerRepIds(managerId);

    if (repIds.length === 0) {
      return res.json([]);
    }

    // Get current and previous month dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const reps = await User.findAll({
      where: { user_id: { [Op.in]: repIds } },
      attributes: ['user_id', 'name', 'email']
    });

    const performanceData = await Promise.all(reps.map(async (rep) => {
      const leads = await Lead.count({
        where: { assigned_to: rep.user_id }
      });

      const enrolled = await Student.count({
        where: { rep_id: rep.user_id, status: 'enrolled' }
      });

      // This month enrollments
      const enrolledThisMonth = await Student.count({
        where: { 
          rep_id: rep.user_id, 
          status: 'enrolled',
          created_at: { [Op.gte]: startOfMonth }
        }
      });

      // Last month enrollments
      const enrolledLastMonth = await Student.count({
        where: { 
          rep_id: rep.user_id, 
          status: 'enrolled',
          created_at: { [Op.between]: [startOfLastMonth, endOfLastMonth] }
        }
      });

      const conversionRate = leads > 0 ? ((enrolled / leads) * 100).toFixed(1) : '0.0';

      const commissionEarned = await Commission.sum('commission_amount_gbp', {
        where: {
          rep_id: rep.user_id,
          status: { [Op.in]: ['approved', 'payable', 'paid'] }
        }
      }) || 0;

      // Calculate trend
      let trend = 0;
      if (enrolledLastMonth > 0) {
        trend = ((enrolledThisMonth - enrolledLastMonth) / enrolledLastMonth * 100).toFixed(1);
      } else if (enrolledThisMonth > 0) {
        trend = 100;
      }

      return {
        repId: rep.user_id,
        name: rep.name,
        email: rep.email,
        leads,
        enrolled,
        conversionRate: parseFloat(conversionRate),
        commissionEarned: parseFloat(commissionEarned).toFixed(2),
        trend: parseFloat(trend)
      };
    }));

    // Sort by enrollment count descending
    performanceData.sort((a, b) => b.enrolled - a.enrolled);
    res.json(performanceData);
  } catch (error) {
    console.error('Team performance error:', error);
    res.status(500).json({ detail: 'Failed to get team performance' });
  }
});

/**
 * GET /api/manager/reps - Get manager's reps for dropdowns
 */
router.get('/reps', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const reps = await User.findAll({
      where: { 
        manager_id: managerId,
        role: { [Op.in]: ['rep', 'sales_user'] },
        is_active: true
      },
      attributes: ['user_id', 'name', 'email']
    });
    res.json(reps);
  } catch (error) {
    console.error('Get reps error:', error);
    res.status(500).json({ detail: 'Failed to get reps' });
  }
});

/**
 * GET /api/manager/rep/:repId/leads - Get last 5 leads for a rep
 */
router.get('/rep/:repId/leads', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { repId } = req.params;

    // Verify rep belongs to this manager
    const rep = await User.findOne({
      where: { user_id: repId, manager_id: managerId }
    });

    if (!rep) {
      return res.status(403).json({ detail: 'Rep not in your team' });
    }

    const leads = await Lead.findAll({
      where: { assigned_to: repId },
      attributes: ['lead_id', 'name', 'status', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.json(leads);
  } catch (error) {
    console.error('Get rep leads error:', error);
    res.status(500).json({ detail: 'Failed to get rep leads' });
  }
});

/**
 * PATCH /api/manager/reassign-leads - Bulk reassign leads between reps
 */
router.patch('/reassign-leads', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { fromRepId, toRepId } = req.body;

    if (!fromRepId || !toRepId) {
      return res.status(400).json({ detail: 'fromRepId and toRepId are required' });
    }

    const repIds = await getManagerRepIds(managerId);

    // Verify both reps belong to this manager
    if (!repIds.includes(fromRepId) || !repIds.includes(toRepId)) {
      return res.status(403).json({ detail: 'Both reps must be in your team' });
    }

    // Reassign open leads (not enrolled or paid)
    const [updatedCount] = await Lead.update(
      { assigned_to: toRepId },
      { 
        where: { 
          assigned_to: fromRepId,
          status: { [Op.notIn]: ['enrolled', 'paid_in_full'] }
        }
      }
    );

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: managerId,
      action_type: 'leads_reassigned',
      object_type: 'lead',
      object_id: null,
      description: JSON.stringify({ fromRepId, toRepId, count: updatedCount }),
      actor_role: 'manager'
    });

    res.json({ message: `${updatedCount} leads reassigned`, count: updatedCount });
  } catch (error) {
    console.error('Reassign leads error:', error);
    res.status(500).json({ detail: 'Failed to reassign leads' });
  }
});

/**
 * GET /api/manager/pipeline - Get team leads for pipeline/kanban
 */
router.get('/pipeline', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { repId, search } = req.query;

    let repIds = await getManagerRepIds(managerId);

    // Filter by specific rep if provided
    if (repId && repId !== 'all') {
      if (!repIds.includes(repId)) {
        return res.status(403).json({ detail: 'Rep not in your team' });
      }
      repIds = [repId];
    }

    const whereClause = {
      [Op.or]: [
        { assigned_to: { [Op.in]: repIds } },
        { assigned_to: null } // Unassigned leads visible to manager
      ]
    };

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const leads = await Lead.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'assigned_user', attributes: ['user_id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(leads);
  } catch (error) {
    console.error('Manager pipeline error:', error);
    res.status(500).json({ detail: 'Failed to get pipeline' });
  }
});

/**
 * GET /api/manager/commissions - Manager's own commissions
 */
router.get('/commissions', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { status, from, to } = req.query;

    const where = { rep_id: managerId };
    
    if (status && status !== 'all') {
      where.status = status;
    }

    if (from) {
      where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    }
    if (to) {
      where.created_at = { ...where.created_at, [Op.lte]: new Date(to) };
    }

    const commissions = await Commission.findAll({
      where,
      include: [
        { model: Student, as: 'student', attributes: ['student_id', 'user_id'], 
          include: [{ model: User, as: 'user', attributes: ['name', 'email'] }] 
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Also get enrolled_by (rep) info and rule bounds for each commission
    const enriched = await Promise.all(commissions.map(async (c) => {
      const student = await Student.findByPk(c.student_id, {
        include: [{ model: User, as: 'rep', attributes: ['name'] }]
      });
      
      // Get rule bounds for override functionality
      let ruleBounds = { rule_min: null, rule_max: null };
      if (c.rule_id) {
        const rule = await CommissionRule.findByPk(c.rule_id, {
          attributes: ['manager_override_min', 'manager_override_max']
        });
        if (rule) {
          ruleBounds.rule_min = rule.manager_override_min;
          ruleBounds.rule_max = rule.manager_override_max;
        }
      }
      
      return {
        ...c.toJSON(),
        enrolledByRepName: student?.rep?.name || 'Unknown',
        ...ruleBounds
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Manager commissions error:', error);
    res.status(500).json({ detail: 'Failed to get commissions' });
  }
});

/**
 * GET /api/manager/payable-commissions - Get payable commission IDs for payout request
 */
router.get('/payable-commissions', async (req, res) => {
  try {
    const managerId = req.user.user_id;

    const commissions = await Commission.findAll({
      where: {
        rep_id: managerId,
        status: 'payable'
      },
      include: [
        { model: Student, as: 'student',
          include: [{ model: User, as: 'user', attributes: ['name'] }]
        }
      ],
      attributes: ['commission_id', 'commission_amount_gbp', 'student_id']
    });

    res.json(commissions.map(c => ({
      commission_id: c.commission_id,
      amount: c.commission_amount_gbp,
      studentName: c.student?.user?.name || 'Unknown'
    })));
  } catch (error) {
    console.error('Payable commissions error:', error);
    res.status(500).json({ detail: 'Failed to get payable commissions' });
  }
});

// ==========================================
// REPORTS ENDPOINTS
// ==========================================

/**
 * GET /api/manager/reports/lead-funnel - Lead funnel analysis
 */
router.get('/reports/lead-funnel', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { from, to } = req.query;
    const repIds = await getManagerRepIds(managerId);

    const where = { assigned_to: { [Op.in]: repIds } };
    if (from) where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    if (to) where.created_at = { ...where.created_at, [Op.lte]: new Date(to) };

    const stages = ['new', 'contacted', 'interested', 'application_started', 'enrolled', 'paid_in_full'];
    const counts = {};
    
    for (const stage of stages) {
      counts[stage] = await Lead.count({ where: { ...where, status: stage } });
    }

    const totalLeads = Object.values(counts).reduce((a, b) => a + b, 0);
    const convertedCount = counts.enrolled + counts.paid_in_full;
    const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : 0;

    // Calculate funnel data with drop-off
    const funnelData = stages.map((stage, i) => {
      const count = counts[stage];
      const percentOfTotal = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : 0;
      let dropOff = 0;
      if (i > 0) {
        const prevCount = counts[stages[i - 1]];
        dropOff = prevCount > 0 ? (((prevCount - count) / prevCount) * 100).toFixed(1) : 0;
      }
      return { stage, count, percentOfTotal: parseFloat(percentOfTotal), dropOff: parseFloat(dropOff) };
    });

    res.json({
      summary: {
        totalLeads,
        convertedToEnrolled: convertedCount,
        conversionRate: parseFloat(conversionRate)
      },
      chartData: funnelData,
      tableData: funnelData
    });
  } catch (error) {
    console.error('Lead funnel report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

/**
 * GET /api/manager/reports/enrollments - Enrollments report
 */
router.get('/reports/enrollments', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { from, to, groupBy = 'week' } = req.query;
    const repIds = await getManagerRepIds(managerId);

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    // Get enrolled students
    const students = await Student.findAll({
      where: {
        rep_id: { [Op.in]: repIds },
        status: 'enrolled',
        created_at: { [Op.between]: [startDate, endDate] }
      },
      include: [{ model: User, as: 'rep', attributes: ['user_id', 'name'] }]
    });

    // Group by period for chart
    const grouped = {};
    students.forEach(s => {
      const date = new Date(s.created_at);
      let key;
      if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      }
      if (!grouped[key]) grouped[key] = { date: key, count: 0 };
      grouped[key].count++;
    });

    // Rep breakdown
    const repStats = {};
    students.forEach(s => {
      const repId = s.rep?.user_id || 'unassigned';
      const repName = s.rep?.name || 'Unassigned';
      if (!repStats[repId]) {
        repStats[repId] = { repName, enrollments: 0, revenueGenerated: 0 };
      }
      repStats[repId].enrollments++;
      repStats[repId].revenueGenerated += 7999;
    });

    // Find best performing rep
    const bestRep = Object.entries(repStats).sort((a, b) => b[1].enrollments - a[1].enrollments)[0];

    res.json({
      summary: {
        totalEnrolled: students.length,
        thisPeriod: students.length,
        bestPerformingRep: bestRep ? bestRep[1].repName : 'N/A'
      },
      chartData: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      tableData: Object.entries(repStats).map(([_, data]) => data).sort((a, b) => b.enrollments - a.enrollments)
    });
  } catch (error) {
    console.error('Enrollments report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

/**
 * GET /api/manager/reports/commissions - Team commissions report
 */
router.get('/reports/commissions', async (req, res) => {
  try {
    const managerId = req.user.user_id;
    const { from, to } = req.query;
    const repIds = await getManagerRepIds(managerId);

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    // Get all commissions for the team reps
    const commissions = await Commission.findAll({
      where: {
        rep_id: { [Op.in]: repIds },
        created_at: { [Op.between]: [startDate, endDate] }
      },
      include: [{ model: User, as: 'rep', attributes: ['user_id', 'name'] }]
    });

    // Summary
    const totalGenerated = commissions.reduce((sum, c) => sum + (parseFloat(c.commission_amount_gbp) || 0), 0);
    const totalApproved = commissions.filter(c => ['approved', 'payable'].includes(c.status))
      .reduce((sum, c) => sum + (parseFloat(c.commission_amount_gbp) || 0), 0);
    const totalPaid = commissions.filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (parseFloat(c.commission_amount_gbp) || 0), 0);

    // Rep breakdown
    const repStats = {};
    commissions.forEach(c => {
      const repId = c.rep?.user_id || c.rep_id;
      const repName = c.rep?.name || 'Unknown';
      if (!repStats[repId]) {
        repStats[repId] = { repName, totalEarned: 0, pending: 0, approved: 0, paid: 0 };
      }
      const amount = parseFloat(c.commission_amount_gbp) || 0;
      repStats[repId].totalEarned += amount;
      
      if (['pending_validation', 'pending_approval'].includes(c.status)) {
        repStats[repId].pending += amount;
      } else if (['approved', 'payable'].includes(c.status)) {
        repStats[repId].approved += amount;
      } else if (c.status === 'paid') {
        repStats[repId].paid += amount;
      }
    });

    // Chart data - grouped bars by rep (approved vs paid)
    const chartData = Object.entries(repStats).map(([repId, data]) => ({
      repName: data.repName,
      approved: parseFloat(data.approved.toFixed(2)),
      paid: parseFloat(data.paid.toFixed(2))
    }));

    res.json({
      summary: {
        totalGenerated: parseFloat(totalGenerated.toFixed(2)),
        totalApproved: parseFloat(totalApproved.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2))
      },
      chartData,
      tableData: Object.values(repStats).map(d => ({
        repName: d.repName,
        totalEarned: parseFloat(d.totalEarned.toFixed(2)),
        pending: parseFloat(d.pending.toFixed(2)),
        approved: parseFloat(d.approved.toFixed(2)),
        paid: parseFloat(d.paid.toFixed(2))
      }))
    });
  } catch (error) {
    console.error('Commissions report error:', error);
    res.status(500).json({ detail: 'Failed to generate report' });
  }
});

module.exports = router;
