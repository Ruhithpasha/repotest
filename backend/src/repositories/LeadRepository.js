const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Lead, User, Team, Program } = require('../models/pg');

class LeadRepository extends BaseRepository {
  constructor() {
    super(Lead);
  }

  async findByLeadId(leadId) {
    return this.model.findOne({ where: { lead_id: leadId } });
  }

  async findByEmail(email) {
    return this.model.findOne({ where: { email } });
  }

  async findByPhone(phone) {
    return this.model.findOne({ where: { phone } });
  }

  async findByAssignedUser(userId, filters = {}) {
    const where = { assigned_to: userId };
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: Program, as: 'program', attributes: ['program_id', 'name', 'price_gbp'] }
      ]
    });
  }

  async findByTeam(teamId, filters = {}) {
    const where = { team_id: teamId };
    if (filters.status) where.status = filters.status;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;
    
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'assigned_user', attributes: ['user_id', 'name', 'email'] },
        { model: Program, as: 'program', attributes: ['program_id', 'name', 'price_gbp'] }
      ]
    });
  }

  async findByReferrer(referrerUserId) {
    return this.model.findAll({
      where: { referred_by: referrerUserId },
      order: [['created_at', 'DESC']]
    });
  }

  async findByReferralCode(referralCode) {
    return this.model.findAll({
      where: { referral_code: referralCode },
      order: [['created_at', 'DESC']]
    });
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    if (filters.team_id) where.team_id = filters.team_id;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;
    if (filters.program_id) where.program_id = filters.program_id;
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { email: { [Op.iLike]: `%${filters.search}%` } },
        { phone: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }
    if (filters.date_from) {
      where.created_at = { [Op.gte]: filters.date_from };
    }
    if (filters.date_to) {
      where.created_at = { ...where.created_at, [Op.lte]: filters.date_to };
    }

    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'assigned_user', attributes: ['user_id', 'name', 'email'] },
        { model: Team, as: 'team', attributes: ['team_id', 'name'] },
        { model: Program, as: 'program', attributes: ['program_id', 'name', 'price_gbp'] }
      ],
      limit: filters.limit || 100,
      offset: filters.offset || 0
    });
  }

  async createLead(leadData) {
    return this.model.create(leadData);
  }

  async updateLead(leadId, data) {
    const lead = await this.findByLeadId(leadId);
    if (!lead) return null;
    return lead.update(data);
  }

  async updateStatus(leadId, status, additionalData = {}) {
    const lead = await this.findByLeadId(leadId);
    if (!lead) return null;
    return lead.update({ status, ...additionalData });
  }

  async assignToUser(leadId, userId, teamId = null) {
    const lead = await this.findByLeadId(leadId);
    if (!lead) return null;
    const data = { assigned_to: userId };
    if (teamId) data.team_id = teamId;
    return lead.update(data);
  }

  async markConverted(leadId, studentId) {
    const lead = await this.findByLeadId(leadId);
    if (!lead) return null;
    return lead.update({
      converted_to_student_id: studentId,
      converted_at: new Date(),
      status: 'enrolled'
    });
  }

  // Statistics
  async countByStatus(filters = {}) {
    const where = {};
    if (filters.team_id) where.team_id = filters.team_id;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;

    return this.model.findAll({
      where,
      attributes: [
        'status',
        [fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
  }

  async countBySource(filters = {}) {
    const where = {};
    if (filters.team_id) where.team_id = filters.team_id;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;

    return this.model.findAll({
      where,
      attributes: [
        'source',
        [fn('COUNT', '*'), 'count']
      ],
      group: ['source'],
      raw: true
    });
  }

  async getConversionRate(filters = {}) {
    const where = {};
    if (filters.team_id) where.team_id = filters.team_id;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;

    const total = await this.model.count({ where });
    const converted = await this.model.count({
      where: { ...where, status: { [Op.in]: ['enrolled', 'paid_in_full'] } }
    });

    return {
      total,
      converted,
      rate: total > 0 ? (converted / total * 100).toFixed(2) : 0
    };
  }
}

module.exports = new LeadRepository();
