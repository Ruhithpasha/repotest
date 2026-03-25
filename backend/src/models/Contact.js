const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  contact_id: {
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
  whatsapp: String,
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'new'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

contactSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Contact', contactSchema);
