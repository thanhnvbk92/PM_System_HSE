const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupAdmin() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        const hash = await bcrypt.hash('admin123', 10);

        // Kiểm tra xem admin đã tồn tại chưa
        const [rows] = await pool.query('SELECT * FROM users WHERE username = "admin"');

        if (rows.length > 0) {
            await pool.query('UPDATE users SET password = ?, status = "approved" WHERE username = "admin"', [hash]);
            console.log('✅ Admin password updated to "admin123"');
        } else {
            await pool.query(
                'INSERT INTO users (username, password, full_name, role, status) VALUES (?, ?, ?, ?, ?)',
                ['admin', hash, 'System Admin', 'admin', 'approved']
            );
            console.log('✅ Admin user created with password "admin123"');
        }
    } catch (err) {
        console.error('❌ Error updating admin:', err.message);
    } finally {
        await pool.end();
    }
}

setupAdmin();
