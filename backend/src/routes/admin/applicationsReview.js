/**
 * Admin Applications Review Routes
 * Super Admin can review student applications and documents (both self-registered and rep-created)
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const { Student, User, StudentDocument } = require('../../models/pg');
const { Op, fn, col } = require('sequelize');

// All routes require auth + admin role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
});

/**
 * GET /api/admin/applications-review
 * Get all students for review (both self-registered and rep-created)
 */
router.get('/applications-review', async (req, res) => {
  try {
    const { source } = req.query; // 'self', 'rep', or undefined for all
    
    const whereClause = {};
    if (source === 'self') {
      whereClause.registration_source = 'self';
    } else if (source === 'rep') {
      whereClause.rep_id = { [Op.ne]: null };
    }
    
    const students = await Student.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['email', 'name', 'phone'] },
        { model: User, as: 'rep', attributes: ['name', 'email'] }
      ],
      order: [
        ['status', 'ASC'], // under_review first
        ['created_at', 'DESC']
      ]
    });

    // Get document counts for each student
    const result = await Promise.all(students.map(async (s) => {
      const docCounts = await StudentDocument.findAll({
        where: { student_id: s.student_id },
        attributes: [
          'status',
          [fn('COUNT', col('document_id')), 'count']
        ],
        group: ['status'],
        raw: true
      });
      
      const docStats = {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0
      };
      
      docCounts.forEach(d => {
        const count = parseInt(d.count) || 0;
        docStats.total += count;
        if (d.status === 'pending' || d.status === 'uploaded') docStats.pending += count;
        else if (d.status === 'verified') docStats.verified += count;
        else if (d.status === 'rejected') docStats.rejected += count;
      });

      return {
        student_id: s.student_id,
        name: s.user?.name || s.first_name || 'Unknown',
        email: s.user?.email || s.email || '',
        phone: s.user?.phone || s.whatsapp_number || s.phone,
        status: s.status,
        registration_source: s.rep_id ? 'rep' : 'self',
        rep_name: s.rep?.name || null,
        rep_email: s.rep?.email || null,
        created_at: s.created_at,
        documents_total: docStats.total,
        documents_pending: docStats.pending,
        documents_verified: docStats.verified,
        documents_rejected: docStats.rejected
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get applications review error:', error);
    res.status(500).json({ detail: 'Failed to get applications' });
  }
});

/**
 * GET /api/admin/students/:studentId/documents
 * Get all documents for a specific student
 */
router.get('/students/:studentId/documents', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const documents = await StudentDocument.findAll({
      where: { student_id: studentId },
      order: [['uploaded_at', 'DESC']]
    });

    res.json(documents);
  } catch (error) {
    console.error('Get student documents error:', error);
    res.status(500).json({ detail: 'Failed to get documents' });
  }
});

/**
 * PATCH /api/admin/documents/:documentId/verify
 * Verify a document
 */
router.patch('/documents/:documentId/verify', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await StudentDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    await document.update({
      status: 'verified',
      verified_by: req.user.user_id,
      verified_at: new Date(),
      admin_comment: null
    });

    res.json({ message: 'Document verified', document: document.toJSON() });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ detail: 'Failed to verify document' });
  }
});

/**
 * PATCH /api/admin/documents/:documentId/reject
 * Reject a document with reason
 */
router.patch('/documents/:documentId/reject', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { reason } = req.body;
    
    const document = await StudentDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    await document.update({
      status: 'rejected',
      admin_comment: reason || 'Document rejected',
      verified_by: req.user.user_id,
      verified_at: new Date()
    });

    res.json({ message: 'Document rejected', document: document.toJSON() });
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ detail: 'Failed to reject document' });
  }
});

/**
 * PATCH /api/admin/applications/:studentId/approve
 * Approve application - student can now proceed to payment
 */
router.patch('/applications/:studentId/approve', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findByPk(studentId, { include: [{ model: User, as: 'user' }] });
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Allow this action for students in documents_uploaded, under_review, or approved status
    const allowedStatuses = ['documents_uploaded', 'under_review', 'approved'];
    if (!allowedStatuses.includes(student.status)) {
      return res.status(400).json({ 
        detail: `Cannot approve - student status is ${student.status}. Must be: ${allowedStatuses.join(', ')}`
      });
    }

    // Only check documents for non-approved students
    if (student.status !== 'approved') {
      const documents = await StudentDocument.findAll({
        where: { student_id: studentId }
      });

      const unverifiedDocs = documents.filter(d => d.status !== 'verified');
      if (unverifiedDocs.length > 0) {
        return res.status(400).json({ 
          detail: 'Cannot approve - some documents are not verified',
          unverified_count: unverifiedDocs.length
        });
      }
    }

    const ghlService = require('../../services/GHLService');

    // Create/update GHL contact (non-blocking)
    let ghlContactId = null;
    try {
      ghlContactId = await ghlService.createOrUpdateContact({
        name: student.user?.name,
        email: student.user?.email,
        phone: student.phone,
        student_id: studentId
      });
    } catch (ghlErr) {
      console.error('[GHL] createOrUpdateContact error (non-blocking):', ghlErr.message);
    }

    // Send booking link email (non-blocking)
    const bookingUrl = process.env.GHL_BOOKING_URL || 'https://api.leadconnectorhq.com/widget/bookings/gm-dental-academy-free-strategy-call';
    try {
      await ghlService.sendBookingEmail({
        name: student.user?.name,
        email: student.user?.email,
        bookingUrl
      }, ghlContactId);
    } catch (emailErr) {
      console.error('[GHL] sendBookingEmail error (non-blocking):', emailErr.message);
    }

    // Notify team (non-blocking)
    try {
      await ghlService.sendNotificationToTeam({
        name: student.user?.name,
        email: student.user?.email,
        phone: student.phone,
        student_id: studentId
      }, 'application_approved');
    } catch (notifyErr) {
      console.error('[GHL] sendNotificationToTeam error (non-blocking):', notifyErr.message);
    }

    await student.update({ 
      status: 'call_booking_sent',
      ghl_contact_id: ghlContactId,
      booking_link_sent: true,
      booking_link_sent_at: new Date()
    });

    // Activate user account
    if (student.user) {
      await student.user.update({ is_active: true });
    }

    res.json({ message: 'Application approved and booking link sent', student: student.toJSON() });
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ detail: 'Failed to approve application' });
  }
});

/**
 * PATCH /api/admin/applications/:studentId/reject
 * Reject application with reason
 */
router.patch('/applications/:studentId/reject', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;
    
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    await student.update({ 
      status: 'rejected'
      // Could add a rejection_reason field to store this
    });

    // TODO: Send notification to student with rejection reason
    console.log(`[MOCKED] Notification sent to student ${studentId} - Application rejected: ${reason}`);

    res.json({ message: 'Application rejected', student: student.toJSON() });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ detail: 'Failed to reject application' });
  }
});

module.exports = router;
