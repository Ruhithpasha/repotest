const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Commission = sequelize.define('Commission', {
  commission_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  rep_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User ID of the commission recipient'
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  payment_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  program_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rule_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Commission rule that was applied'
  },
  // Role type for the commission
  role_type: {
    type: DataTypes.ENUM('rep', 'sales_user', 'manager', 'referrer'),
    defaultValue: 'rep'
  },
  // Sale details
  sale_amount_gbp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 7999
  },
  course_fee_gbp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Legacy field - use sale_amount_gbp'
  },
  // Commission calculation
  commission_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage'
  },
  commission_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    comment: 'Rate or fixed amount used'
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    comment: 'Legacy field - use commission_value'
  },
  commission_amount_gbp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // Lifecycle status
  status: {
    type: DataTypes.ENUM(
      'pending_validation',  // Just created, needs validation
      'pending_approval',    // Validated, waiting admin approval
      'approved',            // Admin approved
      'on_hold',             // Temporarily held
      'payable',             // Ready for payout
      'paid',                // Paid out
      'cancelled',           // Reversed/cancelled
      // Legacy statuses for backward compatibility
      'pending',
      'rejected'
    ),
    defaultValue: 'pending_validation'
  },
  // Hold period
  hold_until: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Commission becomes payable after this date'
  },
  // Approval workflow
  approved_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Cancellation
  cancelled_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelled_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Payout details
  payout_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Payout batch this commission was included in'
  },
  payment_method: {
    type: DataTypes.ENUM('bank_transfer', 'paypal', 'cheque', 'cash', 'other'),
    allowNull: true
  },
  payment_reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clawback_status: {
    type: DataTypes.ENUM('none', 'clawed_back', 'partially_clawed_back'),
    defaultValue: 'none'
  },
  clawback_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  clawback_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clawback_rule_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  clawback_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'commissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['rep_id'] },
    { fields: ['student_id'] },
    { fields: ['status'] },
    { fields: ['role_type'] },
    { fields: ['hold_until'] },
    { fields: ['payout_id'] }
  ]
});

module.exports = Commission;
