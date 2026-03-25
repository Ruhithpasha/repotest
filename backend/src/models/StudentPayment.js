const mongoose = require('mongoose');

const studentPaymentSchema = new mongoose.Schema({
  payment_id: {
    type: String,
    required: true,
    unique: true
  },
  student_id: {
    type: String,
    required: true
  },
  stripe_payment_intent_id: String,
  amount_gbp: {
    type: Number,
    required: true
  },
  payment_type: {
    type: String,
    enum: ['full', 'installment', 'manual'],
    default: 'full'
  },
  installment_number: {
    type: Number,
    enum: [1, 2],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['stripe', 'bank_transfer', 'cash', 'other'],
    default: 'stripe'
  },
  reference_number: String,
  notes: String,
  receipt_url: String,
  paid_at: Date,
  recorded_by: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

studentPaymentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('StudentPayment', studentPaymentSchema);
