const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { CommissionRule, Program } = require('../models/pg');

class CommissionRuleRepository extends BaseRepository {
  constructor() {
    super(CommissionRule);
  }

  async findByRuleId(ruleId) {
    return this.model.findOne({ where: { rule_id: ruleId } });
  }

  async findActiveRules(filters = {}) {
    const where = { is_active: true };
    if (filters.program_id) where.program_id = filters.program_id;
    if (filters.role_type) where.role_type = filters.role_type;

    // Filter by date validity
    const now = new Date();
    where[Op.or] = [
      { start_date: null, end_date: null },
      { start_date: { [Op.lte]: now }, end_date: null },
      { start_date: null, end_date: { [Op.gte]: now } },
      { start_date: { [Op.lte]: now }, end_date: { [Op.gte]: now } }
    ];

    return this.model.findAll({
      where,
      order: [['priority', 'DESC'], ['created_at', 'DESC']],
      include: [
        { model: Program, as: 'program', attributes: ['program_id', 'name'] }
      ]
    });
  }

  async findAllRules() {
    return this.model.findAll({
      order: [['priority', 'DESC'], ['created_at', 'DESC']],
      include: [
        { model: Program, as: 'program', attributes: ['program_id', 'name'] }
      ]
    });
  }

  async findApplicableRule(programId, roleType) {
    const now = new Date();
    
    // First try to find program-specific rule
    let rule = await this.model.findOne({
      where: {
        program_id: programId,
        role_type: roleType,
        is_active: true,
        [Op.or]: [
          { start_date: null, end_date: null },
          { start_date: { [Op.lte]: now }, end_date: null },
          { start_date: null, end_date: { [Op.gte]: now } },
          { start_date: { [Op.lte]: now }, end_date: { [Op.gte]: now } }
        ]
      },
      order: [['priority', 'DESC']]
    });

    // If no program-specific rule, find global rule (program_id = null)
    if (!rule) {
      rule = await this.model.findOne({
        where: {
          program_id: null,
          role_type: roleType,
          is_active: true,
          [Op.or]: [
            { start_date: null, end_date: null },
            { start_date: { [Op.lte]: now }, end_date: null },
            { start_date: null, end_date: { [Op.gte]: now } },
            { start_date: { [Op.lte]: now }, end_date: { [Op.gte]: now } }
          ]
        },
        order: [['priority', 'DESC']]
      });
    }

    return rule;
  }

  async createRule(ruleData) {
    return this.model.create(ruleData);
  }

  async updateRule(ruleId, data) {
    const rule = await this.findByRuleId(ruleId);
    if (!rule) return null;
    return rule.update(data);
  }

  async toggleStatus(ruleId) {
    const rule = await this.findByRuleId(ruleId);
    if (!rule) return null;
    return rule.update({ is_active: !rule.is_active });
  }

  async deleteRule(ruleId) {
    const rule = await this.findByRuleId(ruleId);
    if (!rule) return null;
    await rule.destroy();
    return true;
  }
}

module.exports = new CommissionRuleRepository();
