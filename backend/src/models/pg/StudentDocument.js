const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const StudentDocument = sequelize.define('StudentDocument', {
  document_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  doc_type: {
    type: DataTypes.ENUM('bds_degree', 'bds_certificate', 'tenth_marksheet', '10th_marksheet', 'twelfth_marksheet', '12th_marksheet', 'passport_photo', 'photograph', 'id_proof', 'supporting'),
    allowNull: false
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  storage_path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  content_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'uploaded', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  admin_comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verified_by: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'student_documents',
  timestamps: false
});

module.exports = StudentDocument;
