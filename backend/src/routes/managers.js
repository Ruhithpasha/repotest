/**
 * Managers Routes
 * Super Admin only - manage sales hierarchy
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const { User, Manager, Team, Commission } = require('../models/pg');
const { Op } = require('sequelize');

// All routes require auth + super_admin role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Super Admin access required' });
  }
  next();
});

/**
 * GET /api/managers - List all managers with stats
 */
router.get('/', async (req, res) => {
  try {
    const managers = await Manager.findAll({
      include: [{ model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'is_active'] }],
      order: [['created_at', 'DESC']]
    });

    // Enrich with rep counts and commission data
    const enriched = await Promise.all(managers.map(async (m) => {
      const repCount = await User.count({ where: { manager_id: m.user_id } });
      const commissionSum = await Commission.sum('amount', { 
        where: { earner_id: m.user_id, status: 'paid' } 
      });
      
      return {
        ...m.toJSON(),
        rep_count: repCount,
        total_commission_paid: commissionSum || 0
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ detail: 'Failed to get managers' });
  }
});

/**
 * GET /api/managers/stats - Manager statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalManagers = await Manager.count({ where: { is_active: true } });
    const totalReps = await User.count({ where: { role: { [Op.in]: ['rep', 'sales_user'] }, manager_id: { [Op.ne]: null } } });
    const avgRepsPerManager = totalManagers > 0 ? (totalReps / totalManagers).toFixed(1) : 0;

    res.json({
      total_managers: totalManagers,
      total_reps: totalReps,
      avg_reps_per_manager: parseFloat(avgRepsPerManager)
    });
  } catch (error) {
    console.error('Get manager stats error:', error);
    res.status(500).json({ detail: 'Failed to get stats' });
  }
});

/**
 * POST /api/managers - Create a new manager
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, assigned_admin_id, commission_override } = req.body;

    if (!user_id) {
      return res.status(400).json({ detail: 'user_id is required' });
    }

    // Check if user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Check if already a manager
    const existing = await Manager.findOne({ where: { user_id } });
    if (existing) {
      return res.status(400).json({ detail: 'User is already a manager' });
    }

    const manager = await Manager.create({
      manager_id: `mgr_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id,
      assigned_admin_id: assigned_admin_id || req.user.user_id,
      commission_override: commission_override || null
    });

    // Update user role to manager
    await user.update({ role: 'manager' });

    res.status(201).json({
      message: 'Manager created successfully',
      manager: manager.toJSON()
    });
  } catch (error) {
    console.error('Create manager error:', error);
    res.status(500).json({ detail: 'Failed to create manager' });
  }
});

/**
 * GET /api/managers/:id - Get single manager with reps
 */
router.get('/:id', async (req, res) => {
  try {
    const manager = await Manager.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'is_active'] }]
    });

    if (!manager) {
      return res.status(404).json({ detail: 'Manager not found' });
    }

    // Get assigned reps
    const reps = await User.findAll({
      where: { manager_id: manager.user_id },
      attributes: ['user_id', 'name', 'email', 'is_active', 'created_at']
    });

    res.json({
      ...manager.toJSON(),
      reps
    });
  } catch (error) {
    console.error('Get manager error:', error);
    res.status(500).json({ detail: 'Failed to get manager' });
  }
});

/**
 * PATCH /api/managers/:id - Update manager
 */
router.patch('/:id', async (req, res) => {
  try {
    const { commission_override, assigned_admin_id } = req.body;
    
    const manager = await Manager.findByPk(req.params.id);
    if (!manager) {
      return res.status(404).json({ detail: 'Manager not found' });
    }

    await manager.update({
      commission_override: commission_override !== undefined ? commission_override : manager.commission_override,
      assigned_admin_id: assigned_admin_id || manager.assigned_admin_id
    });

    res.json({ message: 'Manager updated', manager: manager.toJSON() });
  } catch (error) {
    console.error('Update manager error:', error);
    res.status(500).json({ detail: 'Failed to update manager' });
  }
});

/**
 * PATCH /api/managers/:id/reps - Assign/remove reps
 */
router.patch('/:id/reps', async (req, res) => {
  try {
    const { addRepIds = [], removeRepIds = [] } = req.body;
    
    const manager = await Manager.findByPk(req.params.id);
    if (!manager) {
      return res.status(404).json({ detail: 'Manager not found' });
    }

    // Add reps
    if (addRepIds.length > 0) {
      await User.update(
        { manager_id: manager.user_id },
        { where: { user_id: { [Op.in]: addRepIds } } }
      );
    }

    // Remove reps
    if (removeRepIds.length > 0) {
      await User.update(
        { manager_id: null },
        { where: { user_id: { [Op.in]: removeRepIds }, manager_id: manager.user_id } }
      );
    }

    res.json({ message: 'Reps updated successfully' });
  } catch (error) {
    console.error('Update reps error:', error);
    res.status(500).json({ detail: 'Failed to update reps' });
  }
});

/**
 * PATCH /api/managers/:id/deactivate - Deactivate manager
 */
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const manager = await Manager.findByPk(req.params.id);
    if (!manager) {
      return res.status(404).json({ detail: 'Manager not found' });
    }

    await manager.update({ is_active: false });

    // Optionally update user role back to rep
    await User.update(
      { role: 'rep' },
      { where: { user_id: manager.user_id } }
    );

    res.json({ message: 'Manager deactivated' });
  } catch (error) {
    console.error('Deactivate manager error:', error);
    res.status(500).json({ detail: 'Failed to deactivate manager' });
  }
});

/**
 * GET /api/managers/available-reps - Get users available to be assigned as reps
 */
router.get('/available-reps', async (req, res) => {
  try {
    const reps = await User.findAll({
      where: {
        role: { [Op.in]: ['rep', 'sales_user'] },
        manager_id: null,
        is_active: true
      },
      attributes: ['user_id', 'name', 'email']
    });
    res.json(reps);
  } catch (error) {
    console.error('Get available reps error:', error);
    res.status(500).json({ detail: 'Failed to get available reps' });
  }
});

module.exports = router;
