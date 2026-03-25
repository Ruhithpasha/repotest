/**
 * Fraud Alerts Routes
 * Super Admin only - review and manage fraud alerts/flags
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const { FraudAlert, User, Commission } = require('../models/pg');
const { Op, fn, col } = require('sequelize');

// All routes require auth + super_admin role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Super Admin access required' });
  }
  next();
});

/**
 * GET /api/fraud-alerts/open-count - Get count of open flags for sidebar badge
 */
router.get('/open-count', async (req, res) => {
  try {
    const count = await FraudAlert.count({ 
      where: { status: { [Op.in]: ['open', 'reviewing'] } }
    });
    res.json({ count });
  } catch (error) {
    console.error('Get open count error:', error);
    res.status(500).json({ detail: 'Failed to get count' });
  }
});

/**
 * GET /api/fraud-alerts - List all fraud alerts
 */
router.get('/', async (req, res) => {
  try {
    const { status, type, severity, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (type) where.flag_type = type;
    if (severity) where.severity = severity;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows } = await FraudAlert.findAndCountAll({
      where,
      include: [{ model: User, as: 'related_user', attributes: ['user_id', 'name', 'email', 'role'] }],
      order: [
        ['status', 'ASC'], // open first
        ['severity', 'DESC'], // high first
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset
    });

    res.json({
      alerts: rows,
      total: count,
      page: parseInt(page),
      total_pages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get fraud alerts error:', error);
    res.status(500).json({ detail: 'Failed to get fraud alerts' });
  }
});

/**
 * GET /api/fraud-alerts/summary - Alert statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const openCount = await FraudAlert.count({ where: { status: { [Op.in]: ['open', 'reviewing'] } } });
    const reviewingCount = await FraudAlert.count({ where: { status: 'reviewing' } });
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const clearedThisMonth = await FraudAlert.count({ 
      where: { 
        status: { [Op.in]: ['cleared', 'resolved'] },
        reviewed_at: { [Op.gte]: startOfMonth }
      } 
    });
    
    const totalCount = await FraudAlert.count();
    
    // Count by severity
    const bySeverity = await FraudAlert.findAll({
      where: { status: { [Op.in]: ['open', 'reviewing'] } },
      attributes: [
        'severity',
        [fn('COUNT', col('alert_id')), 'count']
      ],
      group: ['severity'],
      raw: true
    });

    // Count by type
    const byType = await FraudAlert.findAll({
      where: { status: { [Op.in]: ['open', 'reviewing'] } },
      attributes: [
        'flag_type',
        [fn('COUNT', col('alert_id')), 'count']
      ],
      group: ['flag_type'],
      raw: true
    });

    res.json({
      open_count: openCount,
      reviewing_count: reviewingCount,
      cleared_this_month: clearedThisMonth,
      resolved_this_month: clearedThisMonth, // alias
      total_count: totalCount,
      by_severity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = parseInt(item.count);
        return acc;
      }, {}),
      by_type: byType.reduce((acc, item) => {
        acc[item.flag_type] = parseInt(item.count);
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get fraud summary error:', error);
    res.status(500).json({ detail: 'Failed to get summary' });
  }
});

/**
 * GET /api/fraud-alerts/:id - Get single alert detail
 */
router.get('/:id', async (req, res) => {
  try {
    const alert = await FraudAlert.findByPk(req.params.id, {
      include: [{ model: User, as: 'related_user', attributes: ['user_id', 'name', 'email', 'role', 'created_at'] }]
    });

    if (!alert) {
      return res.status(404).json({ detail: 'Alert not found' });
    }

    // Get related record details if applicable
    let relatedRecord = null;
    if (alert.related_type === 'commission' && alert.related_id) {
      relatedRecord = await Commission.findByPk(alert.related_id);
    }

    res.json({
      ...alert.toJSON(),
      related_record: relatedRecord
    });
  } catch (error) {
    console.error('Get fraud alert error:', error);
    res.status(500).json({ detail: 'Failed to get alert' });
  }
});

/**
 * PATCH /api/fraud-alerts/:id - Update fraud flag status
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status, review_note } = req.body;
    
    const alert = await FraudAlert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ detail: 'Alert not found' });
    }

    const updateData = {};
    
    if (status) {
      updateData.status = status;
      
      // If marking as cleared/resolved, record review details
      if (['cleared', 'resolved'].includes(status)) {
        updateData.reviewed_by_user_id = req.user.user_id;
        updateData.reviewed_at = new Date();
        updateData.is_blocking = false; // Release the hold
        
        // If this flag was blocking a commission, update commission status
        if (alert.is_blocking && alert.related_type === 'commission' && alert.related_id) {
          // The commission can now proceed - but we don't auto-advance it
          // Admin should manually approve if needed
        }
      }
      
      // If marking as reviewing, set as blocking for high severity
      if (status === 'reviewing' && alert.severity === 'high') {
        updateData.is_blocking = true;
      }
    }
    
    if (review_note) {
      updateData.review_note = review_note;
    }

    await alert.update(updateData);

    res.json({ 
      message: `Flag status updated to ${status}`, 
      alert: alert.toJSON() 
    });
  } catch (error) {
    console.error('Update fraud alert error:', error);
    res.status(500).json({ detail: 'Failed to update alert' });
  }
});

/**
 * PATCH /api/fraud-alerts/:id/resolve - Resolve alert (legacy endpoint)
 */
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { resolution_note } = req.body;
    
    if (!resolution_note) {
      return res.status(400).json({ detail: 'Resolution note is required' });
    }

    const alert = await FraudAlert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ detail: 'Alert not found' });
    }

    await alert.update({
      status: 'cleared',
      review_note: resolution_note,
      reviewed_by_user_id: req.user.user_id,
      reviewed_at: new Date(),
      is_blocking: false
    });

    res.json({ message: 'Alert resolved', alert: alert.toJSON() });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ detail: 'Failed to resolve alert' });
  }
});

