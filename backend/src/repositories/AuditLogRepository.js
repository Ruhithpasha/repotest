const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { AuditLog, User } = require('../models/pg');

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async createLog(logData) {
    return this.model.create(logData);
  }

  async findByLogId(logId) {
    return this.model.findOne({ where: { log_id: logId } });
  }

  async findByUser(userId, filters = {}) {
    const where = { user_id: userId };
    if (filters.action_type) where.action_type = filters.action_type;
    if (filters.object_type) where.object_type = filters.object_type;
    
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0
    });
  }

  async findByObject(objectType, objectId) {
    return this.model.findAll({
      where: { object_type: objectType, object_id: objectId },
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'role'] }
      ]
    });
  }

  async findByActionType(actionType, filters = {}) {
    const where = { action_type: actionType };
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

  async search(filters = {}) {
    const where = {};
    
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.action_type) where.action_type = filters.action_type;
    if (filters.object_type) where.object_type = filters.object_type;
    if (filters.object_id) where.object_id = filters.object_id;
    if (filters.date_from) where.created_at = { [Op.gte]: new Date(filters.date_from) };
    if (filters.date_to) {
      const dateTo = new Date(filters.date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.created_at = { ...where.created_at, [Op.lte]: dateTo };
    }
    if (filters.ip_address) where.ip_address = filters.ip_address;

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

  async getRecentActivity(limit = 50) {
    return this.model.findAll({
      order: [['created_at', 'DESC']],
      limit,
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'role'] }
      ]
    });
  }

  async countByActionType(filters = {}) {
    const where = {};
    if (filters.date_from) where.created_at = { [Op.gte]: filters.date_from };
    if (filters.date_to) where.created_at = { ...where.created_at, [Op.lte]: filters.date_to };

    return this.model.findAll({
      where,
      attributes: [
        'action_type',
        [fn('COUNT', '*'), 'count']
      ],
      group: ['action_type'],
      order: [[fn('COUNT', '*'), 'DESC']],
      raw: true
    });
  }
}

module.exports = new AuditLogRepository();
