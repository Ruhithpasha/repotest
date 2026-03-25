const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const ProcessedWebhookEvent = sequelize.define('ProcessedWebhookEvent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stripe_event_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  event_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  processed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'processed_webhook_events',
  timestamps: false
});

module.exports = ProcessedWebhookEvent;
