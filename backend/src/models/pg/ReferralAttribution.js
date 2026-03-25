const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

/**
 * ReferralAttribution Model
 * 
 * Tracks individual click events on referral links.
 * Each click generates a unique click_token that is stored in a browser cookie.
 * When an enrolment is created, we check for this cookie to attribute the referral.
 */
const ReferralAttribution = sequelize.define('ReferralAttribution', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Links to the referral code used
  referral_code_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The referral code that was clicked'
  },
  // The user who owns the referral code
  referrer_user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User ID of the referrer'
  },
  // Unique token set in browser cookie
  click_token: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Unique token stored in ref_token cookie'
  },
  // Tracking metadata
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address at time of click'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Browser user agent string'
  },
  referer_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'HTTP referer header'
  },
  // Expiration
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Cookie expiration date (30 days from click)'
  },
  // Conversion tracking
  converted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this click led to an enrolment'
  },
  converted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the conversion happened'
  },
  enrolment_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'The enrolment that resulted from this click'
  },
  // Click timestamp
  clicked_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the referral link was clicked'
  }
}, {
  tableName: 'referral_attributions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['referral_code_id'] },
    { fields: ['referrer_user_id'] },
    { unique: true, fields: ['click_token'] },
    { fields: ['converted'] },
    { fields: ['enrolment_id'] },
    { fields: ['expires_at'] }
  ]
});

module.exports = ReferralAttribution;
