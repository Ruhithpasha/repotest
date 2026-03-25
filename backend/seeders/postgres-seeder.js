/**
 * PostgreSQL Database Seeder
 * Creates test data for Plan4Growth Academy
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../src/config/postgres');
const { 
  User, Student, Commission, CommissionRule, Team, Program,
  Lead, Referral, AuditLog, Payout, FraudAlert, Manager 
} = require('../src/models/pg');

const generateId = (prefix) => `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Models synced');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create Super Admin
    const superAdminId = generateId('user');
    await User.findOrCreate({
      where: { email: 'superadmin@plan4growth.uk' },
      defaults: {
        user_id: superAdminId,
        email: 'superadmin@plan4growth.uk',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'super_admin',
        is_active: true
      }
    });
    console.log('Created Super Admin');
    
    // Create Admin
    const adminId = generateId('user');
    await User.findOrCreate({
      where: { email: 'admin@plan4growth.uk' },
      defaults: {
        user_id: adminId,
        email: 'admin@plan4growth.uk',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        is_active: true
      }
    });
    console.log('Created Admin');
    
    // Create Manager
    const managerId = generateId('user');
    const [managerUser] = await User.findOrCreate({
      where: { email: 'manager@plan4growth.uk' },
      defaults: {
        user_id: managerId,
        email: 'manager@plan4growth.uk',
        password: hashedPassword,
        name: 'Manager User',
        role: 'manager',
        is_active: true
      }
    });
    console.log('Created Manager');
    
    // Create Rep/Sales User
    const repId = generateId('user');
    const [repUser] = await User.findOrCreate({
      where: { email: 'rep@plan4growth.uk' },
      defaults: {
        user_id: repId,
        email: 'rep@plan4growth.uk',
        password: hashedPassword,
        name: 'Sales Rep',
        role: 'rep',
        manager_id: managerUser.user_id,
        is_active: true
      }
    });
    console.log('Created Rep');
    
    // Create Enrolled Student with referral code
    const enrolledStudentUserId = generateId('user');
    const enrolledStudentId = generateId('student');
    const [enrolledStudentUser] = await User.findOrCreate({
      where: { email: 'enrolled@plan4growth.uk' },
      defaults: {
        user_id: enrolledStudentUserId,
        email: 'enrolled@plan4growth.uk',
        password: hashedPassword,
        name: 'Enrolled Student',
        role: 'student',
        referral_code: 'P4G-TEST1234',
        is_active: true
      }
    });
    
    await Student.findOrCreate({
      where: { user_id: enrolledStudentUser.user_id },
      defaults: {
        student_id: enrolledStudentId,
        user_id: enrolledStudentUser.user_id,
        rep_id: repUser.user_id,
        whatsapp_number: '+447123456789',
        status: 'enrolled',
        enrollment_number: 'P4G-2024-0001',
        enrolled_at: new Date()
      }
    });
    console.log('Created Enrolled Student with referral code P4G-TEST1234');
    
    // Create Pending Student
    const pendingStudentUserId = generateId('user');
    const pendingStudentId = generateId('student');
    const [pendingStudentUser] = await User.findOrCreate({
      where: { email: 'pending@plan4growth.uk' },
      defaults: {
        user_id: pendingStudentUserId,
        email: 'pending@plan4growth.uk',
        password: hashedPassword,
        name: 'Pending Student',
        role: 'student',
        is_active: false
      }
    });
    
    await Student.findOrCreate({
      where: { user_id: pendingStudentUser.user_id },
      defaults: {
        student_id: pendingStudentId,
        user_id: pendingStudentUser.user_id,
        rep_id: repUser.user_id,
        whatsapp_number: '+447987654321',
        status: 'approved'
      }
    });
    console.log('Created Pending Student');
    
    // Create Program
    await Program.findOrCreate({
      where: { program_id: 'level7-implantology' },
      defaults: {
        program_id: 'level7-implantology',
        name: 'Level 7 Diploma in Dental Implantology',
        description: 'UK-accredited diploma programme',
        price_gbp: 7999,
        duration_months: 12,
        is_active: true
      }
    });
    console.log('Created Program');
    
    // Create Commission Rules
    await CommissionRule.findOrCreate({
      where: { name: 'Rep Commission' },
      defaults: {
        rule_id: generateId('rule'),
        name: 'Rep Commission',
        description: 'Standard rep commission - 4%',
        role_type: 'rep',
        commission_type: 'percentage',
        commission_value: 0.04,
        hold_days: 14,
        is_active: true,
        priority: 100
      }
    });
    
    await CommissionRule.findOrCreate({
      where: { name: 'Manager Commission' },
      defaults: {
        rule_id: generateId('rule'),
        name: 'Manager Commission',
        description: 'Manager override - 1%',
        role_type: 'manager',
        commission_type: 'percentage',
        commission_value: 0.01,
        hold_days: 14,
        is_active: true,
        priority: 90
      }
    });
    
    await CommissionRule.findOrCreate({
      where: { name: 'Referral Bonus' },
      defaults: {
        rule_id: generateId('rule'),
        name: 'Referral Bonus',
        description: 'Student referral flat bonus - £50',
        role_type: 'referrer',
        commission_type: 'fixed',
        commission_value: 50,
        hold_days: 14,
        is_active: true,
        priority: 80
      }
    });
    console.log('Created Commission Rules');
    
    // Create Team
    await Team.findOrCreate({
      where: { name: 'Alpha Team' },
      defaults: {
        team_id: generateId('team'),
        name: 'Alpha Team',
        manager_id: managerUser.user_id,
        is_active: true
      }
    });
    console.log('Created Team');
    
    console.log('\n========================================');
    console.log('Database seeding completed successfully!');
    console.log('========================================\n');
    console.log('Test Credentials:');
    console.log('  Super Admin: superadmin@plan4growth.uk / password123');
    console.log('  Admin: admin@plan4growth.uk / password123');
    console.log('  Manager: manager@plan4growth.uk / password123');
    console.log('  Rep: rep@plan4growth.uk / password123');
    console.log('  Enrolled Student: enrolled@plan4growth.uk / password123 (has referral code: P4G-TEST1234)');
    console.log('  Pending Student: pending@plan4growth.uk / password123');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
