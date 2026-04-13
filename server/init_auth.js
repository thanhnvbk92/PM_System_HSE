const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initAuth() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Đang khởi tạo hệ thống Auth ---');

        // 1. Tạo bảng users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                role ENUM('admin', 'user') DEFAULT 'user',
                status ENUM('pending', 'approved') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Bảng "users" đã sẵn sàng.');

        // 2. Tạo tài khoản admin
        const hash = await bcrypt.hash('admin123', 10);
        const [rows] = await pool.query('SELECT * FROM users WHERE username = "admin"');

        if (rows.length > 0) {
            await pool.query('UPDATE users SET password = ?, status = "approved", role = "admin" WHERE username = "admin"', [hash]);
            console.log('✅ Cập nhật mật khẩu Admin thành "admin123".');
        } else {
            await pool.query(
                'INSERT INTO users (username, password, full_name, role, status) VALUES (?, ?, ?, ?, ?)',
                ['admin', hash, 'System Admin', 'admin', 'approved']
            );
            console.log('✅ Đã tạo tài khoản Admin mặc định (Pass: admin123).');
        }
    } catch (err) {
        console.error('❌ Lỗi khởi tạo Auth:', err.message);
    } finally {
        await pool.end();
    }
}

initAuth();
