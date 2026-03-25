const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const PayoutCommission = sequelize.define('PayoutCommission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payout_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  commission_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Each commission can only be in one payout batch'
  },
  // Amount at time of inclusion (snapshot)
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Commission amount included in this batch'
  },
  // Individual item status within batch
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'pending',
    comment: 'Status of this commission item within the batch (pending, processing, completed, failed)'
  },
  // Individual transfer reference (for split payments)
  transfer_reference: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Bank transfer reference for this item'
  },
  // When this item was processed
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this commission was processed/paid'
  }
}, {
  tableName: 'payout_batch_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['payout_id'] },
    { unique: true, fields: ['commission_id'] }
  ]
});

module.exports = PayoutCommission;
