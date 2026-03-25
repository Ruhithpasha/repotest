require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'test_database';
const FULL_URL = `${MONGO_URL}/${DB_NAME}`;

const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: String,
  name: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['admin', 'rep', 'student'], default: 'student' },
  created_by: String,
  is_active: { type: Boolean, default: true },
  temp_password: String,
  password_changed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function seed() {
  try {
    await mongoose.connect(FULL_URL);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin user
    const admin = await User.create({
      user_id: uuidv4(),
      email: 'admin@plan4growth.uk',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      is_active: true
    });
    console.log('Created admin:', admin.email);

    // Create rep user
    const rep = await User.create({
      user_id: uuidv4(),
      email: 'rep@plan4growth.uk',
      password: hashedPassword,
      name: 'Rep User',
      role: 'rep',
      is_active: true,
      created_by: admin.user_id
    });
    console.log('Created rep:', rep.email);

    console.log('\n=== Test Credentials ===');
    console.log('Admin: admin@plan4growth.uk / password123');
    console.log('Rep: rep@plan4growth.uk / password123');
    console.log('========================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
