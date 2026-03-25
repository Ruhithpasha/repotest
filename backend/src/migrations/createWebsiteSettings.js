/**
 * Migration: Create website_settings table
 */
const { sequelize } = require('../config/postgres');

async function up() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS website_settings (
        id SERIAL PRIMARY KEY,
        section VARCHAR(100) NOT NULL UNIQUE,
        content JSONB NOT NULL DEFAULT '{}',
        updated_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index on section for faster lookups
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_website_settings_section ON website_settings(section);
    `);
    
    console.log('Migration successful: website_settings table created');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

async function down() {
  try {
    await sequelize.query('DROP TABLE IF EXISTS website_settings;');
    console.log('Rollback successful: website_settings table dropped');
  } catch (error) {
    console.error('Rollback failed:', error.message);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { up, down };
