const { v4: uuidv4 } = require('uuid');
const { Student, User } = require('../models/pg');

// Submit application - creates Student record directly in PostgreSQL
exports.submitApplication = async (req, res) => {
  try {
    const { name, email, phone, qualification, experience_years, dental_registration, message } = req.body;

    // Check if user already exists
    let user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Create user for the applicant
      const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      user = await User.create({
        user_id: userId,
        email,
        name,
        role: 'student',
        is_active: true
      });
    }

    // Check if student already exists
    let student = await Student.findOne({ where: { user_id: user.user_id } });
    
    if (student) {
      // Return existing token if student already exists
      return res.json({ 
        message: 'Application already exists', 
        student_id: student.student_id,
        application_token: student.application_token,
        upload_url: student.application_token ? `/apply/documents?token=${student.application_token}` : null
      });
    }

    // Create student record for direct applicant (no rep)
    const studentId = `stu_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const application_token = uuidv4();
    
    student = await Student.create({
      student_id: studentId,
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      rep_id: null, // Direct applicant - no rep
      whatsapp_number: phone,
      experience_years: parseInt(experience_years) || null,
      dental_reg_number: dental_registration,
      status: 'registered', // Not enrolled yet - needs document upload
      application_token,
      registration_source: 'self' // Self-registered on website
    });

    // TODO: Send notifications (mocked for now)
    console.log(`[MOCKED] Email notification sent for application: ${studentId}`);
    console.log(`[MOCKED] WhatsApp notification sent for application: ${studentId}`);

    res.json({ 
      message: 'Application submitted successfully', 
      student_id: studentId,
      application_token,
      upload_url: `/apply/documents?token=${application_token}`
    });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ detail: 'Failed to submit application' });
  }
};

// Get applications - now from PostgreSQL
exports.getApplications = async (req, res) => {
  try {
    let students;
    
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      // Admin sees all direct applicants (no rep_id)
      students = await Student.findAll({
        where: { rep_id: null },
        include: [{ model: User, as: 'user', attributes: ['email', 'name'] }],
        order: [['created_at', 'DESC']]
      });
    } else {
      // User sees their own application
      const user = await User.findOne({ where: { email: req.user.email } });
      if (user) {
        students = await Student.findAll({
          where: { user_id: user.user_id },
          order: [['created_at', 'DESC']]
        });
      } else {
        students = [];
      }
    }

    res.json(students.map(s => ({
      student_id: s.student_id,
      name: s.user?.name || 'Unknown',
      email: s.user?.email || '',
      phone: s.whatsapp_number,
      status: s.status,
      created_at: s.created_at
    })));
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ detail: 'Failed to get applications' });
  }
};
