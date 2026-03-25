const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const commissionController = require('../controllers/commissionController');
const authMiddleware = require('../middleware/auth');
const { CommissionRule, Program, Commission, AuditLog } = require('../models/pg');

// All routes require authentication
router.use(authMiddleware);

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
};

// ==========================================
// COMMISSION RULES ROUTES (must be before /:commissionId)
// ==========================================

// Get all commission rules
router.get('/rules', adminOnly, async (req, res) => {
  try {
    const rules = await CommissionRule.findAll({
      include: [{ model: Program, as: 'program', attributes: ['program_id', 'name'] }],
      order: [['priority', 'DESC'], ['created_at', 'DESC']]
    });
    res.json(rules);
  } catch (error) {
    console.error('Get commission rules error:', error);
    res.status(500).json({ detail: 'Failed to get commission rules' });
  }
});

// Create commission rule
router.post('/rules', adminOnly, async (req, res) => {
  try {
    const { name, description, program_id, role_type, commission_type, commission_value, 
            minimum_payment_status, minimum_sale_amount, hold_days, start_date, end_date, priority,
            manager_override_min, manager_override_max } = req.body;

    // Validate: cannot create two active rules for the same programme_id and role_type
    if (program_id) {
      const existingRule = await CommissionRule.findOne({
        where: {
          program_id,
          role_type: role_type || 'sales_user',
          is_active: true
        }
      });

      if (existingRule) {
        return res.status(400).json({ 
          detail: 'An active commission rule already exists for this programme and role type',
          field: 'program_id'
        });
      }
    }

    // Validate override bounds
    if (manager_override_min !== undefined && manager_override_max !== undefined) {
      if (manager_override_min !== null && manager_override_max !== null) {
        if (parseFloat(manager_override_min) >= parseFloat(manager_override_max)) {
          return res.status(400).json({
            detail: 'Min override must be less than max override',
            field: 'manager_override_min'
          });
        }
      }
    }

    const rule = await CommissionRule.create({
      rule_id: `rule_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      name,
      description,
      program_id: program_id || null,
      role_type: role_type || 'sales_user',
      commission_type: commission_type || 'percentage',
      commission_value,
      minimum_payment_status: minimum_payment_status || 'paid_in_full',
      minimum_sale_amount,
      hold_days: hold_days || 14,
      start_date: start_date || null,
      end_date: end_date || null,
      priority: priority || 0,
      manager_override_min: manager_override_min !== undefined ? manager_override_min : null,
      manager_override_max: manager_override_max !== undefined ? manager_override_max : null,
      created_by: req.user.user_id,
      is_active: true
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Create commission rule error:', error);
    res.status(500).json({ detail: 'Failed to create commission rule' });
  }
});

// Update commission rule
router.put('/rules/:ruleId', adminOnly, async (req, res) => {
  try {
    const rule = await CommissionRule.findByPk(req.params.ruleId);
    if (!rule) {
      return res.status(404).json({ detail: 'Rule not found' });
    }

    // If updating program_id, check for existing rule
    if (req.body.program_id !== undefined && req.body.program_id !== rule.program_id) {
      const existingRule = await CommissionRule.findOne({
        where: {
          program_id: req.body.program_id,
          role_type: req.body.role_type || rule.role_type,
          is_active: true,
          rule_id: { [require('sequelize').Op.ne]: rule.rule_id }
        }
      });

      if (existingRule) {
        return res.status(400).json({ 
          detail: 'An active commission rule already exists for this programme and role type',
          field: 'program_id'
        });
      }
    }

    // Validate override bounds
    const newMin = req.body.manager_override_min !== undefined 
      ? req.body.manager_override_min 
      : rule.manager_override_min;
    const newMax = req.body.manager_override_max !== undefined 
      ? req.body.manager_override_max 
      : rule.manager_override_max;

    if (newMin !== null && newMax !== null) {
      if (parseFloat(newMin) >= parseFloat(newMax)) {
        return res.status(400).json({
          detail: 'Min override must be less than max override',
          field: 'manager_override_min'
        });
      }
    }

    const updateData = {};
    const allowedFields = ['name', 'description', 'program_id', 'role_type', 'commission_type', 
                          'commission_value', 'minimum_payment_status', 'minimum_sale_amount', 
                          'hold_days', 'start_date', 'end_date', 'priority', 'is_active',
                          'manager_override_min', 'manager_override_max'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    await rule.update(updateData);
    res.json(rule);
  } catch (error) {
    console.error('Update commission rule error:', error);
    res.status(500).json({ detail: 'Failed to update commission rule' });
  }
});

// Delete commission rule
router.delete('/rules/:ruleId', adminOnly, async (req, res) => {
  try {
    const rule = await CommissionRule.findByPk(req.params.ruleId);
    if (!rule) {
      return res.status(404).json({ detail: 'Rule not found' });
    }

    await rule.destroy();
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete commission rule error:', error);
    res.status(500).json({ detail: 'Failed to delete commission rule' });
  }
});

// ==========================================
// COMMISSION STATISTICS AND DATA ROUTES
// ==========================================

// Get commission statistics (admin)
router.get('/stats', adminOnly, commissionController.getStats);

// Get my commissions (for current user)
router.get('/my-commissions', commissionController.getMyCommissions);

// Get all commissions with filters
router.get('/', commissionController.getCommissions);

// Get commission by ID (must be after /rules routes)
router.get('/:commissionId', commissionController.getCommission);

// Approve commission (admin only)
router.post('/:commissionId/approve', adminOnly, commissionController.approveCommission);

// Reject/Cancel commission (admin only)
router.post('/:commissionId/reject', adminOnly, commissionController.rejectCommission);

// Mark commission as payable (admin only)
router.post('/:commissionId/mark-payable', adminOnly, async (req, res) => {
  try {
    const commission = await Commission.findByPk(req.params.commissionId);
    if (!commission) {
      return res.status(404).json({ detail: 'Commission not found' });
    }
    
    if (commission.status !== 'approved') {
      return res.status(400).json({ detail: 'Only approved commissions can be marked as payable' });
    }

    await commission.update({ status: 'payable' });
    
    // Log audit
    await AuditLog.create({
      log_id: `audit_${require('uuid').v4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'commission_marked_payable',
      object_type: 'commission',
      object_id: commission.commission_id,
      new_value: JSON.stringify({ status: 'payable' })
    });

    res.json({ message: 'Commission marked as payable', commission });
  } catch (error) {
    console.error('Mark payable error:', error);
    res.status(500).json({ detail: 'Failed to mark as payable' });
  }
});

// Process hold period commissions (admin only - scheduled job)
router.post('/process-holds', adminOnly, commissionController.processHolds);

// Bulk approve commissions (admin only)
router.post('/bulk-approve', adminOnly, commissionController.bulkApprove);

module.exports = router;
