const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  document_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  filename: String,
  file_type: String,
  file_size: Number,
  category: {
    type: String,
    default: 'general'
  },
  status: {
    type: String,
    default: 'uploaded'
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});

documentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Document', documentSchema);
