const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  rep_id: {
    type: String,
    ref: 'User'
  },
  whatsapp_number: {
    type: String
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verified_at: Date,
  whatsapp_verified: {
    type: Boolean,
    default: false
  },
  whatsapp_verified_at: Date,
  dob: Date,
  city: String,
  state: String,
  dental_reg_number: String,
  experience_years: Number,
  course_id: {
    type: String,
    default: 'level7-implantology'
  },
  status: {
    type: String,
    enum: ['registered', 'documents_uploaded', 'under_review', 'approved', 'payment_pending', 'enrolled', 'rejected'],
    default: 'registered'
  },
  enrollment_number: String,
  admin_feedback: String,
  approved_at: Date,
  approved_by: String,
  enrolled_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

studentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Student', studentSchema);
