const mongoose = require('mongoose');

const otpLogSchema = new mongoose.Schema({
  contact: {
    type: String,
    required: true
  },
  contact_type: {
    type: String,
    enum: ['email', 'whatsapp'],
    required: true
  },
  otp_hash: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempt_count: {
    type: Number,
    default: 0
  },
  resend_count: {
    type: Number,
    default: 0
  },
  locked_until: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
});

otpLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.otp_hash;
    return ret;
  }
});

module.exports = mongoose.model('OtpLog', otpLogSchema);
