const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Referral = sequelize.define('Referral', {
  referral_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  // Referrer (the delegate who is referring)
  referrer_user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User ID of the delegate who made the referral'
  },
  referral_code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Unique referral code for the referrer'
  },
  // Referred person
  referred_lead_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Lead ID of the referred person'
  },
  referred_student_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Student ID if lead converted'
  },
  referred_email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  referred_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Program and sale
  program_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sale_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Commission
  referral_percent: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.05,
    comment: '5% default'
  },
  commission_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'pending',           // Referral link clicked
      'registered',        // Referred person registered
      'payment_pending',   // Awaiting payment
      'paid',              // Payment received, commission eligible
      'commission_created', // Commission record created
      'commission_paid',   // Commission paid to referrer
      'invalid',           // Failed fraud check
      'expired'            // Referral window expired
    ),
    defaultValue: 'pending'
  },
  // Attribution tracking
  click_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  first_click_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_click_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  registered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Attribution expiry
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Referral attribution expires after 30 days'
  },
  // Fraud detection data
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device_fingerprint: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Fraud flags
  fraud_flags: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of fraud indicators'
  },
  fraud_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Higher score = more suspicious'
  },
  fraud_review_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'not_required'),
    defaultValue: 'not_required'
  },
  fraud_reviewed_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fraud_reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'referrals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['referrer_user_id'] },
    { fields: ['referral_code'] },
    { fields: ['referred_email'] },
    { fields: ['referred_lead_id'] },
    { fields: ['referred_student_id'] },
    { fields: ['status'] },
    { fields: ['fraud_review_status'] }
  ]
});

module.exports = Referral;
