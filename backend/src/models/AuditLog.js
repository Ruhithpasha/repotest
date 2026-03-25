const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  log_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entity_type: String,
  entity_id: String,
  details: mongoose.Schema.Types.Mixed,
  ip_address: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