/**
 * PATCH /api/fraud-alerts/:id/dismiss - Dismiss alert
 */
router.patch('/:id/dismiss', async (req, res) => {
  try {
    const alert = await FraudAlert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ detail: 'Alert not found' });
    }

    await alert.update({
      status: 'dismissed',
      reviewed_by_user_id: req.user.user_id,
      reviewed_at: new Date(),
      is_blocking: false
    });

    res.json({ message: 'Alert dismissed' });
  } catch (error) {
    console.error('Dismiss alert error:', error);
    res.status(500).json({ detail: 'Failed to dismiss alert' });
  }
});

/**
 * PATCH /api/fraud-alerts/:id/escalate - Mark as under review
 */
router.patch('/:id/escalate', async (req, res) => {
  try {
    const alert = await FraudAlert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ detail: 'Alert not found' });
    }

    // High severity flags should block the related record
    const isBlocking = alert.severity === 'high';

    await alert.update({ 
      status: 'reviewing',
      is_blocking: isBlocking
    });

    res.json({ message: 'Alert escalated to reviewing' });
  } catch (error) {
    console.error('Escalate alert error:', error);
    res.status(500).json({ detail: 'Failed to escalate alert' });
  }
});

/**
 * POST /api/fraud-alerts/:id/ban-user - Ban the related user
 */
router.post('/:id/ban-user', async (req, res) => {
  try {
    const alert = await FraudAlert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ detail: 'Alert not found' });
    }

    if (!alert.related_user_id) {
      return res.status(400).json({ detail: 'No user associated with this alert' });
    }

    await User.update(
      { is_active: false },
      { where: { user_id: alert.related_user_id } }
    );

    await alert.update({
      status: 'cleared',
      review_note: `User banned by ${req.user.name}`,
      reviewed_by_user_id: req.user.user_id,
      reviewed_at: new Date(),
      is_blocking: false
    });

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ detail: 'Failed to ban user' });
  }
});

/**
 * POST /api/fraud-alerts - Create a fraud alert (internal/system use)
 */
router.post('/', async (req, res) => {
  try {
    const { 
      flag_type, alert_type, severity, related_user_id, 
      flag_reason, description, related_type, related_id,
      related_entity_type, related_entity_ids, metadata 
    } = req.body;

    // Support both old and new field names
    const finalFlagType = flag_type || alert_type;
    const finalFlagReason = flag_reason || description;
    const finalRelatedType = related_type || related_entity_type;
    const finalRelatedId = related_id || (related_entity_ids && related_entity_ids[0]);

    // High severity flags should be blocking by default
    const isBlocking = severity === 'high';

    const alert = await FraudAlert.create({
      alert_id: `fra_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      flag_type: finalFlagType,
      severity: severity || 'medium',
      related_user_id,
      flag_reason: finalFlagReason,
      related_type: finalRelatedType,
      related_id: finalRelatedId,
      metadata: metadata || {},
      is_blocking: isBlocking
    });

    res.status(201).json(alert);
  } catch (error) {
    console.error('Create fraud alert error:', error);
    res.status(500).json({ detail: 'Failed to create alert' });
  }
});

module.exports = router;
