const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  picture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Extended role system
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'sales_user', 'rep', 'student', 'delegate'),
    defaultValue: 'student'
  },
  // Team assignment (for sales users)
  team_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Team ID for sales users'
  },
  // Manager assignment (for sales users)
  manager_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Direct manager user ID'
  },
  // Referral code (for delegates)
  referral_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Unique referral code for delegate referrals'
  },
  // Bank details for commission payouts
  bank_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Bank account details for payouts'
  },
  // Status and permissions
  created_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Password management
  temp_password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password_changed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Two-factor auth (for admins)
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  two_factor_secret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Login tracking
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login_ip: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['role'] },
    { fields: ['team_id'] },
    { fields: ['manager_id'] },
    { fields: ['referral_code'], unique: true, where: { referral_code: { [require('sequelize').Op.ne]: null } } },
    { fields: ['is_active'] }
  ]
});

// Transform for JSON output
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.two_factor_secret;
  return values;
};

module.exports = User;
