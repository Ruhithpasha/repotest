const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Team = sequelize.define('Team', {
  team_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  manager_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User ID of the manager who owns this team'
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
  tableName: 'teams',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['manager_id'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Team;
