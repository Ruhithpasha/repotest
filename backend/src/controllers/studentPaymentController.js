const { v4: uuidv4 } = require('uuid');
const { 
  StudentRepository,
  StudentPaymentRepository
} = require('../repositories');

const COURSE_FEE_GBP = 6250;

// Get my payments (for student)
exports.getMyPayments = async (req, res) => {
  try {
    const student = await StudentRepository.findByUserId(req.user.user_id);
    if (!student) {
      // Return empty payment data if no student record
      return res.json({
        payments: [],
        total_fee_gbp: COURSE_FEE_GBP,
        total_paid_gbp: 0,
        remaining_gbp: COURSE_FEE_GBP,
        is_fully_paid: false
      });
    }

    const payments = await StudentPaymentRepository.findByStudentId(student.student_id);
    const totalPaid = await StudentPaymentRepository.sumPaidByStudent(student.student_id);
    const remaining = Math.max(0, COURSE_FEE_GBP - totalPaid);

    res.json({
      payments,
      total_fee_gbp: COURSE_FEE_GBP,
      total_paid_gbp: totalPaid,
      remaining_gbp: remaining,
      is_fully_paid: remaining === 0
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({ detail: 'Failed to get payments' });
  }
};

// Get payments for a student
exports.getPayments = async (req, res) => {
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

    const payments = await StudentPaymentRepository.findByStudentId(studentId);
    const totalPaid = await StudentPaymentRepository.sumPaidByStudent(studentId);
    const remaining = Math.max(0, COURSE_FEE_GBP - totalPaid);

    res.json({
      payments,
      total_fee_gbp: COURSE_FEE_GBP,
      total_paid_gbp: totalPaid,
      remaining_gbp: remaining,
      is_fully_paid: remaining === 0
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ detail: 'Failed to get payments' });
  }
};

// Get all payments (admin dashboard)
exports.getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const payments = await StudentPaymentRepository.findAll({ order: [['created_at', 'DESC']] });
    const totalRevenue = await StudentPaymentRepository.sumAllPaid();
    
    const paidCount = payments.filter(p => p.status === 'paid').length;
    const pendingCount = payments.filter(p => p.status === 'pending').length;

    res.json({
      payments,
      total_revenue_gbp: totalRevenue || 0,
      paid_count: paidCount,
      pending_count: pendingCount
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ detail: 'Failed to get payments' });
  }
};

// Create payment intent (mocked)
exports.createPaymentIntent = async (req, res) => {
  try {
    const { student_id, amount_gbp } = req.body;

    const student = await StudentRepository.findByStudentId(student_id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Check if student is approved
    if (!['approved', 'payment_pending'].includes(student.status)) {
      return res.status(400).json({ detail: 'Student must be approved before payment' });
    }

    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const amount = amount_gbp || COURSE_FEE_GBP;

    const payment = await StudentPaymentRepository.createPayment({
      payment_id: paymentId,
      student_id,
      stripe_payment_intent_id: `pi_mock_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      amount_gbp: amount,
      status: 'pending'
    });

    res.json({
      payment_id: paymentId,
      client_secret: `mock_secret_${uuidv4().replace(/-/g, '').slice(0, 24)}`,
      amount_gbp: amount,
      currency: 'GBP'
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ detail: 'Failed to create payment' });
  }
};

// Confirm payment (mocked)
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await StudentPaymentRepository.findByPaymentId(paymentId);
    if (!payment) {
      return res.status(404).json({ detail: 'Payment not found' });
    }

    await StudentPaymentRepository.updatePayment(paymentId, {
      status: 'paid',
      paid_at: new Date(),
      receipt_url: `https://mock-receipts.s3.amazonaws.com/receipts/${paymentId}.pdf`
    });

    // Check if fully paid and enroll student
    const student = await StudentRepository.findByStudentId(payment.student_id);
    if (student) {
      const totalPaid = await StudentPaymentRepository.sumPaidByStudent(payment.student_id);

      if (totalPaid >= COURSE_FEE_GBP && student.status !== 'enrolled') {
        const enrollmentNumber = `P4G-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        await StudentRepository.updateStatus(student.student_id, 'enrolled', {
          enrollment_number: enrollmentNumber,
          enrolled_at: new Date()
        });
      }
    }

    const updatedPayment = await StudentPaymentRepository.findByPaymentId(paymentId);

    res.json({ 
      message: 'Payment confirmed', 
      payment: updatedPayment.toJSON(),
      receipt_url: updatedPayment.receipt_url
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ detail: 'Failed to confirm payment' });
  }
};

// Mark payment as received (admin - for bank transfers)
exports.markPaymentReceived = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const { student_id, amount_gbp, installment_number } = req.body;

    const student = await StudentRepository.findByStudentId(student_id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    await StudentPaymentRepository.createPayment({
      payment_id: paymentId,
      student_id,
      stripe_payment_intent_id: `manual_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      amount_gbp,
      installment_number,
      status: 'paid',
      paid_at: new Date(),
      receipt_url: `https://mock-receipts.s3.amazonaws.com/receipts/${paymentId}.pdf`
    });

    // Check if fully paid
    const totalPaid = await StudentPaymentRepository.sumPaidByStudent(student_id);

    if (totalPaid >= COURSE_FEE_GBP && student.status !== 'enrolled') {
      const enrollmentNumber = `P4G-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      await StudentRepository.updateStatus(student_id, 'enrolled', {
        enrollment_number: enrollmentNumber,
        enrolled_at: new Date()
      });
    }

    const payment = await StudentPaymentRepository.findByPaymentId(paymentId);

    res.json({ message: 'Payment recorded', payment: payment.toJSON() });
  } catch (error) {
    console.error('Mark payment error:', error);
    res.status(500).json({ detail: 'Failed to record payment' });
  }
};

module.exports = exports;
