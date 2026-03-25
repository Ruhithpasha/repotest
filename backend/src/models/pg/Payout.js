const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Payout = sequelize.define('Payout', {
  payout_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  // Who is being paid
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Payout type
  payout_type: {
    type: DataTypes.ENUM('commission', 'referral', 'bonus', 'adjustment'),
    defaultValue: 'commission'
  },
  // Commission references
  commission_ids: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of commission IDs included in this payout'
  },
  commission_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Amount
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'GBP'
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'pending',      // Created, awaiting approval
      'approved',     // Approved for payment
      'processing',   // Payment in progress
      'paid',         // Payment completed
      'failed',       // Payment failed
      'cancelled'     // Payout cancelled
    ),
    defaultValue: 'pending'
  },
  // Payment details
  payment_method: {
    type: DataTypes.ENUM('bank_transfer', 'paypal', 'cheque', 'cash', 'other'),
    defaultValue: 'bank_transfer'
  },
  payment_reference: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Bank reference or transaction ID'
  },
  // Bank details (encrypted in production)
  bank_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Bank account details for transfer'
  },
  // Batch info
  batch_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'For grouping multiple payouts'
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
  // Payment execution
  paid_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Period covered
  period_start: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  period_end: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'payouts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['batch_id'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Payout;
