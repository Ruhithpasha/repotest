const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Program = sequelize.define('Program', {
  program_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price_gbp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 7999
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'GBP'
  },
  duration_months: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 12
  },
  // Commission settings
  commission_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage'
  },
  commission_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 0.04,
    comment: 'Percentage (0.04 = 4%) or fixed amount'
  },
  // Referral settings
  referral_commission_percent: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.05,
    comment: '5% default referral commission'
  },
  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'programs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['is_active'] }
  ]
});

module.exports = Program;
