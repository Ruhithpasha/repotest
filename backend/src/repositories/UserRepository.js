const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { User } = require('../models/pg');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  // Find user by user_id
  async findByUserId(userId) {
    return this.model.findOne({ where: { user_id: userId } });
  }

  // Find user by email
  async findByEmail(email) {
    return this.model.findOne({ where: { email } });
  }

  // Find user by referral code
  async findByReferralCode(referralCode) {
    return this.model.findOne({ where: { referral_code: referralCode } });
  }

  // Create new user
  async createUser(userData) {
    return this.model.create(userData);
  }

  // Update user by user_id
  async updateUser(userId, data) {
    const user = await this.findByUserId(userId);
    if (!user) return null;
    return user.update(data);
  }

  // Find all users by role
  async findByRole(role) {
    return this.model.findAll({
      where: { role },
      order: [['created_at', 'DESC']]
    });
  }

  // Find users by multiple roles
  async findByRoles(roles) {
    return this.model.findAll({
      where: { role: { [Op.in]: roles } },
      order: [['created_at', 'DESC']]
    });
  }

  // Find all reps and admins (original method for backward compatibility)
  async findRepsAndAdmins(role = null) {
    const where = { role: { [Op.in]: ['rep', 'admin', 'super_admin', 'manager', 'sales_user'] } };
    if (role && ['rep', 'admin', 'super_admin', 'manager', 'sales_user'].includes(role)) {
      where.role = role;
    }
    return this.model.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  // Find users by team
  async findByTeam(teamId) {
    return this.model.findAll({
      where: { team_id: teamId },
      order: [['name', 'ASC']]
    });
  }

  // Count users by team
  async countByTeam(teamId) {
    return this.model.count({ where: { team_id: teamId } });
  }

  // Find users by manager
  async findByManager(managerId) {
    return this.model.findAll({
      where: { manager_id: managerId },
      order: [['name', 'ASC']]
    });
  }

  // Find managers
  async findManagers() {
    return this.model.findAll({
      where: { role: 'manager', is_active: true },
      order: [['name', 'ASC']]
    });
  }

  // Find sales users (with optional team filter)
  async findSalesUsers(teamId = null) {
    const where = { role: 'sales_user', is_active: true };
    if (teamId) where.team_id = teamId;
    return this.model.findAll({
      where,
      order: [['name', 'ASC']]
    });
  }

  // Find delegates (enrolled students who can refer)
  async findDelegates() {
    return this.model.findAll({
      where: { role: 'delegate', is_active: true },
      order: [['name', 'ASC']]
    });
  }

  // Find active admins
  async findActiveAdmins() {
    return this.model.findAll({
      where: { role: { [Op.in]: ['admin', 'super_admin'] }, is_active: true }
    });
  }

  // Toggle user active status
  async toggleActiveStatus(userId) {
    const user = await this.findByUserId(userId);
    if (!user) return null;
    return user.update({ is_active: !user.is_active });
  }

  // Check if email exists
  async emailExists(email) {
    const user = await this.findByEmail(email);
    return !!user;
  }

  // Generate unique referral code for a user
  async generateReferralCode(userId) {
    const user = await this.findByUserId(userId);
    if (!user) return null;
    
    // Generate code based on user ID and random string
    const code = `${user.name.substring(0, 3).toUpperCase()}${userId.slice(-4).toUpperCase()}`;
    
    // Check uniqueness and regenerate if needed
    const existing = await this.findByReferralCode(code);
    if (existing) {
      const uniqueCode = `${code}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
      await user.update({ referral_code: uniqueCode });
      return uniqueCode;
    }
    
    await user.update({ referral_code: code });
    return code;
  }

  // Update last login
  async updateLastLogin(userId, ipAddress) {
    const user = await this.findByUserId(userId);
    if (!user) return null;
    return user.update({
      last_login_at: new Date(),
      last_login_ip: ipAddress
    });
  }

  // Search users
  async searchUsers(query, roles = null) {
    const where = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } }
      ]
    };
    if (roles && roles.length > 0) {
      where.role = { [Op.in]: roles };
    }
    return this.model.findAll({
      where,
      order: [['name', 'ASC']],
      limit: 20
    });
  }

  // Count users by role
  async countByRole() {
    return this.model.findAll({
      attributes: [
        'role',
        [fn('COUNT', '*'), 'count']
      ],
      group: ['role'],
      raw: true
    });
  }
}

module.exports = new UserRepository();
