const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const WebsiteSetting = sequelize.define('WebsiteSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  content: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  updated_by: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'website_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = WebsiteSetting;
