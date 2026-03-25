const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  enrollment_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  course_id: {
    type: String,
    required: true
  },
  payment_id: String,
  status: {
    type: String,
    default: 'active'
  },
  progress: {
    type: Number,
    default: 0
  },
  enrolled_at: {
    type: Date,
    default: Date.now
  }
});

enrollmentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);
