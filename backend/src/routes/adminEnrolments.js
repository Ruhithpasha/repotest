/**
 * Enrolment Timeline & Admin Routes
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { Student, User, Commission, AuditLog, StudentPayment, Program, FraudAlert } = require('../models/pg');
const { Op } = require('sequelize');

router.use(authMiddleware);

// Admin only guard
const adminOnly = (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/admin/enrolments
 * List all enrolments (students) with filters
 */
router.get('/', adminOnly, async (req, res) => {
  try {
    const { status, program_id, rep_id, search, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (program_id) where.program_id = program_id;
    if (rep_id) where.rep_id = rep_id;
    if (search) {
      where[Op.or] = [
        { enrollment_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const students = await Student.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Enrich with user, rep, programme data
    const enriched = await Promise.all(students.map(async (s) => {
      const user = await User.findByPk(s.user_id, { attributes: ['name', 'email'] });
      const rep = s.rep_id ? await User.findByPk(s.rep_id, { attributes: ['name', 'manager_id'] }) : null;
      const manager = rep?.manager_id ? await User.findByPk(rep.manager_id, { attributes: ['name'] }) : null;
      const programme = s.program_id ? await Program.findByPk(s.program_id, { attributes: ['name', 'price_gbp', 'currency'] }) : null;
      
      // Get payment total
      const payments = await StudentPayment.findAll({ 
        where: { student_id: s.student_id },
        attributes: ['amount_gbp', 'status']
      });
      const totalPaid = payments
        .filter(p => p.status === 'successful')
        .reduce((sum, p) => sum + parseFloat(p.amount_gbp || 0), 0);

      return {
        ...s.toJSON(),
        student_name: user?.name || 'Unknown',
        student_email: user?.email,
        rep_name: rep?.name || null,
        manager_name: manager?.name || null,
        programme_name: programme?.name || null,
        programme_fee: programme?.price_gbp || null,
        currency: programme?.currency || 'GBP',
        total_paid: totalPaid
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Get enrolments error:', error);
    res.status(500).json({ detail: 'Failed to get enrolments' });
  }
});

/**
 * GET /api/admin/enrolments/:enrolmentId/timeline
 * Get chronological timeline for an enrolment
 */
router.get('/:enrolmentId/timeline', adminOnly, async (req, res) => {
  try {
    const { enrolmentId } = req.params;

    // Get student
    const student = await Student.findByPk(enrolmentId);
    if (!student) {
      return res.status(404).json({ detail: 'Enrolment not found' });
    }

    // Get user, rep, programme info
    const user = await User.findByPk(student.user_id, { attributes: ['name', 'email'] });
    const rep = student.rep_id ? await User.findByPk(student.rep_id, { attributes: ['name'] }) : null;
    const programme = student.program_id ? await Program.findByPk(student.program_id, { attributes: ['name'] }) : null;

    // Collect events
    const events = [];

    // 1. Student creation event
    events.push({
      timestamp: student.created_at,
      event_type: 'enrolment_created',
      title: 'Enrolment Created',
      description: `Student enrolled in ${programme?.name || 'programme'}`,
      actor: rep?.name || 'System',
      metadata: { enrollment_number: student.enrollment_number }
    });

    // 2. Audit logs related to this enrolment
    const auditLogs = await AuditLog.findAll({
      where: {
        [Op.or]: [
          { object_id: enrolmentId },
          { object_id: student.user_id }
        ]
      },
      order: [['created_at', 'ASC']]
    });

    for (const log of auditLogs) {
      let title = log.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let description = '';
      
      switch(log.action_type) {
        case 'lead_created':
          title = 'Lead Created';
          description = 'Lead entered the pipeline';
          break;
        case 'lead_converted':
          title = 'Lead Converted';
          description = 'Lead converted to enrolment';
          break;
        case 'commission_created':
          title = 'Commission Created';
          const commData = log.new_value ? JSON.parse(log.new_value) : {};
          description = `Commission created: £${commData.amount || 0}`;
          break;
        case 'commission_override_approved':
          title = 'Override Approved';
          description = 'Commission override request approved';
          break;
        case 'commission_override_rejected':
          title = 'Override Rejected';
          description = 'Commission override request rejected';
          break;
      }

      const actor = log.user_id ? await User.findByPk(log.user_id, { attributes: ['name'] }) : null;

      events.push({
        timestamp: log.created_at,
        event_type: log.action_type,
        title,
        description,
        actor: actor?.name || 'System',
        metadata: log.new_value ? JSON.parse(log.new_value) : {}
      });
    }

    // 3. Payments
    const payments = await StudentPayment.findAll({
      where: { student_id: enrolmentId },
      order: [['created_at', 'ASC']]
    });

    for (const payment of payments) {
      events.push({
        timestamp: payment.created_at,
        event_type: 'payment_received',
        title: `Payment ${payment.status === 'successful' ? 'Received' : payment.status}`,
        description: `£${parseFloat(payment.amount_gbp || 0).toFixed(2)} via ${payment.gateway || 'unknown'} (${payment.payment_type || 'full'})`,
        actor: 'System',
        metadata: {
          amount: payment.amount_gbp,
          gateway: payment.gateway,
          payment_type: payment.payment_type,
          gateway_payment_id: payment.gateway_payment_id
        }
      });
    }

    // 4. Commissions created for this student
    const commissions = await Commission.findAll({
      where: { student_id: enrolmentId },
      order: [['created_at', 'ASC']]
    });

    for (const comm of commissions) {
      const beneficiary = await User.findByPk(comm.rep_id, { attributes: ['name'] });
      events.push({
        timestamp: comm.created_at,
        event_type: 'commission_generated',
        title: 'Commission Generated',
        description: `£${parseFloat(comm.commission_amount_gbp || 0).toFixed(2)} for ${beneficiary?.name || 'Unknown'} (${comm.role_type || 'rep'})`,
        actor: 'System',
        metadata: {
          commission_id: comm.commission_id,
          amount: comm.commission_amount_gbp,
          beneficiary: beneficiary?.name,
          role_type: comm.role_type,
          status: comm.status
        }
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate payment totals
    const totalPaid = payments
      .filter(p => p.status === 'successful')
      .reduce((sum, p) => sum + parseFloat(p.amount_gbp || 0), 0);

    res.json({
      enrolment: {
        student_id: student.student_id,
        student_name: user?.name,
        student_email: user?.email,
        rep_name: rep?.name,
        programme_name: programme?.name,
        enrollment_number: student.enrollment_number,
        status: student.status,
        enrolled_at: student.enrolled_at,
        total_paid: totalPaid
      },
      timeline: events
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ detail: 'Failed to get timeline' });
  }
});

module.exports = router;
