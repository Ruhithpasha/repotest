/**
 * Module Management API Routes
 * Super Admin only - CRUD for course modules
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Module, Program, AuditLog } = require('../models/pg');
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

/**
 * GET /api/admin/programmes/:programmeId/modules
 * List all modules for a programme, ordered by `order` ASC
 */
router.get('/:programmeId/modules', async (req, res) => {
  try {
    const { programmeId } = req.params;
    const { active } = req.query;

    // Verify programme exists
    const programme = await Program.findByPk(programmeId);
    if (!programme) {
      return res.status(404).json({ detail: 'Programme not found' });
    }

    const where = { programme_id: programmeId };
    if (active !== undefined) {
      where.is_active = active === 'true';
    }

    const modules = await Module.findAll({
      where,
      order: [['order', 'ASC']],
      attributes: ['module_id', 'title', 'description', 'content', 'order', 'duration_minutes', 'is_active', 'created_at', 'updated_at']
    });

    // Calculate total duration
    const totalDuration = modules.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);

    res.json({
      programme: {
        id: programme.program_id,
        name: programme.name
      },
      modules: modules.map(m => ({
        id: m.module_id,
        title: m.title,
        description: m.description,
        content: m.content,
        order: m.order,
        duration_minutes: m.duration_minutes,
        active: m.is_active,
        created_at: m.created_at,
        updated_at: m.updated_at
      })),
      totalModules: modules.length,
      totalDuration
    });
  } catch (error) {
    console.error('[Modules] Error listing:', error);
    res.status(500).json({ detail: 'Failed to fetch modules' });
  }
});

/**
 * POST /api/admin/programmes/:programmeId/modules
 * Create a new module
 */
