const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  session_token: {
    type: String,
    required: true,
    unique: true
  },
  expires_at: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

sessionSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('UserSession', sessionSchema);
