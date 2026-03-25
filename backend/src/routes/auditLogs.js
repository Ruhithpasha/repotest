/**
 * Audit Logs Routes
 * Super Admin only - view audit trail
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { AuditLog, User } = require('../models/pg');
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
 * GET /api/audit-logs - List all audit logs with filters
 */
router.get('/', async (req, res) => {
  try {
    const { role, action, entity_type, from, to, search, page = 1, limit = 50 } = req.query;
    
    const where = {};
    
    if (role && role !== 'all') {
      where.actor_role = role;
    }
    
    if (action && action !== 'all') {
      where.action_type = action;
    }
    
    if (entity_type && entity_type !== 'all') {
      where.object_type = entity_type;  // Model uses object_type column
    }
    
    if (from) {
      where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    }
    
    if (to) {
      where.created_at = { ...where.created_at, [Op.lte]: new Date(to) };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      logs: rows,
      total: count,
      page: parseInt(page),
      total_pages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ detail: 'Failed to get audit logs' });
  }
});

/**
 * GET /api/audit-logs/export - Export logs as CSV
 */
router.get('/export', async (req, res) => {
  try {
    const { role, action, entity_type, from, to } = req.query;
    
    const where = {};
    if (role && role !== 'all') where.actor_role = role;
    if (action && action !== 'all') where.action_type = action;
    if (entity_type && entity_type !== 'all') where.object_type = entity_type;  // Model uses object_type
    if (from) where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    if (to) where.created_at = { ...where.created_at, [Op.lte]: new Date(to) };

    const logs = await AuditLog.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 10000
    });

    // Generate CSV
    const headers = ['Timestamp', 'Actor', 'Actor Role', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP Address'];
    const rows = logs.map(log => [
      new Date(log.created_at).toISOString(),
      log.user?.name || 'System',
      log.actor_role || 'system',
      log.action_type,
      log.object_type,  // Use object_type
      log.object_id,    // Use object_id
      `"${(log.description || '').replace(/"/g, '""')}"`,
      log.ip_address || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ detail: 'Failed to export logs' });
  }
});

/**
 * GET /api/audit-logs/actions - Get distinct action types
 */
router.get('/actions', async (req, res) => {
  try {
    const actions = await AuditLog.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('action_type')), 'action']],
      raw: true
    });
    res.json(actions.map(a => a.action).filter(Boolean));
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({ detail: 'Failed to get actions' });
  }
});

/**
 * GET /api/audit-logs/entity-types - Get distinct entity types
 * Note: Model uses 'object_type' column name
 */
router.get('/entity-types', async (req, res) => {
  try {
    const types = await AuditLog.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('object_type')), 'type']],
      raw: true
    });
    res.json(types.map(t => t.type).filter(Boolean));
  } catch (error) {
    console.error('Get entity types error:', error);
    res.status(500).json({ detail: 'Failed to get entity types' });
  }
});

module.exports = router;
