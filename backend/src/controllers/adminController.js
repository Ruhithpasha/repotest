const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { 
  UserRepository, 
  StudentRepository, 
  StudentDocumentRepository, 
  StudentPaymentRepository,
  CommissionRepository 
} = require('../repositories');
const s3Storage = require('../utils/s3Storage');
const NotificationService = require('../services/notificationService');
const ClawbackService = require('../services/ClawbackService');
const { ClawbackRule } = require('../models/pg');

const COMMISSION_RATE = 0.04;
const COURSE_FEE = 7999;

// Generate enrollment number
const generateEnrollmentNumber = async () => {
  const year = new Date().getFullYear();
  const count = await StudentRepository.countWithEnrollmentPattern(`P4G-${year}%`);
  const paddedCount = String(count + 1).padStart(4, '0');
  return `P4G-${year}-${paddedCount}`;
};

// Create commission for rep when student is enrolled
const createCommission = async (repId, studentId, paymentId = null) => {
  const commissionAmount = COURSE_FEE * COMMISSION_RATE;
  
  const exists = await CommissionRepository.existsForStudent(studentId);
  if (exists) {
    return CommissionRepository.findByStudentId(studentId);
  }

  return CommissionRepository.createCommission({
    commission_id: `comm_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    rep_id: repId,
    student_id: studentId,
    payment_id: paymentId,
    course_fee_gbp: COURSE_FEE,
    commission_rate: COMMISSION_RATE,
    commission_amount_gbp: commissionAmount,
    status: 'pending'
  });
};

// Get Admin Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      pendingReview,
      approved,
      enrolled,
      rejected,
      pendingDocuments,
      totalRevenue
    ] = await Promise.all([
      StudentRepository.countAll(),
      StudentRepository.countAll('under_review'),
      StudentRepository.countAll(['approved', 'payment_pending']),
      StudentRepository.countAll('enrolled'),
      StudentRepository.countAll('rejected'),
      StudentDocumentRepository.countPending(),
      StudentPaymentRepository.sumAllPaid()
    ]);

    res.json({
      total_students: totalStudents,
      pending_review: pendingReview,
      approved: approved,
      enrolled: enrolled,
      rejected: rejected,
      pending_documents: pendingDocuments,
      total_revenue_gbp: totalRevenue || 0
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ detail: 'Failed to get dashboard stats' });
  }
};

// Get all applications for review
exports.getApplications = async (req, res) => {
  try {
    const { status, search } = req.query;

    const students = await StudentRepository.findAllWithStatus(status);

    const studentsWithDetails = await Promise.all(
      students.map(async (student) => {
        const user = await UserRepository.findByUserId(student.user_id);
        const rep = student.rep_id ? await UserRepository.findByUserId(student.rep_id) : null;
        const documents = await StudentDocumentRepository.findByStudentId(student.student_id);
        const pendingDocs = documents.filter(d => d.status === 'pending').length;
        const verifiedDocs = documents.filter(d => d.status === 'verified').length;
        const rejectedDocs = documents.filter(d => d.status === 'rejected').length;

        return {
          ...student.toJSON(),
          user: user ? {
            name: user.name,
            email: user.email,
            is_active: user.is_active
          } : null,
          rep: rep ? {
            name: rep.name,
            email: rep.email
          } : null,
          documents_total: documents.length,
          documents_pending: pendingDocs,
          documents_verified: verifiedDocs,
          documents_rejected: rejectedDocs
        };
      })
    );

    let result = studentsWithDetails;
    if (search) {
      const searchLower = search.toLowerCase();
      result = studentsWithDetails.filter(s =>
        s.user?.name?.toLowerCase().includes(searchLower) ||
        s.user?.email?.toLowerCase().includes(searchLower) ||
        s.student_id?.toLowerCase().includes(searchLower) ||
        s.enrollment_number?.toLowerCase().includes(searchLower)
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ detail: 'Failed to get applications' });
  }
};

// Get single application detail
exports.getApplication = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Application not found' });
    }

    const user = await UserRepository.findByUserId(student.user_id);
    const rep = student.rep_id ? await UserRepository.findByUserId(student.rep_id) : null;
    const documents = await StudentDocumentRepository.findByStudentId(studentId);
    const payments = await StudentPaymentRepository.findByStudentId(studentId);

    res.json({
      ...student.toJSON(),
      user: user ? {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_active: user.is_active,
        created_at: user.created_at
      } : null,
      rep: rep ? {
        user_id: rep.user_id,
        name: rep.name,
        email: rep.email
      } : null,
      documents,
      payments
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ detail: 'Failed to get application' });
  }
};

// Get pending documents for review
exports.getPendingDocuments = async (req, res) => {
  try {
    const documents = await StudentDocumentRepository.findPending();

    const docsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        const student = await StudentRepository.findByStudentId(doc.student_id);
        const user = student ? await UserRepository.findByUserId(student.user_id) : null;
        
        return {
          ...doc.toJSON(),
          student: student ? {
            student_id: student.student_id,
            status: student.status
          } : null,
          student_name: user?.name || 'Unknown'
        };
      })
    );

    res.json(docsWithDetails);
  } catch (error) {
    console.error('Get pending documents error:', error);
    res.status(500).json({ detail: 'Failed to get pending documents' });
  }
};

// Approve document - Auto-approves student when all required docs are verified
exports.approveDocument = async (req, res) => {
  try {
    const adminId = req.user.user_id;
    const { documentId } = req.params;

    const document = await StudentDocumentRepository.findByDocumentId(documentId);
    if (!document) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    // Update document status to verified
    await StudentDocumentRepository.updateDocument(documentId, {
      status: 'verified',
      verified_at: new Date(),
      verified_by: adminId,
      admin_comment: null
    });

    const updatedDoc = await StudentDocumentRepository.findByDocumentId(documentId);
    const studentId = document.student_id;

    // Get student and user for notifications
    const studentForNotif = await StudentRepository.findByStudentId(studentId);
    const userForNotif = studentForNotif ? await UserRepository.findByUserId(studentForNotif.user_id) : null;

    // Check if all required documents are now verified
    const requiredDocs = ['bds_degree', 'tenth_marksheet', 'twelfth_marksheet', 'passport_photo', 'id_proof'];
    const verifiedDocs = await StudentDocumentRepository.findVerifiedByTypes(studentId, requiredDocs);
    const verifiedTypes = verifiedDocs.map(d => d.doc_type);
    const allDocsVerified = requiredDocs.every(docType => verifiedTypes.includes(docType));

    // Send document approved notification
    if (userForNotif && studentForNotif) {
      NotificationService.notifyDocumentApproved(studentForNotif, userForNotif, document.doc_type, allDocsVerified)
        .catch(err => console.error('[Admin] Document notification error:', err));
    }

    let studentApproved = false;
    let credentials = null;

    // Auto-approve student if all documents are verified
    if (allDocsVerified) {
      const student = await StudentRepository.findByStudentId(studentId);
      
      // Only auto-approve if student is in review status
      if (student && ['documents_uploaded', 'under_review'].includes(student.status)) {
        const enrollmentNumber = await generateEnrollmentNumber();

        await StudentRepository.updateStatus(studentId, 'approved', {
          enrollment_number: enrollmentNumber,
          approved_at: new Date(),
          approved_by: adminId
        });

        // Activate user account
        const user = await UserRepository.findByUserId(student.user_id);
        if (user) {
          await UserRepository.updateUser(user.user_id, { is_active: true });
          
          studentApproved = true;
          credentials = {
            email: user.email,
            enrollment_number: enrollmentNumber,
            _note: 'Student account is now active. They can login with the password set by the rep during registration.'
          };

          // Send notification to student
          NotificationService.notifyApplicationApproved(student, user)
            .catch(err => console.error('[Admin] Notification error:', err));
        }
      }
    }

    res.json({
      message: studentApproved ? 'Document approved and student application auto-approved!' : 'Document approved',
      document: updatedDoc.toJSON(),
      student_auto_approved: studentApproved,
      all_documents_verified: allDocsVerified,
      credentials: credentials
    });
  } catch (error) {
    console.error('Approve document error:', error);
    res.status(500).json({ detail: 'Failed to approve document' });
  }
};

// Reject document
exports.rejectDocument = async (req, res) => {
  try {
    const adminId = req.user.user_id;
    const { documentId } = req.params;
    const { admin_comment } = req.body;

    if (!admin_comment) {
      return res.status(400).json({ detail: 'Rejection reason is required' });
    }

    const document = await StudentDocumentRepository.findByDocumentId(documentId);
    if (!document) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    await StudentDocumentRepository.updateDocument(documentId, {
      status: 'rejected',
      admin_comment,
      verified_at: new Date(),
      verified_by: adminId
    });

    const updatedDoc = await StudentDocumentRepository.findByDocumentId(documentId);

    res.json({
      message: 'Document rejected',
      document: updatedDoc.toJSON()
    });
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ detail: 'Failed to reject document' });
  }
};

// Approve application (activates student account + sends GHL booking link)
exports.approveApplication = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const user = await UserRepository.findByUserId(student.user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ghlService = require('../services/GHLService');

    // Create/update GHL contact
    let ghlContactId = null;
    try {
      ghlContactId = await ghlService.createOrUpdateContact({
        name: user.name,
        email: user.email,
        phone: user.phone,
        student_id: studentId
      });
    } catch (ghlErr) {
      console.error('[GHL] createOrUpdateContact error (non-blocking):', ghlErr.message);
    }

    // Send booking link email
    const bookingUrl = process.env.GHL_BOOKING_URL || 'https://api.leadconnectorhq.com/widget/bookings/gm-dental-academy-free-strategy-call';
    try {
      await ghlService.sendBookingEmail({
        name: user.name,
        email: user.email,
        bookingUrl
      }, ghlContactId);
    } catch (emailErr) {
      console.error('[GHL] sendBookingEmail error (non-blocking):', emailErr.message);
    }

    // Notify team
    try {
      await ghlService.sendNotificationToTeam({
        name: user.name,
        email: user.email,
        phone: user.phone,
        student_id: studentId
      }, 'application_approved');
    } catch (notifyErr) {
      console.error('[GHL] sendNotificationToTeam error (non-blocking):', notifyErr.message);
    }

    await StudentRepository.updateStatus(studentId, 'call_booking_sent', {
      ghl_contact_id: ghlContactId,
      booking_link_sent: true,
      booking_link_sent_at: new Date()
    });

    // Activate user account
    await UserRepository.updateUser(user.user_id, { is_active: true });

    const updatedStudent = await StudentRepository.findByStudentId(studentId);

    return res.json({ message: 'Application approved and booking link sent', student: updatedStudent });
  } catch (err) {
    console.error('approveApplication error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Reject application
exports.rejectApplication = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { admin_feedback } = req.body;

    if (!admin_feedback) {
      return res.status(400).json({ detail: 'Rejection reason is required' });
    }

    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    await StudentRepository.updateStatus(studentId, 'rejected', { admin_feedback });

    res.json({
      message: 'Application rejected',
      student: (await StudentRepository.findByStudentId(studentId)).toJSON()
    });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ detail: 'Failed to reject application' });
  }
};

// Get all reps
exports.getReps = async (req, res) => {
  try {
    const reps = await UserRepository.findByRole('rep');

    const repsWithStats = await Promise.all(
      reps.map(async (rep) => {
        const studentCount = await StudentRepository.countByRep(rep.user_id);
        const enrolledCount = await StudentRepository.countByRep(rep.user_id, 'enrolled');

        return {
          ...rep.toJSON(),
          total_students: studentCount,
          enrolled_students: enrolledCount
        };
      })
    );

    res.json(repsWithStats);
  } catch (error) {
    console.error('Get reps error:', error);
    res.status(500).json({ detail: 'Failed to get reps' });
  }
};

// Manual payment recording
exports.recordPayment = async (req, res) => {
  try {
    const adminId = req.user.user_id;
    const { studentId } = req.params;
    const { amount_gbp, payment_method, reference_number, notes } = req.body;

    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    if (!['approved', 'payment_pending'].includes(student.status)) {
      return res.status(400).json({ detail: 'Student must be approved before payment can be recorded' });
    }

    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const payment = await StudentPaymentRepository.createPayment({
      payment_id: paymentId,
      student_id: studentId,
      amount_gbp: parseFloat(amount_gbp),
      payment_type: 'manual',
      status: 'paid',
      payment_method: payment_method || 'bank_transfer',
      reference_number,
      notes,
      paid_at: new Date(),
      recorded_by: adminId
    });

    const totalPaid = await StudentPaymentRepository.sumPaidByStudent(studentId);
    const courseFee = 7999;
    let commissionCreated = null;

    if (totalPaid >= courseFee) {
      await StudentRepository.updateStatus(studentId, 'enrolled', {
        enrolled_at: new Date()
      });

      const CommissionService = require('../services/CommissionService');
      try {
        const freshStudent = await StudentRepository.findByStudentId(studentId);
        const commResult = await CommissionService.processPaymentCommissions(
          payment.toJSON ? payment.toJSON() : payment,
          freshStudent,
          'manual'
        );
        commissionCreated = commResult.commissions && commResult.commissions[0] || null;
      } catch (commErr) {
        console.error('[Admin] Commission creation error (non-blocking):', commErr.message);
      }
    } else {
      if (student.status === 'approved') {
        await StudentRepository.updateStatus(studentId, 'payment_pending');
      }
    }

    const updatedStudent = await StudentRepository.findByStudentId(studentId);

    res.json({
      message: 'Payment recorded successfully',
      payment: payment.toJSON(),
      total_paid: totalPaid,
      remaining: Math.max(0, courseFee - totalPaid),
      is_fully_paid: totalPaid >= courseFee,
      student_status: updatedStudent.status,
      commission: commissionCreated ? {
        commission_id: commissionCreated.commission_id,
        amount_gbp: commissionCreated.commission_amount_gbp,
        rep_id: commissionCreated.rep_id
      } : null
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ detail: 'Failed to record payment' });
  }
};

// Get all commissions (admin view)
exports.getCommissions = async (req, res) => {
  try {
    const { status, rep_id } = req.query;

    const commissions = await CommissionRepository.findAllWithFilters({ status, rep_id });

    const commissionsWithDetails = await Promise.all(
      commissions.map(async (commission) => {
        const rep = await UserRepository.findByUserId(commission.rep_id);
        const student = await StudentRepository.findByStudentId(commission.student_id);
        const studentUser = student ? await UserRepository.findByUserId(student.user_id) : null;

        return {
          ...commission.toJSON(),
          rep: rep ? { name: rep.name, email: rep.email } : null,
          student: student ? {
            enrollment_number: student.enrollment_number,
            status: student.status
          } : null,
          student_name: studentUser?.name || 'Unknown'
        };
      })
    );

    const stats = await CommissionRepository.getAllStats();

    let summary = {
      total_gbp: 0,
      pending_gbp: 0,
      approved_gbp: 0,
      paid_gbp: 0,
      total_count: 0
    };

    stats.forEach(t => {
      const total = parseFloat(t.total) || 0;
      summary.total_gbp += total;
      summary.total_count += parseInt(t.count) || 0;
      if (t.status === 'pending') summary.pending_gbp = total;
      else if (t.status === 'approved') summary.approved_gbp = total;
      else if (t.status === 'paid') summary.paid_gbp = total;
    });

    res.json({
      commissions: commissionsWithDetails,
      summary,
      commission_rate: COMMISSION_RATE * 100,
      per_student_gbp: COURSE_FEE * COMMISSION_RATE
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ detail: 'Failed to get commissions' });
  }
};

// Approve commission for payment
exports.approveCommission = async (req, res) => {
  try {
    const { commissionId } = req.params;

    const commission = await CommissionRepository.findByCommissionId(commissionId);
    if (!commission) {
      return res.status(404).json({ detail: 'Commission not found' });
    }

    if (!['pending', 'pending_validation', 'pending_approval'].includes(commission.status)) {
      return res.status(400).json({ detail: 'Commission is not in an approvable state' });
    }

    await CommissionRepository.updateStatus(commissionId, 'approved');

    res.json({
      message: 'Commission approved',
      commission: (await CommissionRepository.findByCommissionId(commissionId)).toJSON()
    });
  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({ detail: 'Failed to approve commission' });
  }
};

// Mark commission as paid
exports.markCommissionPaid = async (req, res) => {
  try {
    const adminId = req.user.user_id;
    const { commissionId } = req.params;
    const { payment_method, payment_reference, notes } = req.body;

    const commission = await CommissionRepository.findByCommissionId(commissionId);
    if (!commission) {
      return res.status(404).json({ detail: 'Commission not found' });
    }

    if (!['pending', 'approved'].includes(commission.status)) {
      return res.status(400).json({ detail: 'Commission cannot be marked as paid' });
    }

    await CommissionRepository.updateStatus(commissionId, 'paid', {
      payment_method: payment_method || 'bank_transfer',
      payment_reference,
      notes,
      paid_at: new Date(),
      paid_by: adminId
    });

    res.json({
      message: 'Commission marked as paid',
      commission: (await CommissionRepository.findByCommissionId(commissionId)).toJSON()
    });
  } catch (error) {
    console.error('Mark commission paid error:', error);
    res.status(500).json({ detail: 'Failed to mark commission as paid' });
  }
};

// Create a new rep or admin user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, bank_details } = req.body;

    if (!['rep', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ detail: 'Role must be "rep", "admin", or "super_admin"' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ detail: 'Name, email, and password are required' });
    }

    const emailExists = await UserRepository.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ detail: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const user = await UserRepository.createUser({
      user_id: userId,
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      role,
      bank_details: bank_details || null,
      created_by: req.user.user_id,
      is_active: true
    });

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: {
        user_id: userId,
        name,
        email,
        role,
        phone: phone || null,
        is_active: true,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ detail: 'Failed to create user' });
  }
};

// Get all users (reps and admins)
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const users = await UserRepository.findRepsAndAdmins(role);

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let stats = {};
        
        if (user.role === 'rep') {
          const [totalStudents, enrolledStudents, totalCommission] = await Promise.all([
            StudentRepository.countByRep(user.user_id),
            StudentRepository.countByRep(user.user_id, 'enrolled'),
            CommissionRepository.sumByRep(user.user_id)
          ]);
          
          stats = {
            total_students: totalStudents,
            enrolled_students: enrolledStudents,
            total_commission_gbp: totalCommission || 0
          };
        }

        return {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          ...stats
        };
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ detail: 'Failed to get users' });
  }
};

// Toggle user active status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await UserRepository.findByUserId(userId);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (user.user_id === req.user.user_id) {
      return res.status(400).json({ detail: 'You cannot deactivate your own account' });
    }

    await UserRepository.toggleActiveStatus(userId);
    const updatedUser = await UserRepository.findByUserId(userId);

    res.json({
      message: `User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`,
      user: {
        user_id: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        is_active: updatedUser.is_active
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ detail: 'Failed to update user status' });
  }
};

// Update user details
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, password, bank_details } = req.body;
    
    const user = await UserRepository.findByUserId(userId);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (password) updates.password = await bcrypt.hash(password, 10);
    if (bank_details !== undefined) updates.bank_details = bank_details;

    await UserRepository.updateUser(userId, updates);
    const updatedUser = await UserRepository.findByUserId(userId);

    res.json({
      message: 'User updated successfully',
      user: {
        user_id: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        is_active: updatedUser.is_active
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ detail: 'Failed to update user' });
  }
};

// Get presigned URL for secure document viewing (Admin)
exports.getDocumentViewUrl = async (req, res) => {
  try {
    const { documentId } = req.params;

    const doc = await StudentDocumentRepository.findByDocumentId(documentId);
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    if (!doc.storage_path) {
      return res.status(400).json({ detail: 'Document file not available' });
    }

    if (!s3Storage.isS3Configured()) {
      return res.status(503).json({ 
        detail: 'File storage (AWS S3) is not configured.',
        code: 'S3_NOT_CONFIGURED'
      });
    }

    const result = await s3Storage.getPresignedDownloadUrl(doc.storage_path, 3600);

    res.json({
      document_id: documentId,
      file_name: doc.file_name,
      view_url: result.downloadUrl,
      proxy_url: `/api/admin/documents/${documentId}/download`,
      expires_in: result.expiresIn
    });
  } catch (error) {
    console.error('Get document view URL error:', error);
    res.status(500).json({ detail: error.message || 'Failed to get document URL' });
  }
};

// Proxy download - streams file through backend
exports.downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const doc = await StudentDocumentRepository.findByDocumentId(documentId);
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    if (!doc.storage_path) {
      return res.status(400).json({ detail: 'Document file not available' });
    }

    if (!s3Storage.isS3Configured()) {
      return res.status(503).json({ 
        detail: 'File storage (AWS S3) is not configured.',
        code: 'S3_NOT_CONFIGURED'
      });
    }

    const fileData = await s3Storage.downloadFile(doc.storage_path);
    
    const contentType = doc.content_type || fileData.contentType || 'application/octet-stream';
    const fileName = doc.file_name || 'document';
    
    res.removeHeader('Cache-Control');
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileData.data.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    res.end(fileData.data);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ detail: error.message || 'Failed to download document' });
  }
};

// Check S3 configuration status
exports.getStorageStatus = async (req, res) => {
  try {
    const isConfigured = s3Storage.isS3Configured();
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;

    res.json({
      s3_configured: isConfigured,
      bucket: isConfigured ? bucket : null,
      region: isConfigured ? region : null,
      message: isConfigured 
        ? 'AWS S3 is configured and ready for file uploads' 
        : 'AWS S3 credentials not configured.'
    });
  } catch (error) {
    console.error('Get storage status error:', error);
    res.status(500).json({ detail: 'Failed to check storage status' });
  }
};

// Qualify student (mark as passed or failed - can be called from interview_completed, call_booking_sent, or call_booked status)
exports.qualifyStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { qualification_status, qualification_notes } = req.body;
    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // If already qualified, return success (idempotent)
    if (student.status === 'qualified') {
      return res.json({ 
        message: 'Student is already qualified', 
        student,
        already_qualified: true 
      });
    }

    // If already rejected, return error
    if (student.status === 'rejected') {
      return res.status(400).json({ 
        message: 'Student was previously rejected and cannot be qualified' 
      });
    }

    // Allow qualification from these statuses (including manual qualification when booking is sent)
    const allowedStatuses = ['interview_completed', 'call_booking_sent', 'call_booked', 'approved'];
    if (!allowedStatuses.includes(student.status)) {
      return res.status(400).json({ 
        message: `Cannot qualify student. Current status: ${student.status}. Student must be in one of these statuses: ${allowedStatuses.join(', ')}` 
      });
    }

    const user = await UserRepository.findByUserId(student.user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newStatus = qualification_status === 'passed' ? 'qualified' : 'rejected';
    await StudentRepository.updateStatus(studentId, newStatus, {
      qualification_status,
      qualification_notes,
      qualified_at: new Date(),
      qualified_by: req.user.id || req.user.user_id
    });

    const ghlService = require('../services/GHLService');
    await ghlService.sendQualificationEmail({
      contactId: student.ghl_contact_id,
      email: user.email,
      firstName: user.first_name || user.name?.split(' ')[0],
      result: qualification_status,
      paymentUrl: qualification_status === 'passed' ? process.env.PAYMENT_URL : null
    }, qualification_status === 'passed', qualification_notes);

    const updatedStudent = await StudentRepository.findByStudentId(studentId);

    return res.json({ message: `Student marked as ${qualification_status}`, student: updatedStudent });
  } catch (err) {
    console.error('qualifyStudent error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Mark interview as completed (manual trigger when GHL webhook doesn't fire)
exports.markInterviewCompleted = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (student.status !== 'call_booked') {
      return res.status(400).json({ message: `Cannot mark interview completed. Current status: ${student.status}` });
    }

    await StudentRepository.updateStatus(studentId, 'interview_completed', {
      call_completed_at: new Date(),
      interview_marked_by: req.user.id || req.user.user_id
    });

    const updatedStudent = await StudentRepository.findByStudentId(studentId);
    return res.json({ message: 'Interview marked as completed', student: updatedStudent });
  } catch (err) {
    console.error('markInterviewCompleted error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── CLAWBACK RULES ────────────────────────────────────────────────────────

exports.getClawbackRules = async (req, res) => {
  try {
    const rules = await ClawbackRule.findAll({
      order: [['created_at', 'DESC']]
    });
    return res.json({ rules });
  } catch (err) {
    console.error('getClawbackRules error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createClawbackRule = async (req, res) => {
  try {
    const { name, clawback_window_days, clawback_percentage } = req.body;

    if (!name || !clawback_window_days || clawback_percentage === undefined) {
      return res.status(400).json({
        error: 'name, clawback_window_days, and clawback_percentage are required'
      });
    }

    if (parseFloat(clawback_percentage) < 0 || parseFloat(clawback_percentage) > 100) {
      return res.status(400).json({ error: 'clawback_percentage must be between 0 and 100' });
    }

    const rule = await ClawbackRule.create({
      name: name.trim(),
      clawback_window_days: parseInt(clawback_window_days),
      clawback_percentage: parseFloat(clawback_percentage),
      is_active: true,
      created_by: req.user.user_id
    });

    return res.status(201).json({ message: 'Clawback rule created', rule });
  } catch (err) {
    console.error('createClawbackRule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateClawbackRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, clawback_window_days, clawback_percentage, is_active } = req.body;

    const rule = await ClawbackRule.findByPk(id);
    if (!rule) return res.status(404).json({ error: 'Clawback rule not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (clawback_window_days !== undefined) updates.clawback_window_days = parseInt(clawback_window_days);
    if (clawback_percentage !== undefined) updates.clawback_percentage = parseFloat(clawback_percentage);
    if (is_active !== undefined) updates.is_active = is_active;

    await rule.update(updates);

    return res.json({ message: 'Clawback rule updated', rule });
  } catch (err) {
    console.error('updateClawbackRule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteClawbackRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await ClawbackRule.findByPk(id);
    if (!rule) return res.status(404).json({ error: 'Clawback rule not found' });

    // Soft delete — deactivate rather than destroy
    await rule.update({ is_active: false });

    return res.json({ message: 'Clawback rule deactivated' });
  } catch (err) {
    console.error('deleteClawbackRule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.triggerClawback = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;

    const { Student, AuditLog } = require('../models/pg');
    const student = await Student.findOne({ where: { student_id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const eligibleStatuses = ['enrolled', 'paid_in_full', 'commission_earned', 'commission_released'];
    if (!eligibleStatuses.includes(student.status)) {
      return res.status(400).json({
        error: `Clawback can only be triggered for enrolled or paid students. Current status: ${student.status}`
      });
    }

    const result = await ClawbackService.processClawback(
      studentId,
      reason || 'Admin triggered clawback'
    );

    await student.update({ status: 'clawback_required' });

    // Create audit log with correct field names
    const { v4: uuidv4 } = require('uuid');
    await AuditLog.create({
      log_id: uuidv4(),
      user_id: req.user.user_id,
      action_type: 'commission_reversed',
      object_type: 'student',
      object_id: studentId,
      description: JSON.stringify({
        event: 'clawback_triggered',
        reason: reason || 'Admin triggered clawback',
        commissions_affected: result.clawed_back,
        total_clawback_amount: result.total_clawback_amount,
        rule_applied: result.rule_applied
      })
    });

    return res.json({
      message: 'Clawback processed successfully',
      result
    });
  } catch (err) {
    console.error('triggerClawback error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = exports;
