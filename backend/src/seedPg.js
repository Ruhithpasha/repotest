require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sequelize, User, Team, Program, CommissionRule } = require('./models/pg');

async function seed() {
  try {
    // Connect and sync
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
    
    await sequelize.sync({ alter: true });
    console.log('Tables synced');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create Super Admin
    const superAdminId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const [superAdmin, superAdminCreated] = await User.upsert({
      user_id: superAdminId,
      email: 'superadmin@plan4growth.uk',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin',
      is_active: true
    }, {
      conflictFields: ['email']
    });
    console.log('Super Admin:', superAdminCreated ? 'created' : 'updated');

    // 2. Create Admin user
    const [admin, adminCreated] = await User.upsert({
      user_id: `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      email: 'admin@plan4growth.uk',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      is_active: true
    }, {
      conflictFields: ['email']
    });
    console.log('Admin user:', adminCreated ? 'created' : 'updated');

    // 3. Create Manager user
    const managerId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const [manager, managerCreated] = await User.upsert({
      user_id: managerId,
      email: 'manager@plan4growth.uk',
      password: hashedPassword,
      name: 'Sales Manager',
      role: 'manager',
      is_active: true
    }, {
      conflictFields: ['email']
    });
    console.log('Manager:', managerCreated ? 'created' : 'updated');

    // 4. Create Sales User
    const salesId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const [sales, salesCreated] = await User.upsert({
      user_id: salesId,
      email: 'sales@plan4growth.uk',
      password: hashedPassword,
      name: 'Sales Rep',
      role: 'sales_user',
      is_active: true
    }, {
      conflictFields: ['email']
    });
    console.log('Sales User:', salesCreated ? 'created' : 'updated');

    // 5. Create Rep user (existing)
    const [rep, repCreated] = await User.upsert({
      user_id: `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      email: 'rep@plan4growth.uk',
      password: hashedPassword,
      name: 'Rep User',
      role: 'rep',
      referral_code: 'REP001',
      is_active: true
    }, {
      conflictFields: ['email']
    });
    console.log('Rep user:', repCreated ? 'created' : 'updated');

    // 6. Create Default Team
    const teamId = `team_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const existingTeam = await Team.findOne({ where: { name: 'Sales Team Alpha' } });
    if (!existingTeam) {
      await Team.create({
        team_id: teamId,
        name: 'Sales Team Alpha',
        description: 'Primary sales team for diploma program',
        manager_id: manager.user_id,
        created_by: superAdmin.user_id,
        is_active: true
      });
      console.log('Team created: Sales Team Alpha');

      // Assign sales user to team
      await User.update(
        { team_id: teamId, manager_id: manager.user_id },
        { where: { email: 'sales@plan4growth.uk' } }
      );
      console.log('Sales user assigned to team');
    } else {
      console.log('Team already exists: Sales Team Alpha');
    }

    // 7. Create Default Programs
    const programs = [
      {
        program_id: 'prog_diploma_l7',
        name: 'Level 7 Diploma in Dental Implantology',
        description: 'Comprehensive diploma program covering advanced implant procedures',
        price_gbp: 7999,
        duration_months: 12,
        commission_type: 'percentage',
        commission_value: 0.04,
        referral_commission_percent: 0.05,
        display_order: 1,
        is_active: true
      },
      {
        program_id: 'prog_implant_training',
        name: 'Implant Training Program',
        description: 'Hands-on training for dental professionals',
        price_gbp: 4999,
        duration_months: 6,
        commission_type: 'percentage',
        commission_value: 0.04,
        referral_commission_percent: 0.05,
        display_order: 2,
        is_active: true
      },
      {
        program_id: 'prog_short_course',
        name: 'Short Course - Basics of Implantology',
        description: 'Introductory course for beginners',
        price_gbp: 1999,
        duration_months: 3,
        commission_type: 'percentage',
        commission_value: 0.05,
        referral_commission_percent: 0.05,
        display_order: 3,
        is_active: true
      }
    ];

    for (const prog of programs) {
      const [program, created] = await Program.upsert(prog, {
        conflictFields: ['program_id']
      });
      console.log(`Program ${prog.name}: ${created ? 'created' : 'updated'}`);
    }

    // 8. Create Default Commission Rules
    const rules = [
      {
        rule_id: 'rule_sales_default',
        name: 'Default Sales Commission',
        description: 'Standard 10% commission for sales users',
        program_id: null, // Applies to all programs
        role_type: 'sales_user',
        commission_type: 'percentage',
        commission_value: 0.10,
        minimum_payment_status: 'paid_in_full',
        hold_days: 14,
        priority: 1,
        is_active: true
      },
      {
        rule_id: 'rule_rep_default',
        name: 'Default Rep Commission',
        description: 'Standard 4% commission for reps',
        program_id: null,
        role_type: 'rep',
        commission_type: 'percentage',
        commission_value: 0.04,
        minimum_payment_status: 'paid_in_full',
        hold_days: 14,
        priority: 1,
        is_active: true
      },
      {
        rule_id: 'rule_referrer_default',
        name: 'Default Referral Commission',
        description: 'Standard 5% referral commission for delegates',
        program_id: null,
        role_type: 'referrer',
        commission_type: 'percentage',
        commission_value: 0.05,
        minimum_payment_status: 'paid_in_full',
        hold_days: 30,
        priority: 1,
        is_active: true
      }
    ];

    for (const rule of rules) {
      const [commRule, created] = await CommissionRule.upsert(rule, {
        conflictFields: ['rule_id']
      });
      console.log(`Commission Rule ${rule.name}: ${created ? 'created' : 'updated'}`);
    }

    console.log('\n========== Test Credentials ==========');
    console.log('Super Admin: superadmin@plan4growth.uk / password123');
    console.log('Admin: admin@plan4growth.uk / password123');
    console.log('Manager: manager@plan4growth.uk / password123');
    console.log('Sales: sales@plan4growth.uk / password123');
    console.log('Rep: rep@plan4growth.uk / password123');
    console.log('=======================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
