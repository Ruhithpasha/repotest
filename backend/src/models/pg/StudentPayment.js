const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const StudentPayment = sequelize.define('StudentPayment', {
  payment_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stripe_payment_intent_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_session_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_charge_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  amount_gbp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_type: {
    type: DataTypes.ENUM('full', 'deposit', 'installment', 'manual'),
    defaultValue: 'full'
  },
  installment_number: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'expired'),
    defaultValue: 'pending'
  },
  payment_method: {
    type: DataTypes.ENUM('stripe', 'bank_transfer', 'cash', 'other'),
    defaultValue: 'stripe'
  },
  reference_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receipt_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Refund fields
  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  refund_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  failure_reason: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'student_payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = StudentPayment;
