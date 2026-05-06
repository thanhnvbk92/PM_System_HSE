const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function runMigration() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    console.log('Starting migration...');

    try {
        // Equipment Table Changes
        console.log('Updating equipment table...');

        // Add unit column
        try {
            await pool.query('ALTER TABLE equipment ADD COLUMN unit VARCHAR(20) DEFAULT "ea";');
            console.log('- Added unit column to equipment.');
        } catch (e) { console.log('- unit column in equipment might already exist.'); }

        // Change current_quantity to DECIMAL
        try {
            await pool.query('ALTER TABLE equipment MODIFY COLUMN current_quantity DECIMAL(14,4) DEFAULT 1.0000;');
            console.log('- Modified current_quantity to DECIMAL(14,4).');
        } catch (e) { console.error('- Error modifying current_quantity:', e.message); }

        // Transactions Table Changes
        console.log('Updating transactions table...');

        // Add unit column
        try {
            await pool.query('ALTER TABLE transactions ADD COLUMN unit VARCHAR(20) DEFAULT "ea";');
            console.log('- Added unit column to transactions.');
        } catch (e) { console.log('- unit column in transactions might already exist.'); }

        // Change quantity to DECIMAL
        try {
            await pool.query('ALTER TABLE transactions MODIFY COLUMN quantity DECIMAL(14,4) DEFAULT 1.0000;');
            console.log('- Modified quantity to DECIMAL(14,4).');
        } catch (e) { console.error('- Error modifying quantity:', e.message); }

        // Add scrap_weight and scrap_unit
        try {
            await pool.query('ALTER TABLE transactions ADD COLUMN scrap_weight DECIMAL(14,4) DEFAULT 0.0000;');
            console.log('- Added scrap_weight column.');
        } catch (e) { console.log('- scrap_weight column might already exist.'); }

        try {
            await pool.query("ALTER TABLE transactions MODIFY COLUMN type ENUM('Import', 'Export', 'Return', 'Dispose', 'Scrap') NOT NULL;");
            console.log('- Updated transactions type ENUM to include Scrap.');
        } catch (e) { console.error('- Error updating transactions type ENUM:', e.message); }

        try {
            await pool.query('ALTER TABLE transactions ADD COLUMN scrap_unit VARCHAR(20) DEFAULT "kg";');
            console.log('- Added scrap_unit column.');
        } catch (e) { console.log('- scrap_unit column might already exist.'); }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

runMigration();
