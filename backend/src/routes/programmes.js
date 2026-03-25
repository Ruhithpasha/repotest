/**
 * Programme/Course Management API Routes
 * Super Admin only - CRUD for programmes
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Program, Student, AuditLog, Lead } = require('../models/pg');
const { Op } = require('sequelize');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware
router.use(authMiddleware);

// Role check middleware
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Super admin access required' });
  }
  next();
};

router.use(requireSuperAdmin);

// Validation constants
const VALID_CURRENCIES = ['INR', 'GBP', 'USD', 'EUR'];

/**
 * GET /api/admin/programmes
 * List all programmes with filters and enrollment counts
 */
router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;

    // Build where clause
    const where = {};
    if (active !== undefined) {
      where.is_active = active === 'true';
    }
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const programmes = await Program.findAll({
      where,
      order: [['display_order', 'ASC'], ['created_at', 'DESC']]
    });

    // Get enrollment counts for each programme
    const programmesWithCounts = await Promise.all(programmes.map(async (prog) => {
      const enrollmentCount = await Student.count({
        where: {
          course_id: prog.program_id,
          status: { [Op.notIn]: ['rejected'] }
        }
      });

      return {
        id: prog.program_id,
        program_id: prog.program_id,
        program_name: prog.name,
        currency: prog.currency || 'INR',
        list_price: parseFloat(prog.price_gbp || 0),
        active: prog.is_active,
        created_at: prog.created_at,
        updated_at: prog.updated_at,
        enrollmentCount
      };
    }));

    res.json(programmesWithCounts);
  } catch (error) {
    console.error('[Programmes] Error listing:', error);
    res.status(500).json({ detail: 'Failed to fetch programmes' });
  }
});

/**
 * GET /api/admin/programmes/stats
 * Get programme statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalProgrammes = await Program.count();
    const activeProgrammes = await Program.count({ where: { is_active: true } });
    
    // Total enrollments (non-rejected students)
    const totalEnrolments = await Student.count({
      where: { status: { [Op.notIn]: ['rejected'] } }
    });

    // Total revenue from enrolled students (payments)
    const { StudentPayment } = require('../models/pg');
    const revenueResult = await StudentPayment.sum('amount_gbp', {
      where: { status: 'paid' }
    });

    res.json({
      totalProgrammes,
      activeProgrammes,
      totalEnrolments,
      totalRevenue: parseFloat(revenueResult || 0)
    });
  } catch (error) {
    console.error('[Programmes] Error getting stats:', error);
    res.status(500).json({ detail: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/admin/programmes
 * Create a new programme
 */
