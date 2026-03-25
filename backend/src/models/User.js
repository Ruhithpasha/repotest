const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  phone: String,
  picture: String,
  role: {
    type: String,
    enum: ['admin', 'rep', 'student'],
    default: 'student'
  },
  created_by: {
    type: String,
    ref: 'User'
  },
  is_active: {
    type: Boolean,
    default: true  // Admin/Rep are active by default, students set to false when created by rep
  },
  temp_password: String, // Temporary password for students (plain text for email, will be removed after first login)
  password_changed: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Transform for JSON - remove _id and password
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
