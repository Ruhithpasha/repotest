/**
 * CommissionOverrideRequest Model
 * Tracks manager requests to override commission percentages outside allowed bounds
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const CommissionOverrideRequest = sequelize.define('CommissionOverrideRequest', {
  request_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  commission_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'commissions',
      key: 'commission_id'
    }
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'students',
      key: 'student_id'
    }
  },
  requested_by_user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    comment: 'The manager who requested the override'
  },
  original_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Original commission percentage from rule'
  },
  requested_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'New percentage requested by manager'
  },
  rule_min: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Minimum % allowed by the rule'
  },
  rule_max: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Maximum % allowed by the rule'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Manager justification for the override'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  reviewed_by_user_id: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    comment: 'Super admin who reviewed the request'
  },
  review_note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Note from reviewer when approving/rejecting'
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'commission_override_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['commission_id'] },
    { fields: ['requested_by_user_id'] },
    { fields: ['status'] },
    { fields: ['reviewed_by_user_id'] }
  ]
});

module.exports = CommissionOverrideRequest;
