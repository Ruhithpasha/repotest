const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Manager = sequelize.define('Manager', {
  manager_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'The user who is the manager'
  },
  parent_manager_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'For sub-manager hierarchy'
  },
  assigned_admin_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Which admin oversees this manager'
  },
  commission_override: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Override percentage if not using default rule'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'managers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id'], unique: true },
    { fields: ['assigned_admin_id'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Manager;
