const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { User, AuditLog } = require('../models/pg');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Access denied. Admin role required.' });
  }
  next();
});

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Application management
router.get('/applications', adminController.getApplications);
router.get('/applications/:studentId', adminController.getApplication);
router.patch('/applications/:studentId/approve', adminController.approveApplication);
router.patch('/applications/:studentId/reject', adminController.rejectApplication);

// Document review
router.get('/documents/pending', adminController.getPendingDocuments);
router.patch('/documents/:documentId/approve', adminController.approveDocument);
router.patch('/documents/:documentId/reject', adminController.rejectDocument);
router.get('/documents/:documentId/view-url', adminController.getDocumentViewUrl);
router.get('/documents/:documentId/download', adminController.downloadDocument);

// Storage status
router.get('/storage/status', adminController.getStorageStatus);

// Rep management
router.get('/reps', adminController.getReps);

// User management (create reps and admins)
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);

// NOTE: These specific /users routes MUST come BEFORE /users/:userId to avoid :userId matching "bulk-assign-manager" etc
// TEAMS - Bulk assign manager - specific path before wildcard
router.patch('/users/bulk-assign-manager', async (req, res) => {
  try {
    const { rep_ids, manager_id } = req.body;

    if (!Array.isArray(rep_ids) || rep_ids.length === 0) {
      return res.status(400).json({ detail: 'rep_ids must be a non-empty array' });
    }

    let newManagerName = null;

    // Validate manager if provided
    if (manager_id) {
      const manager = await User.findByPk(manager_id);
      if (!manager) {
        return res.status(404).json({ detail: 'Manager not found' });
      }
      if (manager.role !== 'manager') {
        return res.status(400).json({ detail: 'Target user is not a manager' });
      }
      newManagerName = manager.name;
    }

    // Get all reps to update
    const reps = await User.findAll({
      where: {
        user_id: { [Op.in]: rep_ids },
        role: { [Op.in]: ['rep', 'sales_user'] }
      }
    });

    if (reps.length === 0) {
      return res.status(400).json({ detail: 'No valid reps found' });
    }

    // Update each rep and create audit logs
    for (const rep of reps) {
      const oldManagerId = rep.manager_id;
      let oldManagerName = null;

      if (oldManagerId) {
        const oldManager = await User.findByPk(oldManagerId, { attributes: ['name'] });
        oldManagerName = oldManager?.name || 'Unknown';
      }

      await rep.update({ manager_id: manager_id || null });

      await AuditLog.create({
        log_id: `audit_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        user_id: req.user.user_id,
        user_email: req.user.email,
        user_role: req.user.role,
        action_type: 'user_updated',
        object_type: 'user',
        object_id: rep.user_id,
        old_value: {
          manager_id: oldManagerId,
          manager_name: oldManagerName
        },
        new_value: {
          manager_id: manager_id || null,
          manager_name: newManagerName,
          bulk_operation: true
        },
        description: `Rep ${rep.name} ${newManagerName ? `assigned to ${newManagerName}` : 'unassigned from manager'} (bulk)`
      });
    }

    res.json({
      success: true,
      updated_count: reps.length,
      manager_name: newManagerName
    });
  } catch (error) {
    console.error('[Teams] Error bulk assigning manager:', error);
    res.status(500).json({ detail: 'Failed to bulk assign manager' });
  }
});

// Wildcard route - must come AFTER specific routes
router.patch('/users/:userId', adminController.updateUser);

// Payment management
router.post('/students/:studentId/payments', adminController.recordPayment);

// Student qualification (after interview)
router.patch('/students/:studentId/qualify', adminController.qualifyStudent);

// Mark interview as completed (manual trigger when GHL webhook doesn't fire)
router.patch('/students/:studentId/mark-interview-completed', adminController.markInterviewCompleted);

// Commission management
router.get('/commissions', adminController.getCommissions);
router.patch('/commissions/:commissionId/approve', adminController.approveCommission);
router.patch('/commissions/:commissionId/paid', adminController.markCommissionPaid);

// Clawback Rules
router.get('/clawback-rules', adminController.getClawbackRules);
router.post('/clawback-rules', adminController.createClawbackRule);
router.patch('/clawback-rules/:id', adminController.updateClawbackRule);
router.delete('/clawback-rules/:id', adminController.deleteClawbackRule);
router.post('/students/:studentId/trigger-clawback', adminController.triggerClawback);

// ==========================================
// TEAMS - Rep-to-Manager Assignment
// ==========================================

/**
 * GET /api/admin/users/reps
 * Get all reps with their manager assignment info
 */
router.get('/users/reps', async (req, res) => {
  try {
    const { manager_id, unassigned } = req.query;

    const where = {
      role: { [Op.in]: ['rep', 'sales_user'] },
      is_active: true
    };

    if (manager_id) {
      where.manager_id = manager_id;
    }

    if (unassigned === 'true') {
      where.manager_id = null;
    }

    const reps = await User.findAll({
      where,
      attributes: ['user_id', 'name', 'email', 'role', 'is_active', 'manager_id', 'created_at'],
      order: [['name', 'ASC']]
    });

    // Enrich with manager names
    const enriched = await Promise.all(reps.map(async (rep) => {
      let managerName = null;
      if (rep.manager_id) {
        const manager = await User.findByPk(rep.manager_id, {
          attributes: ['name']
        });
        managerName = manager?.name || 'Unknown';
      }
      return {
        ...rep.toJSON(),
        manager_name: managerName
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('[Teams] Error getting reps:', error);
    res.status(500).json({ detail: 'Failed to get reps' });
  }
});

/**
 * GET /api/admin/users/managers
 * Get all managers with rep counts
 */
router.get('/users/managers', async (req, res) => {
  try {
    const managers = await User.findAll({
      where: {
        role: 'manager',
        is_active: true
      },
      attributes: ['user_id', 'name', 'email', 'is_active', 'created_at'],
      order: [['name', 'ASC']]
    });

    // Get rep counts for each manager
    const enriched = await Promise.all(managers.map(async (manager) => {
      const repCount = await User.count({
        where: {
          manager_id: manager.user_id,
          role: { [Op.in]: ['rep', 'sales_user'] },
          is_active: true
        }
      });
      return {
        ...manager.toJSON(),
        rep_count: repCount
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('[Teams] Error getting managers:', error);
    res.status(500).json({ detail: 'Failed to get managers' });
  }
});

/**
 * GET /api/admin/users/team-stats
 * Get team assignment statistics
 */
router.get('/users/team-stats', async (req, res) => {
  try {
    const totalManagers = await User.count({
      where: { role: 'manager', is_active: true }
    });

    const totalReps = await User.count({
      where: { 
        role: { [Op.in]: ['rep', 'sales_user'] }, 
        is_active: true 
      }
    });

    const unassignedReps = await User.count({
      where: {
        role: { [Op.in]: ['rep', 'sales_user'] },
        is_active: true,
        manager_id: null
      }
    });

    res.json({
      totalManagers,
      totalReps,
      unassignedReps
    });
  } catch (error) {
    console.error('[Teams] Error getting stats:', error);
    res.status(500).json({ detail: 'Failed to get team stats' });
  }
});

/**
 * PATCH /api/admin/users/:repId/assign-manager
 * Assign a manager to a rep
 */
router.patch('/users/:repId/assign-manager', async (req, res) => {
  try {
    const { repId } = req.params;
    const { manager_id } = req.body;

    // Validate rep exists and is a rep
    const rep = await User.findByPk(repId);
    if (!rep) {
      return res.status(404).json({ detail: 'Rep not found' });
    }
    if (!['rep', 'sales_user'].includes(rep.role)) {
      return res.status(400).json({ detail: 'User is not a rep/sales user' });
    }

    // Store old manager for audit
    const oldManagerId = rep.manager_id;
    let oldManagerName = null;
    let newManagerName = null;

    if (oldManagerId) {
      const oldManager = await User.findByPk(oldManagerId, { attributes: ['name'] });
      oldManagerName = oldManager?.name || 'Unknown';
    }

    // Validate new manager if provided
    if (manager_id) {
      const manager = await User.findByPk(manager_id);
      if (!manager) {
        return res.status(404).json({ detail: 'Manager not found' });
      }
      if (manager.role !== 'manager') {
        return res.status(400).json({ detail: 'Target user is not a manager' });
      }
      newManagerName = manager.name;
    }

    // Update the rep
    await rep.update({ manager_id: manager_id || null });

    // Write audit log
    await AuditLog.create({
      log_id: `audit_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      user_email: req.user.email,
      user_role: req.user.role,
      action_type: 'user_updated',
      object_type: 'user',
      object_id: repId,
      old_value: {
        manager_id: oldManagerId,
        manager_name: oldManagerName
      },
      new_value: {
        manager_id: manager_id || null,
        manager_name: newManagerName
      },
      description: `Rep ${rep.name} ${newManagerName ? `assigned to ${newManagerName}` : 'unassigned from manager'}`
    });

    // Refresh and return
    await rep.reload();
    res.json({
      ...rep.toJSON(),
      manager_name: newManagerName
    });
  } catch (error) {
    console.error('[Teams] Error assigning manager:', error);
    res.status(500).json({ detail: 'Failed to assign manager' });
  }
});

/**
 * DEBUG: Test commission creation for an enrolment
 * POST /api/admin/debug/trigger-commission
 */
router.post('/debug/trigger-commission', async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ detail: 'student_id is required' });
    }

    // Get student
    const student = await require('../models/pg').Student.findByPk(student_id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Get or create a test payment record
    const { StudentPayment, Program } = require('../models/pg');
    const { v4: uuidv4 } = require('uuid');
    
    const programme = await Program.findByPk(student.program_id);
    const saleAmount = programme?.list_price || programme?.price_gbp || 3000;

    // Use existing real payment if available, otherwise create a retroactive one
    const existingPayments = await StudentPayment.findAll({
      where: { student_id: student.student_id, status: 'paid' },
      order: [['paid_at', 'DESC']]
    });

    let payment;
    if (existingPayments.length > 0) {
      payment = existingPayments[0];
      console.log(`[Debug] Using existing payment: ${payment.payment_id}`);
    } else {
      const paymentId = `pay_retro_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      payment = await StudentPayment.create({
        payment_id: paymentId,
        student_id: student.student_id,
        amount_gbp: 7999,
        currency: 'GBP',
        status: 'paid',
        payment_type: 'full',
        payment_method: 'bank_transfer',
        paid_at: new Date(),
        notes: 'Retroactive commission trigger'
      });
    }

    // Trigger commission engine
    const CommissionService = require('../services/CommissionService');
    const result = await CommissionService.processPaymentCommissions(payment, student, 'debug_trigger');

    res.json({
      message: 'Commission engine triggered',
      result,
      payment: payment.toJSON(),
      student: student.toJSON()
    });
  } catch (error) {
    console.error('[Debug] Trigger commission error:', error);
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
