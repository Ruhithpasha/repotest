const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Lead = sequelize.define('Lead', {
  lead_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  // Contact info
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Location
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'India'
  },
  // Professional info
  profession: {
    type: DataTypes.STRING,
    allowNull: true
  },
  experience_years: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Lead assignment
  assigned_to: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Sales user ID'
  },
  team_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Program interest
  program_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Lead status lifecycle
  status: {
    type: DataTypes.ENUM(
      'new',
      'contacted',
      'interested',
      'not_interested',
      'application_started',
      'enrolled',
      'payment_pending',
      'paid_in_full',
      'cancelled',
      'lost'
    ),
    defaultValue: 'new'
  },
  // Source tracking
  source: {
    type: DataTypes.ENUM(
      'website',
      'referral',
      'social_media',
      'google_ads',
      'facebook_ads',
      'whatsapp',
      'phone_inquiry',
      'walk_in',
      'event',
      'partner',
      'other'
    ),
    defaultValue: 'website'
  },
  source_details: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Additional source info like campaign name'
  },
  // Referral tracking
  referral_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referred_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User ID of referrer (delegate)'
  },
  // Notes and follow-up
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  last_contact_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  next_followup_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Conversion tracking
  converted_to_student_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Student ID if lead converted'
  },
  converted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Metadata
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  utm_source: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utm_medium: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utm_campaign: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'leads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['email'] },
    { fields: ['phone'] },
    { fields: ['assigned_to'] },
    { fields: ['team_id'] },
    { fields: ['status'] },
    { fields: ['source'] },
    { fields: ['referral_code'] },
    { fields: ['referred_by'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Lead;
