const { sequelize } = require('../config/postgres');

async function run() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS clawback_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        clawback_window_days INTEGER NOT NULL,
        clawback_percentage DECIMAL(5,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[Migration] clawback_rules table created successfully');
  } catch (err) {
    console.error('[Migration] Error creating clawback_rules:', err.message);
  } finally {
    await sequelize.close();
  }
}

run().catch(console.error);
