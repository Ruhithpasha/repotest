const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const CommissionRule = sequelize.define('CommissionRule', {
  rule_id: {
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
  // Scope - programme_id NULL means global rule
  program_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'NULL means applies to all programs (global rule)'
  },
  role_type: {
    type: DataTypes.ENUM('sales_user', 'manager', 'rep', 'referrer'),
    allowNull: false,
    defaultValue: 'sales_user'
  },
  // Commission calculation
  commission_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage'
  },
  commission_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    comment: 'Percentage as decimal (0.04 = 4%) or fixed amount'
  },
  // Manager override bounds
  manager_override_min: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Minimum % a manager can override to (null = override disabled)'
  },
  manager_override_max: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Maximum % a manager can override to (null = override disabled)'
  },
  // Conditions
  minimum_payment_status: {
    type: DataTypes.ENUM('deposit_paid', 'paid_in_full'),
    defaultValue: 'paid_in_full'
  },
  minimum_sale_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Minimum sale amount to qualify'
  },
  // Hold period before commission becomes payable
  hold_days: {
    type: DataTypes.INTEGER,
    defaultValue: 14,
    comment: 'Days to hold commission before it becomes payable'
  },
  // Validity
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Priority for rule matching
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Higher priority rules are evaluated first'
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'commission_rules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['program_id'] },
    { fields: ['role_type'] },
    { fields: ['is_active'] },
    { fields: ['priority'] }
  ]
});

module.exports = CommissionRule;
