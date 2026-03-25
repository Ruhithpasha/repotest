const mongoose = require('mongoose');

const studentDocumentSchema = new mongoose.Schema({
  document_id: {
    type: String,
    required: true,
    unique: true
  },
  student_id: {
    type: String,
    required: true
  },
  doc_type: {
    type: String,
    enum: ['bds_degree', 'bds_certificate', 'tenth_marksheet', '10th_marksheet', 'twelfth_marksheet', '12th_marksheet', 'passport_photo', 'photograph', 'id_proof', 'supporting'],
    required: true
  },
  file_url: String,
  storage_path: String, // Path in object storage
  file_name: String,
  file_size: Number,
  content_type: String,
  status: {
    type: String,
    enum: ['pending', 'uploaded', 'verified', 'rejected'],
    default: 'pending'
  },
  admin_comment: String,
  uploaded_by: String,
  uploaded_at: {
    type: Date,
    default: Date.now
  },
  verified_at: Date,
  verified_by: String
});

studentDocumentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('StudentDocument', studentDocumentSchema);
