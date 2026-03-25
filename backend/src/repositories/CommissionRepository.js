const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Commission, User, Student } = require('../models/pg');

class CommissionRepository extends BaseRepository {
  constructor() {
    super(Commission);
  }

  // Find commission by commission_id
  async findByCommissionId(commissionId) {
    return this.model.findOne({ where: { commission_id: commissionId } });
  }

  // Find commission by student_id
  async findByStudentId(studentId) {
    return this.model.findOne({ where: { student_id: studentId } });
  }

  // Find commissions by rep_id (user who earns the commission)
  async findByRepId(repId, status = null) {
    const where = { rep_id: repId };
    if (status && status !== 'all') {
      where.status = status;
    }
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  // Find commissions by role type
  async findByRoleType(roleType, status = null) {
    const where = { role_type: roleType };
    if (status) where.status = status;
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  // Find all commissions with optional filters
  async findAllWithFilters(filters = {}) {
    const where = {};
    if (filters.status && filters.status !== 'all') {
      if (Array.isArray(filters.status)) {
        where.status = { [Op.in]: filters.status };
      } else {
        where.status = filters.status;
      }
    }
    if (filters.rep_id) {
      where.rep_id = filters.rep_id;
    }
    if (filters.role_type) {
      where.role_type = filters.role_type;
    }
    if (filters.date_from) {
      where.created_at = { [Op.gte]: new Date(filters.date_from) };
    }
    if (filters.date_to) {
      const dateTo = new Date(filters.date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.created_at = { ...where.created_at, [Op.lte]: dateTo };
    }

    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 200,
      offset: filters.offset || 0
    });
  }

  // Find commissions past hold period
  async findPastHoldPeriod() {
    return this.model.findAll({
      where: {
        status: { [Op.in]: ['pending_validation', 'approved'] },
        hold_until: { [Op.lte]: new Date() }
      },
      order: [['hold_until', 'ASC']]
    });
  }

  // Find payable commissions (ready for payout)
  async findPayable(userId = null) {
    const where = { status: 'payable' };
    if (userId) where.rep_id = userId;
    return this.model.findAll({
      where,
      order: [['created_at', 'ASC']]
    });
  }

  // Find commissions by payout
  async findByPayoutId(payoutId) {
    return this.model.findAll({
      where: { payout_id: payoutId },
      order: [['created_at', 'ASC']]
    });
  }

  // Create commission
  async createCommission(commissionData) {
    return this.model.create(commissionData);
  }

  // Update commission status
  async updateStatus(commissionId, status, additionalData = {}) {
    const commission = await this.findByCommissionId(commissionId);
    if (!commission) return null;
    return commission.update({ status, ...additionalData });
  }

  // Bulk update status
  async bulkUpdateStatus(commissionIds, status, additionalData = {}) {
    return this.model.update(
      { status, ...additionalData },
      { where: { commission_id: { [Op.in]: commissionIds } } }
    );
  }

  // Mark commission as paid
  async markAsPaid(commissionId, { paidBy, paymentMethod, paymentReference, payoutId }) {
    const commission = await this.findByCommissionId(commissionId);
    if (!commission) return null;
    return commission.update({
      status: 'paid',
      paid_by: paidBy,
      paid_at: new Date(),
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      payout_id: payoutId
    });
  }

  // Get commission stats by rep
  async getStatsByRep(repId) {
    return this.model.findAll({
      where: { rep_id: repId },
      attributes: [
        'status',
        [fn('SUM', col('commission_amount_gbp')), 'total'],
        [fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
  }

  // Get all commission stats
  async getAllStats() {
    return this.model.findAll({
      attributes: [
        'status',
        [fn('SUM', col('commission_amount_gbp')), 'total'],
        [fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
  }

  // Get stats by role type
  async getStatsByRoleType() {
    return this.model.findAll({
      attributes: [
        'role_type',
        'status',
        [fn('SUM', col('commission_amount_gbp')), 'total'],
        [fn('COUNT', '*'), 'count']
      ],
      group: ['role_type', 'status'],
      raw: true
    });
  }

  // Sum commissions by rep
  async sumByRep(repId, status = null) {
    const where = { rep_id: repId };
    if (status) where.status = status;
    return this.model.sum('commission_amount_gbp', { where });
  }

  // Sum all payable commissions for a user
  async sumPayable(userId) {
    return this.model.sum('commission_amount_gbp', {
      where: { rep_id: userId, status: 'payable' }
    }) || 0;
  }

  // Check if commission exists for student
  async existsForStudent(studentId) {
    const commission = await this.findByStudentId(studentId);
    return !!commission;
  }

  // Get pending approval count
  async countPendingApproval() {
    return this.model.count({
      where: { status: 'pending_approval' }
    });
  }
}

module.exports = new CommissionRepository();
