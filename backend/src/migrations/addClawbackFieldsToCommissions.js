const { sequelize } = require('../config/postgres');

async function run() {
  try {
    // Create the enum type safely
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_commissions_clawback_status" AS ENUM('none', 'clawed_back', 'partially_clawed_back');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await sequelize.query(`
      ALTER TABLE commissions
        ADD COLUMN IF NOT EXISTS clawback_status "enum_commissions_clawback_status" DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS clawback_amount DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS clawback_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS clawback_rule_id INTEGER REFERENCES clawback_rules(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS clawback_reason TEXT
    `);

    console.log('[Migration] Clawback fields added to commissions table successfully');
  } catch (err) {
    console.error('[Migration] Error adding clawback fields:', err.message);
  } finally {
    await sequelize.close();
  }
}

run().catch(console.error);
