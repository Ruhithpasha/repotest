const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const authMiddleware = require('../middleware/auth');
const { Lead, Student, User, Program } = require('../models/pg');
const { v4: uuidv4 } = require('uuid');
const AuditLogger = require('../services/auditLogger');

// All routes require authentication
router.use(authMiddleware);

// Get lead statistics
router.get('/stats', leadController.getStats);

// Get my leads (for sales users)
router.get('/my-leads', leadController.getMyLeads);

// Get all leads with filters
router.get('/', leadController.getLeads);

// Get lead by ID
router.get('/:leadId', leadController.getLead);

// Create new lead
router.post('/', leadController.createLead);

// Update lead
router.patch('/:leadId', leadController.updateLead);

// Update lead status
router.patch('/:leadId/status', leadController.updateStatus);

// Assign lead to sales user
router.patch('/:leadId/assign', (req, res, next) => {
  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  next();
}, leadController.assignLead);

/**
 * Convert lead to enrolment
 * POST /api/leads/:leadId/convert
 */
router.post('/:leadId/convert', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { program_id, course_fee } = req.body;

    if (!program_id) {
      return res.status(400).json({ detail: 'programme_id is required' });
    }

    // Validate lead exists
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      return res.status(404).json({ detail: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_user' && lead.assigned_to !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Check if already converted
    if (lead.converted_to_student_id) {
      return res.status(400).json({ detail: 'Lead already converted to enrolment' });
    }

    // Validate programme exists
    const programme = await Program.findByPk(program_id);
    if (!programme) {
      return res.status(404).json({ detail: 'Programme not found' });
    }

    // Check if user already exists for this email
    let user = await User.findOne({ where: { email: lead.email } });
    
    if (!user) {
      // Create user for the student
      const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      user = await User.create({
        user_id: userId,
        email: lead.email,
        name: lead.name,
        role: 'student',
        is_active: true
      });
    }

    // Create student record
    const studentId = `stu_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const enrollmentNumber = `P4G-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    // Determine registration source based on who is creating
    const registrationSource = req.user.role === 'manager' ? 'manager' : 'rep';
    
    const student = await Student.create({
      student_id: studentId,
      user_id: user.user_id,
      email: email,
      name: name,
      rep_id: lead.assigned_to || req.user.user_id,
      program_id: program_id,
      whatsapp_number: lead.whatsapp || lead.phone,
      city: lead.city,
      state: lead.state,
      dob: null,
      dental_reg_number: null,
      experience_years: lead.experience_years,
      course_id: programme.program_id,
      status: 'enrolled',
      enrollment_number: enrollmentNumber,
      enrolled_at: new Date(),
      referred_by: lead.referred_by,
      referral_code_used: lead.referral_code,
      application_token: null, // Rep/manager registered - no self-upload
      registration_source: registrationSource
    });

    // Mark lead as converted
    await lead.update({
      converted_to_student_id: studentId,
      converted_at: new Date(),
      status: 'enrolled'
    });

    // Log audit
    await AuditLogger.log(req.user.user_id, 'lead_converted', 'lead', leadId, null, {
      student_id: studentId,
      program_id: program_id,
      enrollment_number: enrollmentNumber
    });

    res.json({
      message: 'Lead converted to enrolment successfully',
      student: {
        student_id: studentId,
        enrollment_number: enrollmentNumber,
        program_id: program_id,
        programme_name: programme.name
      },
      lead: lead.toJSON()
      // No application_token - rep/manager handles documents via CRM
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ detail: 'Failed to convert lead' });
  }
});

module.exports = router;
