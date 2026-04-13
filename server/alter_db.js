const mysql = require('mysql2/promise');
require('dotenv').config();

async function runAlter() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        await pool.query('ALTER TABLE equipment ADD COLUMN is_bulk BOOLEAN DEFAULT FALSE;');
        console.log('Thêm cột is_bulk thành công.');
    } catch (e) { console.log('is_bulk có thể đã tồn tại.', e.message); }

    try {
        await pool.query('ALTER TABLE equipment ADD COLUMN current_quantity INT DEFAULT 1;');
        console.log('Thêm cột current_quantity thành công.');
    } catch (e) { console.log('current_quantity có thể đã tồn tại.', e.message); }

    try {
        await pool.query('ALTER TABLE transactions ADD COLUMN related_person VARCHAR(255) DEFAULT "";');
        console.log('Thêm cột related_person thành công.');
    } catch (e) { console.log('related_person có thể đã tồn tại.', e.message); }

    try {
        await pool.query('ALTER TABLE transactions ADD COLUMN batch_code VARCHAR(50);');
        console.log('Thêm cột batch_code thành công.');
    } catch (e) { console.log('batch_code có thể đã tồn tại.', e.message); }

    try {
        await pool.query('ALTER TABLE transactions ADD COLUMN purpose VARCHAR(255);');
        console.log('Thêm cột purpose thành công.');
    } catch (e) { console.log('purpose có thể đã tồn tại.', e.message); }

    process.exit(0);
}
runAlter();
