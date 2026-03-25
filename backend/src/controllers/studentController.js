const { v4: uuidv4 } = require('uuid');
const { 
  UserRepository, 
  StudentRepository,
  StudentPaymentRepository
} = require('../repositories');

// Get current student profile
exports.getMyProfile = async (req, res) => {
  try {
    const student = await StudentRepository.findByUserId(req.user.user_id);
    if (!student) {
      return res.status(404).json({ detail: 'Student profile not found' });
    }

    res.json({
      ...student.toJSON(),
      user: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ detail: 'Failed to get profile' });
  }
};

// Get students (for rep - only their students, for admin - all)
exports.getStudents = async (req, res) => {
  try {
    let students;
    
    if (req.user.role === 'rep') {
      students = await StudentRepository.findByRepId(req.user.user_id);
    } else if (req.user.role === 'admin') {
      students = await StudentRepository.findAllWithStatus();
    } else {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Enrich with user details
    const enrichedStudents = await Promise.all(
      students.map(async (s) => {
        const user = await UserRepository.findByUserId(s.user_id);
        return {
          ...s.toJSON(),
          user: user ? {
            name: user.name,
            email: user.email
          } : null
        };
      })
    );

    res.json(enrichedStudents);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ detail: 'Failed to get students' });
  }
};

// Get student by ID
exports.getStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Check access
    if (req.user.role === 'rep' && student.rep_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }
    if (req.user.role === 'student' && student.user_id !== req.user.user_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const user = await UserRepository.findByUserId(student.user_id);

    res.json({
      ...student.toJSON(),
      user: user ? {
        name: user.name,
        email: user.email,
        phone: user.phone
      } : null
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ detail: 'Failed to get student' });
  }
};

// Update student status (admin only)
exports.updateStudentStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const { studentId } = req.params;
    const { status, admin_feedback, enrollment_number } = req.body;

    const student = await StudentRepository.findByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    const updateData = { status };
    if (admin_feedback) updateData.admin_feedback = admin_feedback;
    if (enrollment_number) updateData.enrollment_number = enrollment_number;

    await StudentRepository.updateStatus(studentId, status, updateData);
    const updatedStudent = await StudentRepository.findByStudentId(studentId);

    res.json({ message: 'Status updated', student: updatedStudent.toJSON() });
  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({ detail: 'Failed to update status' });
  }
};

// Get dashboard stats (admin)
exports.getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const [
      totalStudents,
      enrolled,
      pendingReview,
      pendingPayment,
      documentsPending,
      totalRevenue
    ] = await Promise.all([
      StudentRepository.countAll(),
      StudentRepository.countAll('enrolled'),
      StudentRepository.countAll('under_review'),
      StudentRepository.countAll(['approved', 'payment_pending']),
      StudentRepository.countAll(['registered', 'documents_uploaded']),
      StudentPaymentRepository.sumAllPaid()
    ]);

    res.json({
      total_students: totalStudents,
      enrolled,
      pending_review: pendingReview,
      pending_payment: pendingPayment,
      documents_pending: documentsPending,
      total_revenue_gbp: totalRevenue || 0
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ detail: 'Failed to get stats' });
  }
};

// Get rep stats
exports.getRepStats = async (req, res) => {
  try {
    if (req.user.role !== 'rep') {
      return res.status(403).json({ detail: 'Rep access required' });
    }

    const repId = req.user.user_id;
    
    const [
      totalStudents,
      enrolled,
      pending,
      awaitingPayment
    ] = await Promise.all([
      StudentRepository.countByRep(repId),
      StudentRepository.countByRep(repId, 'enrolled'),
      StudentRepository.countByRep(repId, ['registered', 'documents_uploaded', 'under_review']),
      StudentRepository.countByRep(repId, ['approved', 'payment_pending'])
    ]);

    res.json({
      total_students: totalStudents,
      enrolled,
      pending,
      awaiting_payment: awaitingPayment
    });
  } catch (error) {
    console.error('Get rep stats error:', error);
    res.status(500).json({ detail: 'Failed to get stats' });
  }
};

// Export students as CSV (admin)
exports.exportStudents = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const students = await StudentRepository.findAllWithStatus();

    const csvData = await Promise.all(
      students.map(async (s) => {
        const user = await UserRepository.findByUserId(s.user_id);
        return {
          name: user?.name || '',
          email: user?.email || '',
          whatsapp: s.whatsapp_number || '',
          city: s.city || '',
          state: s.state || '',
          dental_reg: s.dental_reg_number || '',
          experience: s.experience_years || '',
          status: s.status,
          enrollment_number: s.enrollment_number || '',
          registered_at: s.created_at
        };
      })
    );

    res.json(csvData);
  } catch (error) {
    console.error('Export students error:', error);
    res.status(500).json({ detail: 'Failed to export students' });
  }
};

// Register student - handled by rep controller
exports.registerStudent = async (req, res) => {
  res.status(400).json({ detail: 'Use /api/rep/students endpoint to register students' });
};

module.exports = exports;
