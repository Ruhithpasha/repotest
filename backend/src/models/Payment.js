const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  payment_id: {
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
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'GBP'
  },
  payment_type: {
    type: String,
    default: 'full'
  },
  status: {
    type: String,
    default: 'pending'
  },
  stripe_intent_id: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  completed_at: Date
});

paymentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
