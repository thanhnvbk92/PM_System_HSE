const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function runMigration() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    console.log('Starting Category migration...');

    try {
        // 1. Create categories table
        console.log('1. Creating categories table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Fetch existing unique categories from equipment
        console.log('2. Migrating existing category strings...');
        const [existingCategories] = await pool.query('SELECT DISTINCT category FROM equipment WHERE category IS NOT NULL AND category != ""');

        for (const row of existingCategories) {
            try {
                await pool.query('INSERT IGNORE INTO categories (name) VALUES (?)', [row.category]);
            } catch (e) {
                console.log(`   - Could not insert category "${row.category}":`, e.message);
            }
        }

        // 3. Add category_id column to equipment
        console.log('3. Adding category_id to equipment table...');
        try {
            await pool.query('ALTER TABLE equipment ADD COLUMN category_id INT;');
            await pool.query('ALTER TABLE equipment ADD CONSTRAINT fk_equipment_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;');
        } catch (e) {
            console.log('   - column category_id likely already exists.');
        }

        // 4. Update category_id based on string match
        console.log('4. Linking existing equipment to category IDs...');
        const [allCats] = await pool.query('SELECT id, name FROM categories');
        for (const cat of allCats) {
            await pool.query('UPDATE equipment SET category_id = ? WHERE category = ?', [cat.id, cat.name]);
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

runMigration();
