/**
 * Module Model
 * Represents a module/lesson within a programme/course
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Module = sequelize.define('Module', {
  module_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  programme_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'programs',
      key: 'program_id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Rich text / HTML content for the module lesson'
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated time to complete in minutes'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'modules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['programme_id'] },
    { fields: ['programme_id', 'order'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Module;