router.post('/:programmeId/modules', async (req, res) => {
  try {
    const { programmeId } = req.params;
    const { title, description, content, order, duration_minutes, active } = req.body;

    // Verify programme exists
    const programme = await Program.findByPk(programmeId);
    if (!programme) {
      return res.status(404).json({ detail: 'Programme not found' });
    }

    // Validation
    if (!title || title.trim().length < 2 || title.trim().length > 150) {
      return res.status(400).json({ 
        detail: 'Module title must be between 2 and 150 characters',
        field: 'title'
      });
    }

    // Auto-calculate order if not provided
    let moduleOrder = order;
    if (moduleOrder === undefined || moduleOrder === null) {
      const maxOrder = await Module.max('order', { where: { programme_id: programmeId } });
      moduleOrder = (maxOrder || 0) + 1;
    }

    // Check for duplicate order within programme
    const existingOrder = await Module.findOne({
      where: { 
        programme_id: programmeId,
        order: moduleOrder,
        is_active: true
      }
    });

    if (existingOrder) {
      // Shift all modules with order >= moduleOrder up by 1
      await Module.update(
        { order: sequelize.literal('order + 1') },
        { 
          where: { 
            programme_id: programmeId,
            order: { [Op.gte]: moduleOrder }
          }
        }
      );
    }

    // Create module
    const moduleId = `mod_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const module = await Module.create({
      module_id: moduleId,
      programme_id: programmeId,
      title: title.trim(),
      description: description?.trim() || null,
      content: content || null,
      order: moduleOrder,
      duration_minutes: duration_minutes || null,
      is_active: active !== false
    });

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'module_created',
      object_type: 'module',
      object_id: moduleId,
      description: JSON.stringify({
        programme_id: programmeId,
        title: title.trim(),
        order: moduleOrder
      }),
      user_role: req.user.role
    });

    res.status(201).json({
      id: module.module_id,
      title: module.title,
      description: module.description,
      content: module.content,
      order: module.order,
      duration_minutes: module.duration_minutes,
      active: module.is_active,
      created_at: module.created_at
    });
  } catch (error) {
    console.error('[Modules] Error creating:', error);
    res.status(500).json({ detail: 'Failed to create module' });
  }
});

/**
 * PATCH /api/admin/programmes/:programmeId/modules/reorder
 * Bulk reorder modules (MUST be before :moduleId route to avoid collision)
 */
router.patch('/:programmeId/modules/reorder', async (req, res) => {
  try {
    const { programmeId } = req.params;
    const { modules } = req.body;

    if (!Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ detail: 'modules array is required' });
    }

    // Verify programme exists
    const programme = await Program.findByPk(programmeId);
    if (!programme) {
      return res.status(404).json({ detail: 'Programme not found' });
    }

    // Update order for each module
    const updatePromises = modules.map(({ id, order }) => 
      Module.update(
        { order },
        { where: { module_id: id, programme_id: programmeId } }
      )
    );

    await Promise.all(updatePromises);

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'module_updated',
      object_type: 'module',
      object_id: programmeId,
      description: JSON.stringify({
        action: 'reorder',
        modules: modules
      }),
      user_role: req.user.role
    });

    res.json({ 
      success: true, 
      message: 'Module order updated' 
    });
  } catch (error) {
    console.error('[Modules] Error reordering:', error);
    res.status(500).json({ detail: 'Failed to reorder modules' });
  }
});

/**
 * PATCH /api/admin/programmes/:programmeId/modules/:moduleId
 * Update a module
 */
router.patch('/:programmeId/modules/:moduleId', async (req, res) => {
  try {
    const { programmeId, moduleId } = req.params;
    const { title, description, content, order, duration_minutes, active } = req.body;

    const module = await Module.findOne({
      where: { module_id: moduleId, programme_id: programmeId }
    });

    if (!module) {
      return res.status(404).json({ detail: 'Module not found' });
    }

    const oldValues = {
      title: module.title,
      description: module.description,
      order: module.order,
      duration_minutes: module.duration_minutes,
      active: module.is_active
    };

    // Validation
    if (title !== undefined) {
      if (title.trim().length < 2 || title.trim().length > 150) {
        return res.status(400).json({ 
          detail: 'Module title must be between 2 and 150 characters',
          field: 'title'
        });
      }
    }

    // Update fields
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (content !== undefined) updates.content = content;
    if (order !== undefined) updates.order = order;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (active !== undefined) updates.is_active = active;

    await module.update(updates);

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'module_updated',
      object_type: 'module',
      object_id: moduleId,
      description: JSON.stringify({
        old_values: oldValues,
        new_values: {
          title: module.title,
          description: module.description,
          order: module.order,
          duration_minutes: module.duration_minutes,
          active: module.is_active
        }
      }),
      user_role: req.user.role
    });

    res.json({
      id: module.module_id,
      title: module.title,
      description: module.description,
      content: module.content,
      order: module.order,
      duration_minutes: module.duration_minutes,
      active: module.is_active,
      updated_at: module.updated_at
    });
  } catch (error) {
    console.error('[Modules] Error updating:', error);
    res.status(500).json({ detail: 'Failed to update module' });
  }
});

/**
 * DELETE /api/admin/programmes/:programmeId/modules/:moduleId
 * Soft delete (deactivate) a module
 */
router.delete('/:programmeId/modules/:moduleId', async (req, res) => {
  try {
    const { programmeId, moduleId } = req.params;

    const module = await Module.findOne({
      where: { module_id: moduleId, programme_id: programmeId }
    });

    if (!module) {
      return res.status(404).json({ detail: 'Module not found' });
    }

    // Soft delete
    await module.update({ is_active: false });

    // Audit log
    await AuditLog.create({
      log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: req.user.user_id,
      action_type: 'module_deactivated',
      object_type: 'module',
      object_id: moduleId,
      description: JSON.stringify({
        title: module.title,
        programme_id: programmeId
      }),
      user_role: req.user.role
    });

    res.json({ 
      success: true, 
      message: 'Module deactivated successfully' 
    });
  } catch (error) {
    console.error('[Modules] Error deleting:', error);
    res.status(500).json({ detail: 'Failed to deactivate module' });
  }
});

module.exports = router;
