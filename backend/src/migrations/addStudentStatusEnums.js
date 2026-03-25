const { sequelize } = require('../models/pg');

async function runMigration() {
  const transaction = await sequelize.transaction();
  try {
    const newStatuses = [
      'call_booking_sent', 'call_booked', 'interview_completed',
      'qualified', 'payment_pending', 'paid_in_full',
      'commission_earned', 'commission_released',
      'refunded_reversed', 'clawback_required'
    ];
    const newQualStatuses = ['pending', 'passed', 'failed'];

    for (const val of newStatuses) {
      await sequelize.query(
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '${val}' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Students_status')) THEN ALTER TYPE "enum_Students_status" ADD VALUE '${val}'; END IF; END $$;`,
        { transaction }
      );
    }

    await sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Students_qualification_status') THEN
          CREATE TYPE "enum_Students_qualification_status" AS ENUM(${newQualStatuses.map(v => `'${v}'`).join(',')});
        END IF;
      END $$;
    `, { transaction });

    await transaction.commit();
    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
