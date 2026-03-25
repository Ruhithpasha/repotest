const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const AuditLog = sequelize.define('AuditLog', {
  log_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  // Who performed the action
  user_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'NULL for system actions'
  },
  user_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_role: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // What action was performed
  action_type: {
    type: DataTypes.ENUM(
      // User actions
      'user_created',
      'user_updated',
      'user_deleted',
      'user_role_changed',
      'user_status_changed',
      'user_login',
      'user_logout',
      // Team actions
      'team_created',
      'team_updated',
      'team_member_added',
      'team_member_removed',
      // Lead actions
      'lead_created',
      'lead_updated',
      'lead_assigned',
      'lead_status_changed',
      'lead_converted',
      // Commission actions
      'commission_created',
      'commission_updated',
      'commission_approved',
      'commission_rejected',
      'commission_paid',
      'commission_reversed',
      // Referral actions
      'referral_created',
      'referral_approved',
      'referral_rejected',
      'referral_code_generated',
      'referral_self_attempt',
      'referral_ip_abuse',
      'referral_commission_created',
      'referral_registration',
      // Payment actions
      'payment_created',
      'payment_updated',
      'payment_refunded',
      // Payout actions
      'payout_created',
      'payout_approved',
      'payout_processed',
      // Program/Programme actions
      'program_created',
      'program_updated',
      'programme_created',
      'programme_updated',
      'programme_deactivated',
      'programme_activated',
      // Module actions
      'module_created',
      'module_updated',
      'module_deactivated',
      // Other
      'settings_changed',
      'export_generated',
      'other'
    ),
    allowNull: false
  },
  // What object was affected
  object_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'user, team, lead, commission, referral, payment, payout, program, etc.'
  },
  object_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Change details
  old_value: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  new_value: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Request metadata
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  request_id: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Audit logs are immutable
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action_type'] },
    { fields: ['object_type'] },
    { fields: ['object_id'] },
    { fields: ['created_at'] }
  ]
});

module.exports = AuditLog;