router.post('/', async (req, res) => {
  try {
    const { program_name, currency, list_price, active } = req.body;

    // Validation
    if (!program_name || program_name.trim().length < 2 || program_name.trim().length > 150) {
      return res.status(400).json({ 
        detail: 'Programme name must be between 2 and 150 characters',
        field: 'program_name'
      });
    }

    if (list_price === undefined || list_price <= 0) {
      return res.status(400).json({ 
        detail: 'List price must be greater than 0',
        field: 'list_price'
      });
    }

    if (currency && !VALID_CURRENCIES.includes(currency)) {
      return res.status(400).json({ 
        detail: `Currency must be one of: ${VALID_CURRENCIES.join(', ')}`,
        field: 'currency'
      });
    }

    // Check for duplicate name (case-insensitive)
    const existingProgramme = await Program.findOne({
      where: { name: { [Op.iLike]: program_name.trim() } }
    });

    if (existingProgramme) {
      return res.status(400).json({ 
        detail: 'A programme with this name already exists',
        field: 'program_name'
      });
    }

    // Create programme
    const programId = `prog_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const programme = await Program.create({
      program_id: programId,
      name: program_name.trim(),
      currency: currency || 'INR',
      price_gbp: list_price,
      is_active: active !== false
    });

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'programme_created',
      object_type: 'programme',
      object_id: programId,
      description: JSON.stringify({
        program_name: program_name.trim(),
        currency: currency || 'INR',
        list_price
      }),
      user_role: req.user.role
    });

    res.status(201).json({
      id: programme.program_id,
      program_id: programme.program_id,
      program_name: programme.name,
      currency: programme.currency,
      list_price: parseFloat(programme.price_gbp),
      active: programme.is_active,
      created_at: programme.created_at
    });
  } catch (error) {
    console.error('[Programmes] Error creating:', error);
    res.status(500).json({ detail: 'Failed to create programme' });
  }
});

/**
 * PATCH /api/admin/programmes/:id
 * Update a programme
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { program_name, currency, list_price, active } = req.body;

    const programme = await Program.findByPk(id);
    if (!programme) {
      return res.status(404).json({ detail: 'Programme not found' });
    }

    const oldValues = {
      program_name: programme.name,
      currency: programme.currency,
      list_price: parseFloat(programme.price_gbp),
      active: programme.is_active
    };

    // Validation
    if (program_name !== undefined) {
      if (program_name.trim().length < 2 || program_name.trim().length > 150) {
        return res.status(400).json({ 
          detail: 'Programme name must be between 2 and 150 characters',
          field: 'program_name'
        });
      }

      // Check for duplicate name (case-insensitive), excluding current
      const existingProgramme = await Program.findOne({
        where: { 
          name: { [Op.iLike]: program_name.trim() },
          program_id: { [Op.ne]: id }
        }
      });

      if (existingProgramme) {
        return res.status(400).json({ 
          detail: 'A programme with this name already exists',
          field: 'program_name'
        });
      }
    }

    if (list_price !== undefined && list_price <= 0) {
      return res.status(400).json({ 
        detail: 'List price must be greater than 0',
        field: 'list_price'
      });
    }

    if (currency !== undefined && !VALID_CURRENCIES.includes(currency)) {
      return res.status(400).json({ 
        detail: `Currency must be one of: ${VALID_CURRENCIES.join(', ')}`,
        field: 'currency'
      });
    }

    // Update fields
    const updates = {};
    if (program_name !== undefined) updates.name = program_name.trim();
    if (currency !== undefined) updates.currency = currency;
    if (list_price !== undefined) updates.price_gbp = list_price;
    if (active !== undefined) updates.is_active = active;

    await programme.update(updates);

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'programme_updated',
      object_type: 'programme',
      object_id: id,
      description: JSON.stringify({
        old_values: oldValues,
        new_values: {
          program_name: programme.name,
          currency: programme.currency,
          list_price: parseFloat(programme.price_gbp),
          active: programme.is_active
        }
      }),
      user_role: req.user.role
    });

    res.json({
      id: programme.program_id,
      program_id: programme.program_id,
      program_name: programme.name,
      currency: programme.currency,
      list_price: parseFloat(programme.price_gbp),
      active: programme.is_active,
      updated_at: programme.updated_at
    });
  } catch (error) {
    console.error('[Programmes] Error updating:', error);
    res.status(500).json({ detail: 'Failed to update programme' });
  }
});

/**
 * DELETE /api/admin/programmes/:id
 * Soft delete (deactivate) a programme
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const programme = await Program.findByPk(id);
    if (!programme) {
      return res.status(404).json({ detail: 'Programme not found' });
    }

    // Check for active enrolments
    const activeEnrolments = await Student.count({
      where: {
        course_id: id,
        status: { [Op.notIn]: ['rejected'] }
      }
    });

    if (activeEnrolments > 0) {
      return res.status(409).json({ 
        detail: 'Programme has active enrolments and cannot be deactivated.',
        activeEnrolments
      });
    }

    // Soft delete
    await programme.update({ is_active: false });

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'programme_deactivated',
      object_type: 'programme',
      object_id: id,
      description: JSON.stringify({
        program_name: programme.name
      }),
      user_role: req.user.role
    });

    res.json({ 
      success: true, 
      message: 'Programme deactivated successfully' 
    });
  } catch (error) {
    console.error('[Programmes] Error deleting:', error);
    res.status(500).json({ detail: 'Failed to deactivate programme' });
  }
});

/**
 * PATCH /api/admin/programmes/:id/activate
 * Reactivate a programme
 */
router.patch('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const programme = await Program.findByPk(id);
    if (!programme) {
      return res.status(404).json({ detail: 'Programme not found' });
    }

    await programme.update({ is_active: true });

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'programme_activated',
      object_type: 'programme',
      object_id: id,
      description: JSON.stringify({
        program_name: programme.name
      }),
      user_role: req.user.role
    });

    res.json({
      id: programme.program_id,
      program_id: programme.program_id,
      program_name: programme.name,
      active: true
    });
  } catch (error) {
    console.error('[Programmes] Error activating:', error);
    res.status(500).json({ detail: 'Failed to activate programme' });
  }
});

module.exports = router;
