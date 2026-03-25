const { Student, StudentDocument, StudentPayment } = require('../models/pg');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) return res.status(404).json({ detail: 'Student not found' });

    const studentId = student.student_id;

    const allDocs = await StudentDocument.findAll({ where: { student_id: studentId } });
    const docsByStatus = allDocs.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    const payments = await StudentPayment.findAll({ where: { student_id: studentId } });
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount_gbp || 0), 0);

    res.json({
      application_status: student.status,
      documents_total: allDocs.length,
      documents_verified: docsByStatus['verified'] || 0,
      documents_pending: (docsByStatus['pending'] || 0) + (docsByStatus['uploaded'] || 0),
      documents_rejected: docsByStatus['rejected'] || 0,
      payments_count: payments.filter(p => p.status === 'paid').length,
      total_paid_gbp: totalPaid
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ detail: 'Failed to get dashboard stats' });
  }
};
