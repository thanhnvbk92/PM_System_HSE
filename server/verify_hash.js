const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function verify() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Đang kiểm tra mã Hash trực tiếp ---');
        const [rows] = await pool.query('SELECT * FROM users WHERE username = "admin"');

        if (rows.length === 0) {
            console.error('❌ KHÔNG TÌM THẤY user admin trong Database!');
            return;
        }

        const user = rows[0];
        console.log('User found:', user.username);
        console.log('Role:', user.role);
        console.log('Status:', user.status);
        console.log('Hashed Password in DB:', user.password);

        const match = await bcrypt.compare('admin123', user.password);
        console.log('--- KẾT QUẢ SO SÁNH ---');
        if (match) {
            console.log('✅ Mật khẩu "admin123" KHỚP với mã Hash trong DB!');
        } else {
            console.error('❌ Mật khẩu "admin123" KHÔNG KHỚP với mã Hash!');

            // Thử tạo một hash mới và so sánh lại ngay lập tức để debug
            const newHash = await bcrypt.hash('admin123', 10);
            const secondMatch = await bcrypt.compare('admin123', newHash);
            console.log('Mã hash mới tạo:', newHash);
            console.log('So sánh hash mới:', secondMatch ? 'OK' : 'FAIL');
        }

    } catch (err) {
        console.error('❌ Lỗi truy vấn:', err.message);
    } finally {
        await pool.end();
    }
}

verify();
