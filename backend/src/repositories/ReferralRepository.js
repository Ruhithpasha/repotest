const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Referral, User, Lead, Student, Program } = require('../models/pg');

class ReferralRepository extends BaseRepository {
  constructor() {
    super(Referral);
  }

  async findByReferralId(referralId) {
    return this.model.findOne({ where: { referral_id: referralId } });
  }

  async findByReferralCode(referralCode) {
    return this.model.findAll({
      where: { referral_code: referralCode },
      order: [['created_at', 'DESC']]
    });
  }

  async findByReferrer(referrerUserId, filters = {}) {
    const where = { referrer_user_id: referrerUserId };
    if (filters.status) where.status = filters.status;

    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: Program, as: 'program', attributes: ['program_id', 'name'] }
      ]
    });
  }

  async findByReferredEmail(email) {
    return this.model.findOne({
      where: { referred_email: email },
      order: [['created_at', 'DESC']]
    });
  }

  async findPendingFraudReview() {
    return this.model.findAll({
      where: { fraud_review_status: 'pending' },
      order: [['fraud_score', 'DESC'], ['created_at', 'ASC']],
      include: [
        { model: User, as: 'referrer', attributes: ['user_id', 'name', 'email'] }
      ]
    });
  }

  async createReferral(referralData) {
    return this.model.create(referralData);
  }

  async updateReferral(referralId, data) {
    const referral = await this.findByReferralId(referralId);
    if (!referral) return null;
    return referral.update(data);
  }

  async updateStatus(referralId, status, additionalData = {}) {
    const referral = await this.findByReferralId(referralId);
    if (!referral) return null;
    return referral.update({ status, ...additionalData });
  }

  async incrementClicks(referralCode) {
    const referral = await this.model.findOne({ where: { referral_code: referralCode } });
    if (!referral) return null;
    
    const now = new Date();
    return referral.update({
      click_count: referral.click_count + 1,
      first_click_at: referral.first_click_at || now,
      last_click_at: now
    });
  }

  async approveFraudReview(referralId, reviewedBy) {
    const referral = await this.findByReferralId(referralId);
    if (!referral) return null;
    return referral.update({
      fraud_review_status: 'approved',
      fraud_reviewed_by: reviewedBy,
      fraud_reviewed_at: new Date()
    });
  }

  async rejectFraudReview(referralId, reviewedBy, notes = null) {
    const referral = await this.findByReferralId(referralId);
    if (!referral) return null;
    return referral.update({
      fraud_review_status: 'rejected',
      status: 'invalid',
      fraud_reviewed_by: reviewedBy,
      fraud_reviewed_at: new Date(),
      notes: notes || referral.notes
    });
  }

  // Statistics
  async getReferrerStats(referrerUserId) {
    const stats = await this.model.findAll({
      where: { referrer_user_id: referrerUserId },
      attributes: [
        'status',
        [fn('COUNT', '*'), 'count'],
        [fn('SUM', col('commission_amount')), 'total_commission']
      ],
      group: ['status'],
      raw: true
    });

    const clicks = await this.model.sum('click_count', {
      where: { referrer_user_id: referrerUserId }
    });

    return { stats, total_clicks: clicks || 0 };
  }

  async getTotalEarnings(referrerUserId) {
    const result = await this.model.sum('commission_amount', {
      where: {
        referrer_user_id: referrerUserId,
        status: { [Op.in]: ['commission_created', 'commission_paid'] }
      }
    });
    return result || 0;
  }

  async getPendingEarnings(referrerUserId) {
    const result = await this.model.sum('commission_amount', {
      where: {
        referrer_user_id: referrerUserId,
        status: 'commission_created'
      }
    });
    return result || 0;
  }
}

module.exports = new ReferralRepository();
