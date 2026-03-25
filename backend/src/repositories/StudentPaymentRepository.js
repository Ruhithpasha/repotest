const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { StudentPayment } = require('../models/pg');

class StudentPaymentRepository extends BaseRepository {
  constructor() {
    super(StudentPayment);
  }

  // Find payment by payment_id
  async findByPaymentId(paymentId) {
    return this.model.findOne({ where: { payment_id: paymentId } });
  }

  // Find payments by student_id
  async findByStudentId(studentId) {
    return this.model.findAll({
      where: { student_id: studentId },
      order: [['created_at', 'DESC']]
    });
  }

  // Find payment by stripe session id
  async findByStripeSessionId(sessionId) {
    return this.model.findOne({
      where: { stripe_payment_intent_id: sessionId }
    });
  }

  // Create payment
  async createPayment(paymentData) {
    return this.model.create(paymentData);
  }

  // Update payment
  async updatePayment(paymentId, data) {
    const payment = await this.findByPaymentId(paymentId);
    if (!payment) return null;
    return payment.update(data);
  }

  // Sum paid amounts by student
  async sumPaidByStudent(studentId) {
    const result = await this.model.sum('amount_gbp', {
      where: { student_id: studentId, status: 'paid' }
    });
    return parseFloat(result) || 0;
  }

  // Sum all paid amounts
  async sumAllPaid() {
    const result = await this.model.sum('amount_gbp', {
      where: { status: 'paid' }
    });
    return parseFloat(result) || 0;
  }

  // Get payment stats by student
  async getStatsByStudent(studentId) {
    return this.model.findAll({
      where: { student_id: studentId },
      attributes: [
        'status',
        [fn('SUM', col('amount_gbp')), 'total'],
        [fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
  }
}

module.exports = new StudentPaymentRepository();
