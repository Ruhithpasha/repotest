/**
 * ModuleProgress Model
 * Tracks student progress through course modules
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const ModuleProgress = sequelize.define('ModuleProgress', {
  progress_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'students',
      key: 'student_id'
    }
  },
  module_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'modules',
      key: 'module_id'
    },
    onDelete: 'CASCADE'
  },
  student_user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
    defaultValue: 'not_started'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'module_progress',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['student_id'] },
    { fields: ['module_id'] },
    { fields: ['student_user_id'] },
    { 
      fields: ['student_id', 'module_id'],
      unique: true,
      name: 'unique_student_module_progress'
    }
  ]
});

module.exports = ModuleProgress;
