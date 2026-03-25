const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Team, User } = require('../models/pg');

class TeamRepository extends BaseRepository {
  constructor() {
    super(Team);
  }

  async findByTeamId(teamId) {
    return this.model.findOne({ where: { team_id: teamId } });
  }

  async findByManagerId(managerId) {
    return this.model.findAll({
      where: { manager_id: managerId },
      order: [['created_at', 'DESC']]
    });
  }

  async findAllActive() {
    return this.model.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });
  }

  async createTeam(teamData) {
    return this.model.create(teamData);
  }

  async updateTeam(teamId, data) {
    const team = await this.findByTeamId(teamId);
    if (!team) return null;
    return team.update(data);
  }

  async getTeamWithMembers(teamId) {
    return this.model.findOne({
      where: { team_id: teamId },
      include: [
        { model: User, as: 'manager', attributes: ['user_id', 'name', 'email'] },
        { model: User, as: 'members', attributes: ['user_id', 'name', 'email', 'role', 'is_active'] }
      ]
    });
  }

  async countByManager(managerId) {
    return this.model.count({ where: { manager_id: managerId } });
  }
}

module.exports = new TeamRepository();
