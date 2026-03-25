const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  application_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: String,
  qualification: String,
  experience_years: Number,
  dental_registration: String,
  message: String,
  status: {
    type: String,
    default: 'pending'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

applicationSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Application', applicationSchema);
