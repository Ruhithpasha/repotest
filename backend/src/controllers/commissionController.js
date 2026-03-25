/**
 * Commission Controller
 * 
 * Handles commission management endpoints
 */

const { 
  CommissionRepository, 
  UserRepository,
  PayoutRepository,
  CommissionRuleRepository
} = require('../repositories');
const CommissionEngine = require('../services/commissionEngine');
const AuditLogger = require('../services/auditLogger');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all commissions with filters
 * GET /api/commissions
 */
exports.getCommissions = async (req, res) => {
  try {
    const { status, role_type, rep_id, date_from, date_to, limit, offset } = req.query;
    
    console.log('[Commissions] GET /api/commissions called');
    console.log('[Commissions] Query params:', { status, role_type, rep_id, date_from, date_to, limit, offset });
    console.log('[Commissions] User:', { user_id: req.user.user_id, role: req.user.role });
    
    let filters = { status, role_type, date_from, date_to, limit: parseInt(limit), offset: parseInt(offset) };

    // Role-based filtering
    if (req.user.role === 'rep' || req.user.role === 'sales_user') {
      filters.rep_id = req.user.user_id;
      console.log('[Commissions] Filtering by rep_id (own):', req.user.user_id);
    } else if (req.user.role === 'manager') {
      // Manager sees commissions for their team
      // For now, allow filtering by rep_id
      if (rep_id) filters.rep_id = rep_id;
    } else if (rep_id) {
      filters.rep_id = rep_id;
    }

    console.log('[Commissions] Final filters:', filters);

    const commissions = await CommissionRepository.findAllWithFilters(filters);
    console.log('[Commissions] Found commissions:', commissions.length);

    // Enrich with user data, student data, programme data, and rule bounds
    const { Student, User } = require('../models/pg');
    
    // Course name mapping
    const courseNames = {
      'level7-implantology': 'Level 7 Diploma in Implantology',
      'prog_diploma_l7': 'Level 7 Diploma in Implantology',
      'advanced-implants': 'Advanced Implant Course'
    };
    
    const enriched = await Promise.all(commissions.map(async (comm) => {
      const user = await UserRepository.findByUserId(comm.rep_id);
      
      // Get student info
      let studentInfo = null;
      let courseId = null;
      if (comm.student_id) {
        const student = await Student.findByPk(comm.student_id, {
          include: [{ model: User, as: 'user' }]
        });
        if (student) {
          studentInfo = {
            student_id: student.student_id,
            name: student.user?.name || 'Unknown',
            email: student.user?.email,
            status: student.status
          };
          courseId = student.course_id;
        }
      }
      
      // Get programme name from course_id
      const programmeId = comm.programme_id || courseId;
      const programmeName = programmeId ? (courseNames[programmeId] || programmeId) : null;
      
      // Get rule bounds for override functionality
      let ruleBounds = { rule_min: null, rule_max: null };
      if (comm.rule_id) {
        try {
          const rule = await CommissionRuleRepository.findByRuleId(comm.rule_id);
          if (rule) {
            ruleBounds.rule_min = rule.manager_override_min;
            ruleBounds.rule_max = rule.manager_override_max;
          }
        } catch (e) {
          // Rule lookup failed, continue without bounds
        }
      }
      
      return {
        ...comm.toJSON(),
        recipient: user ? { user_id: user.user_id, name: user.name, email: user.email } : null,
        student: studentInfo,
        student_name: studentInfo?.name,
        programme_id: programmeId,
        programme_name: programmeName,
        ...ruleBounds
      };
    }));

    console.log('[Commissions] Returning', enriched.length, 'commissions');
    res.json(enriched);
  } catch (error) {
    console.error('[Commissions] Get commissions error:', error);
    res.status(500).json({ detail: 'Failed to get commissions' });
  }
};

/**
 * Get commission by ID
 * GET /api/commissions/:commissionId
 */
