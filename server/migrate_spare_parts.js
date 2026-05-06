const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Anduongb67',
    database: 'PMSystemDB'
};

async function migrate() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Starting Spare Parts Migration ---');

        // 1. Create spare_parts table
        console.log('1. Creating spare_parts table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS spare_parts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                part_no VARCHAR(100),
                specification TEXT,
                category_id INT,
                unit VARCHAR(20) DEFAULT 'ea',
                current_quantity DECIMAL(15,4) DEFAULT 0,
                min_stock DECIMAL(15,4) DEFAULT 0,
                owner_company VARCHAR(255) DEFAULT 'LGE',
                image_url TEXT,
                status VARCHAR(50) DEFAULT 'OK',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 2. Update transactions table
        console.log('2. Updating transactions table...');
        try {
            await connection.execute('ALTER TABLE transactions ADD COLUMN spare_part_id INT NULL');
            await connection.execute('ALTER TABLE transactions MODIFY COLUMN equipment_id INT NULL');
            await connection.execute('ALTER TABLE transactions ADD COLUMN is_internal BOOLEAN DEFAULT FALSE');
            console.log('Columns added to transactions.');
        } catch (err) {
            console.log('Columns might already exist in transactions.');
        }

        // 3. Migrate data from equipment (is_bulk = 1)
        console.log('3. Migrating data from equipment to spare_parts...');
        const [bulkItems] = await connection.execute('SELECT * FROM equipment WHERE is_bulk = 1');

        for (const item of bulkItems) {
            console.log(`Migrating item: ${item.code} - ${item.name}`);
            try {
                // Insert into spare_parts
                await connection.execute(
                    'INSERT IGNORE INTO spare_parts (code, name, part_no, category_id, unit, current_quantity, min_stock, owner_company, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [item.code, item.name, item.part_no, item.category_id, item.unit, item.current_quantity, item.min_stock, item.owner_company, item.image_url, item.status]
                );

                // Update transactions to link to new spare_part_id
                const [newPart] = await connection.execute('SELECT id FROM spare_parts WHERE code = ?', [item.code]);
                if (newPart.length > 0) {
                    await connection.execute(
                        'UPDATE transactions SET spare_part_id = ?, equipment_id = NULL WHERE equipment_id = ?',
                        [newPart[0].id, item.id]
                    );
                }
            } catch (err) {
                console.error(`Error migrating ${item.code}:`, err.message);
            }
        }

        // 4. Delete bulk items from equipment
        console.log('4. Cleaning up equipment table...');
        await connection.execute('DELETE FROM equipment WHERE is_bulk = 1');

        // 5. Success
        console.log('--- Migration completed successfully ---');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
