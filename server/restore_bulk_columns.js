const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    console.log('Starting migration to restore bulk columns in equipment table...');

    try {
        const queries = [
            "ALTER TABLE equipment ADD COLUMN is_bulk BOOLEAN DEFAULT FALSE",
            "ALTER TABLE equipment ADD COLUMN current_quantity DECIMAL(15,4) DEFAULT 1.0000",
            "ALTER TABLE equipment ADD COLUMN unit VARCHAR(50) DEFAULT 'ea'",
            "ALTER TABLE equipment ADD COLUMN min_stock DECIMAL(15,4) DEFAULT 0.0000"
        ];

        for (const query of queries) {
            try {
                await pool.query(query);
                console.log(`Executed: ${query}`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`Column already exists: ${query.split('ADD COLUMN ')[1].split(' ')[0]}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
