const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const StudentSubscription = sequelize.define('StudentSubscription', {
  subscription_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stripe_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  plan_type: {
    type: DataTypes.ENUM('installment_6_month'),
    defaultValue: 'installment_6_month'
  },
  deposit_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 500.00
  },
  monthly_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1249.83
  },
  total_installments: {
    type: DataTypes.INTEGER,
    defaultValue: 6
  },
  installments_paid: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  deposit_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deposit_paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending_deposit', 'active', 'completed', 'cancelled', 'past_due'),
    defaultValue: 'pending_deposit'
  },
  next_payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'student_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = StudentSubscription;
