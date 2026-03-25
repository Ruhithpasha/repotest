const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const FraudAlert = sequelize.define('FraudAlert', {
  alert_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  // Related record type and ID
  related_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of record this flag relates to (enrolment, commission, payout, referral, user)'
  },
  related_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the related record'
  },
  // Flag type (renamed from alert_type)
  flag_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of fraud flag'
  },
  severity: {
    type: DataTypes.STRING(20),
    defaultValue: 'medium'
  },
  // Reason for the flag (auto-generated)
  flag_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Auto-generated explanation of what triggered the flag'
  },
  related_user_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User flagged by the alert'
  },
  // Status with reviewing state
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'open'
  },
  // Review details
  reviewed_by_user_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  review_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Additional metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional data about the flag (IP, device info, etc.)'
  },
  // Whether this flag is blocking related records
  is_blocking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this flag holds related records from advancing'
  }
}, {
  tableName: 'fraud_alerts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['status'] },
    { fields: ['flag_type'] },
    { fields: ['severity'] },
    { fields: ['related_user_id'] },
    { fields: ['related_type', 'related_id'] }
  ],
  getterMethods: {
    // Legacy getters for backward compatibility
    alert_type() {
      return this.getDataValue('flag_type');
    },
    description() {
      return this.getDataValue('flag_reason');
    },
    resolved_by() {
      return this.getDataValue('reviewed_by_user_id');
    },
    resolved_at() {
      return this.getDataValue('reviewed_at');
    },
    resolution_note() {
      return this.getDataValue('review_note');
    },
    related_entity_type() {
      return this.getDataValue('related_type');
    },
    related_entity_ids() {
      const relatedId = this.getDataValue('related_id');
      return relatedId ? [relatedId] : [];
    }
  }
});

module.exports = FraudAlert;
