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

    console.log('Starting migration from spare_parts back to equipment...');

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get items that are actually equipment (codes starting with EQ- or those that were forced to SP- but user wants back)
        // For simplicity and based on user request "chuyển trở lại những bulk items của thiết bị", 
        // I will move everything that has 'EQ-' prefix.
        const [spItems] = await connection.query("SELECT * FROM spare_parts WHERE code LIKE 'EQ-%'");
        console.log(`Found ${spItems.length} items to move back.`);

        for (const item of spItems) {
            // Check if code already exists in equipment (to avoid duplicates)
            const [existing] = await connection.query("SELECT id FROM equipment WHERE code = ?", [item.code]);
            if (existing.length > 0) {
                console.log(`Item ${item.code} already exists in equipment, skipping or updating...`);
                await connection.query(
                    "UPDATE equipment SET current_quantity = ?, unit = ?, is_bulk = 1 WHERE code = ?",
                    [item.current_quantity, item.unit, item.code]
                );
            } else {
                await connection.query(
                    "INSERT INTO equipment (code, name, part_no, category_id, unit, current_quantity, min_stock, owner_company, status, is_bulk, is_at_hse) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [item.code, item.name, item.part_no, item.category_id, item.unit, item.current_quantity, item.min_stock, item.owner_company, item.status, 1, 1]
                );
            }
            // Delete from spare_parts
            await connection.query("DELETE FROM spare_parts WHERE id = ?", [item.id]);
        }

        await connection.commit();
        console.log('Migration completed successfully.');
    } catch (err) {
        await connection.rollback();
        console.error('Migration failed:', err.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

migrate();
