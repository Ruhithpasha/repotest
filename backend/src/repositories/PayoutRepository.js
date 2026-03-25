const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Payout, User } = require('../models/pg');

class PayoutRepository extends BaseRepository {
  constructor() {
    super(Payout);
  }

  async findByPayoutId(payoutId) {
    return this.model.findOne({ where: { payout_id: payoutId } });
  }

  async findByUserId(userId, filters = {}) {
    const where = { user_id: userId };
    if (filters.status) where.status = filters.status;

    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  async findByStatus(status) {
    return this.model.findAll({
      where: { status },
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'role'] }
      ]
    });
  }

  async findByBatchId(batchId) {
    return this.model.findAll({
      where: { batch_id: batchId },
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'role'] }
      ]
    });
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.payout_type) where.payout_type = filters.payout_type;
    if (filters.date_from) where.created_at = { [Op.gte]: filters.date_from };
    if (filters.date_to) where.created_at = { ...where.created_at, [Op.lte]: filters.date_to };

    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'role'] }
      ]
    });
  }

  async createPayout(payoutData) {
    return this.model.create(payoutData);
  }

  async updatePayout(payoutId, data) {
    const payout = await this.findByPayoutId(payoutId);
    if (!payout) return null;
    return payout.update(data);
  }

  async updateStatus(payoutId, status, additionalData = {}) {
    const payout = await this.findByPayoutId(payoutId);
    if (!payout) return null;
    return payout.update({ status, ...additionalData });
  }

  async approvePayout(payoutId, approvedBy) {
    const payout = await this.findByPayoutId(payoutId);
    if (!payout) return null;
    return payout.update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date()
    });
  }

  async markPaid(payoutId, paidBy, paymentReference = null) {
    const payout = await this.findByPayoutId(payoutId);
    if (!payout) return null;
    return payout.update({
      status: 'paid',
      paid_by: paidBy,
      paid_at: new Date(),
      payment_reference: paymentReference || payout.payment_reference
    });
  }

  // Statistics
  async sumByUser(userId, status = null) {
    const where = { user_id: userId };
    if (status) where.status = status;
    const result = await this.model.sum('total_amount', { where });
    return result || 0;
  }

  async sumByStatus(status) {
    const result = await this.model.sum('total_amount', { where: { status } });
    return result || 0;
  }

  async getStats() {
    const stats = await this.model.findAll({
      attributes: [
        'status',
        [fn('COUNT', '*'), 'count'],
        [fn('SUM', col('total_amount')), 'total']
      ],
      group: ['status'],
      raw: true
    });

    return stats.reduce((acc, item) => {
      acc[item.status] = {
        count: parseInt(item.count),
        total: parseFloat(item.total) || 0
      };
      return acc;
    }, {});
  }
}

module.exports = new PayoutRepository();
