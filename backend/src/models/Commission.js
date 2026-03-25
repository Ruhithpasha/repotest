const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  commission_id: {
    type: String,
    required: true,
    unique: true
  },
  rep_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  student_id: {
    type: String,
    required: true,
    ref: 'Student'
  },
  payment_id: {
    type: String,
    ref: 'StudentPayment'
  },
  // Commission calculation
  course_fee_gbp: {
    type: Number,
    required: true,
    default: 7999
  },
  commission_rate: {
    type: Number,
    required: true,
    default: 0.04 // 4%
  },
  commission_amount_gbp: {
    type: Number,
    required: true
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  },
  // Payment details
  payment_method: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'cash', 'other'],
    default: null
  },
  payment_reference: String,
  paid_at: Date,
  paid_by: String,
  // Notes
  notes: String,
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
commissionSchema.index({ rep_id: 1, status: 1 });
commissionSchema.index({ student_id: 1 });

module.exports = mongoose.model('Commission', commissionSchema);
