const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Student = sequelize.define('Student', {
  student_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Student email - synced from users table'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Student name - synced from users table'
  },
  rep_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  program_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'FK to programs table - the enrolled programme'
  },
  whatsapp_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  email_verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  whatsapp_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  whatsapp_verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dental_reg_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  experience_years: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  course_id: {
    type: DataTypes.STRING,
    defaultValue: 'level7-implantology'
  },
  status: {
    type: DataTypes.ENUM('registered', 'documents_uploaded', 'under_review', 'approved', 'payment_pending', 'enrolled', 'rejected', 'call_booking_sent', 'call_booked', 'interview_completed', 'qualified', 'paid_in_full', 'commission_earned', 'commission_released', 'refunded_reversed', 'clawback_required'),
    defaultValue: 'registered'
  },
  enrollment_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  admin_feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  enrolled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Referral tracking - who referred this student
  referred_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User ID of the referrer (enrolled student who referred)'
  },
  referral_code_used: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Referral code used during registration'
  },
  application_token: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Token for applicant self-upload documents (no login required)'
  },
  registration_source: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'self',
    comment: 'How student was registered: self, rep, or manager'
  },
  ghl_contact_id: { type: DataTypes.STRING },
  booking_link_sent: { type: DataTypes.BOOLEAN, defaultValue: false },
  booking_link_sent_at: { type: DataTypes.DATE },
  call_booked_at: { type: DataTypes.DATE },
  call_completed_at: { type: DataTypes.DATE },
  zoom_join_url: { type: DataTypes.STRING },
  qualification_status: {
    type: DataTypes.ENUM('pending', 'passed', 'failed'),
    defaultValue: 'pending'
  },
  qualification_notes: { type: DataTypes.TEXT },
  qualified_at: { type: DataTypes.DATE },
  qualified_by: { type: DataTypes.STRING }
}, {
  tableName: 'students',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Student;
