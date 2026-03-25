const Enrollment = require('../models/Enrollment');

// Get enrollments
exports.getEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user_id: req.user.user_id }).sort({ enrolled_at: -1 });
    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ detail: 'Failed to get enrollments' });
  }
};

// Get enrollment by ID
exports.getEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    
    const enrollment = await Enrollment.findOne({ 
      enrollment_id: enrollmentId, 
      user_id: req.user.user_id 
    });
    
    if (!enrollment) {
      return res.status(404).json({ detail: 'Enrollment not found' });
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ detail: 'Failed to get enrollment' });
  }
};