exports.getCommission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    const commission = await CommissionRepository.findByCommissionId(commissionId);
    
    if (!commission) {
      return res.status(404).json({ detail: 'Commission not found' });
    }

    // Check access
    if (['rep', 'sales_user'].includes(req.user.role) && commission.rep_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const user = await UserRepository.findByUserId(commission.rep_id);

    res.json({
      ...commission.toJSON(),
      recipient: user ? { user_id: user.user_id, name: user.name, email: user.email } : null
    });
  } catch (error) {
    console.error('Get commission error:', error);
    res.status(500).json({ detail: 'Failed to get commission' });
  }
};

/**
 * Get my commissions (for current user)
 * GET /api/commissions/my-commissions
 */
exports.getMyCommissions = async (req, res) => {
  try {
    const { status } = req.query;
    const commissions = await CommissionRepository.findByRepId(req.user.user_id, status);
    const summary = await CommissionEngine.getUserCommissionSummary(req.user.user_id);

    res.json({
      commissions,
      summary
    });
  } catch (error) {
    console.error('Get my commissions error:', error);
    res.status(500).json({ detail: 'Failed to get commissions' });
  }
};

/**
 * Approve commission
 * POST /api/commissions/:commissionId/approve
 */
exports.approveCommission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    const commission = await CommissionRepository.findByCommissionId(commissionId);
    
    if (!commission) {
      return res.status(404).json({ detail: 'Commission not found' });
    }

    if (!['pending_validation', 'pending_approval', 'pending'].includes(commission.status)) {
      return res.status(400).json({ detail: 'Commission cannot be approved in current status' });
    }

    const updatedCommission = await CommissionEngine.approveCommission(req, commissionId);

    res.json({
      message: 'Commission approved',
      commission: updatedCommission.toJSON()
    });
  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({ detail: 'Failed to approve commission' });
  }
};

/**
 * Reject/Cancel commission
 * POST /api/commissions/:commissionId/reject
 */
exports.rejectCommission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ detail: 'Reason is required' });
    }

    const commission = await CommissionRepository.findByCommissionId(commissionId);
    if (!commission) {
      return res.status(404).json({ detail: 'Commission not found' });
    }

    const updatedCommission = await CommissionEngine.reverseCommission(req, commissionId, reason);

    res.json({
      message: 'Commission rejected',
      commission: updatedCommission.toJSON()
    });
  } catch (error) {
    console.error('Reject commission error:', error);
    res.status(500).json({ detail: error.message || 'Failed to reject commission' });
  }
};

/**
 * Get commission statistics
 * GET /api/commissions/stats
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await CommissionRepository.getAllStats();
    const byRole = await CommissionRepository.getStatsByRoleType();
    const pendingCount = await CommissionRepository.countPendingApproval();

    // Transform to more usable format
    const byStatus = stats.reduce((acc, s) => {
      acc[s.status] = { count: parseInt(s.count), total: parseFloat(s.total) || 0 };
      return acc;
    }, {});

    res.json({
      by_status: byStatus,
      by_role: byRole,
      pending_approval_count: pendingCount,
      total_payable: byStatus.payable?.total || 0,
      total_paid: byStatus.paid?.total || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ detail: 'Failed to get stats' });
  }
};

/**
 * Process hold period commissions (scheduled job)
 * POST /api/commissions/process-holds
 */
exports.processHolds = async (req, res) => {
  try {
    const processed = await CommissionEngine.processHoldPeriodCommissions();
    res.json({
      message: `Processed ${processed.length} commissions`,
      commission_ids: processed
    });
  } catch (error) {
    console.error('Process holds error:', error);
    res.status(500).json({ detail: 'Failed to process hold periods' });
  }
};

/**
 * Bulk approve commissions
 * POST /api/commissions/bulk-approve
 */
exports.bulkApprove = async (req, res) => {
  try {
    const { commission_ids } = req.body;

    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return res.status(400).json({ detail: 'commission_ids array is required' });
    }

    const approved = [];
    const failed = [];

    for (const commissionId of commission_ids) {
      try {
        await CommissionEngine.approveCommission(req, commissionId);
        approved.push(commissionId);
      } catch (err) {
        failed.push({ commission_id: commissionId, error: err.message });
      }
    }

    res.json({
      message: `Approved ${approved.length} of ${commission_ids.length} commissions`,
      approved,
      failed
    });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ detail: 'Failed to bulk approve commissions' });
  }
};

module.exports = exports;
