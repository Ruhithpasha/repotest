const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const ClawbackRule = sequelize.define('ClawbackRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clawback_window_days: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  clawback_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'clawback_rules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ClawbackRule;
