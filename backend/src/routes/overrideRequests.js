/**
 * Commission Override Request API Routes
 * Manager override requests and Super Admin approval workflow
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { 
  Commission, CommissionRule, CommissionOverrideRequest, 
  User, Student, Program, AuditLog 
} = require('../models/pg');
const { Op } = require('sequelize');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware
router.use(authMiddleware);

/**
 * POST /api/crm/commissions/:id/override-request
 * Manager requests commission override
 */
router.post('/crm/commissions/:id/override-request', async (req, res) => {
  try {
    const { id } = req.params;
    const { requested_percentage, reason } = req.body;

    // Verify user is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ detail: 'Only managers can request overrides' });
    }

    // Get the commission
    const commission = await Commission.findByPk(id);
    if (!commission) {
      return res.status(404).json({ detail: 'Commission not found' });
    }

    // Get the commission rule to check override bounds
    const rule = commission.rule_id 
      ? await CommissionRule.findByPk(commission.rule_id)
      : null;

    // Check if override is allowed
    if (!rule || (rule.manager_override_min === null && rule.manager_override_max === null)) {
      return res.status(403).json({ 
        detail: 'Manager overrides are not enabled for this commission rule' 
      });
    }

    const ruleMin = parseFloat(rule.manager_override_min) || 0;
    const ruleMax = parseFloat(rule.manager_override_max) || 100;
    const requestedPct = parseFloat(requested_percentage);

    // Get original percentage
    const originalPct = rule.commission_type === 'percentage' 
      ? parseFloat(rule.commission_value) * 100 
      : 0;

    // Check if within bounds
    const withinBounds = requestedPct >= ruleMin && requestedPct <= ruleMax;

    if (withinBounds) {
      // Apply override immediately
      const newCommissionValue = requestedPct / 100;
      const newAmount = parseFloat(commission.sale_amount_gbp) * newCommissionValue;

      await commission.update({
        commission_value: newCommissionValue,
        commission_amount_gbp: newAmount,
        notes: `${commission.notes || ''} | Override applied by manager: ${originalPct.toFixed(2)}% → ${requestedPct.toFixed(2)}%`
      });

      // Audit log
      await AuditLog.create({
        log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: req.user.user_id,
        action_type: 'commission_updated',
        object_type: 'commission',
        object_id: id,
        description: JSON.stringify({
          action: 'manager_override_applied',
          original_percentage: originalPct,
          new_percentage: requestedPct,
          reason
        }),
        user_role: req.user.role
      });

      return res.json({
        applied: true,
        message: 'Commission percentage updated successfully',
        commission: {
          id: commission.commission_id,
          new_percentage: requestedPct,
          new_amount: newAmount
        }
      });

    } else {
      // Create pending override request
      const requestId = `ovr_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      
      await CommissionOverrideRequest.create({
        request_id: requestId,
        commission_id: id,
        student_id: commission.student_id,
        requested_by_user_id: req.user.user_id,
        original_percentage: originalPct,
        requested_percentage: requestedPct,
        rule_min: ruleMin,
        rule_max: ruleMax,
        reason: reason || null,
        status: 'pending'
      });

      // Audit log
      await AuditLog.create({
        log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: req.user.user_id,
        action_type: 'commission_updated',
        object_type: 'commission_override_request',
        object_id: requestId,
        description: JSON.stringify({
          action: 'override_request_created',
          commission_id: id,
          original_percentage: originalPct,
          requested_percentage: requestedPct,
          rule_bounds: { min: ruleMin, max: ruleMax }
        }),
        user_role: req.user.role
      });

      return res.json({
        pending: true,
        requestId,
        message: 'This override requires Super Admin approval. Your request has been submitted.'
      });
    }

  } catch (error) {
    console.error('[OverrideRequest] Error creating:', error);
    res.status(500).json({ detail: 'Failed to process override request' });
  }
});

/**
 * GET /api/admin/commission-override-requests
 * List all override requests (Super Admin only)
 */
router.get('/admin/commission-override-requests', async (req, res) => {
  try {
    // Verify super admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Super admin access required' });
    }

    const { status } = req.query;
    const where = {};
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }

    const requests = await CommissionOverrideRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'name', 'email']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['user_id', 'name', 'email']
        },
        {
          model: Commission,
          as: 'commission',
          attributes: ['commission_id', 'sale_amount_gbp', 'commission_amount_gbp', 'status', 'role_type', 'program_id']
        },
        {
          model: Student,
          as: 'student',
          attributes: ['student_id'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Enrich with programme names
    const enrichedRequests = await Promise.all(requests.map(async (req) => {
      let programmeName = 'Unknown';
      if (req.commission?.program_id) {
        const programme = await Program.findByPk(req.commission.program_id);
        programmeName = programme?.name || 'Unknown';
      }

      return {
        id: req.request_id,
        commission_id: req.commission_id,
        manager: req.requester ? {
          id: req.requester.user_id,
          name: req.requester.name,
          email: req.requester.email
        } : null,
        student: req.student?.user ? {
          name: req.student.user.name,
          email: req.student.user.email
        } : null,
        programme_name: programmeName,
        original_percentage: parseFloat(req.original_percentage),
        requested_percentage: parseFloat(req.requested_percentage),
        rule_min: req.rule_min ? parseFloat(req.rule_min) : null,
        rule_max: req.rule_max ? parseFloat(req.rule_max) : null,
        reason: req.reason,
        status: req.status,
        reviewer: req.reviewer ? {
          id: req.reviewer.user_id,
          name: req.reviewer.name
        } : null,
        review_note: req.review_note,
        reviewed_at: req.reviewed_at,
        created_at: req.created_at
      };
    }));

    // Get counts for stats
    const pendingCount = await CommissionOverrideRequest.count({ where: { status: 'pending' } });
    const approvedCount = await CommissionOverrideRequest.count({ where: { status: 'approved' } });
    const rejectedCount = await CommissionOverrideRequest.count({ where: { status: 'rejected' } });

    res.json({
      requests: enrichedRequests,
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + approvedCount + rejectedCount
      }
    });

  } catch (error) {
    console.error('[OverrideRequest] Error listing:', error);
    res.status(500).json({ detail: 'Failed to fetch override requests' });
  }
});

/**
 * GET /api/admin/commission-override-requests/pending-count
 * Get count of pending requests (for sidebar badge)
 */
router.get('/admin/commission-override-requests/pending-count', async (req, res) => {
  try {
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Super admin access required' });
    }

    const count = await CommissionOverrideRequest.count({ where: { status: 'pending' } });
    res.json({ count });

  } catch (error) {
    console.error('[OverrideRequest] Error getting count:', error);
    res.status(500).json({ detail: 'Failed to fetch count' });
  }
});

/**
 * PATCH /api/admin/commission-override-requests/:id
 * Approve or reject an override request
 */
router.patch('/admin/commission-override-requests/:id', async (req, res) => {
  try {
    // Verify super admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Super admin access required' });
    }

    const { id } = req.params;
    const { status, review_note } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ detail: 'Status must be approved or rejected' });
    }

    const request = await CommissionOverrideRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ detail: 'Override request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ detail: 'Request has already been reviewed' });
    }

    // Update request
    await request.update({
      status,
      review_note: review_note || null,
      reviewed_by_user_id: req.user.user_id,
      reviewed_at: new Date()
    });

    // If approved, update the commission
    if (status === 'approved') {
      const commission = await Commission.findByPk(request.commission_id);
      if (commission) {
        const newCommissionValue = parseFloat(request.requested_percentage) / 100;
        const newAmount = parseFloat(commission.sale_amount_gbp) * newCommissionValue;

        await commission.update({
          commission_value: newCommissionValue,
          commission_amount_gbp: newAmount,
          notes: `${commission.notes || ''} | Override approved by admin: ${request.original_percentage}% → ${request.requested_percentage}%`
        });
      }

      // Audit log - approved
      await AuditLog.create({
        log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: req.user.user_id,
        action_type: 'commission_approved',
        object_type: 'commission_override_request',
        object_id: id,
        description: JSON.stringify({
          action: 'override_approved',
          commission_id: request.commission_id,
          requested_percentage: request.requested_percentage,
          review_note
        }),
        user_role: req.user.role
      });
    } else {
      // Audit log - rejected
      await AuditLog.create({
        log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: req.user.user_id,
        action_type: 'commission_rejected',
        object_type: 'commission_override_request',
        object_id: id,
        description: JSON.stringify({
          action: 'override_rejected',
          commission_id: request.commission_id,
          requested_percentage: request.requested_percentage,
          review_note
        }),
        user_role: req.user.role
      });
    }

    // Get requester info for response
    const requester = await User.findByPk(request.requested_by_user_id);

    res.json({
      success: true,
      message: `Override request ${status}`,
      request: {
        id: request.request_id,
        status: request.status,
        reviewed_at: request.reviewed_at
      }
    });

  } catch (error) {
    console.error('[OverrideRequest] Error updating:', error);
    res.status(500).json({ detail: 'Failed to update override request' });
  }
});

module.exports = router;
