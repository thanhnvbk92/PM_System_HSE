const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log("Checking DB connection and query syntax...");
        const [rows] = await pool.query("SELECT id FROM contacts WHERE name = ? AND (company = ? OR (? = '' AND company IS NULL))", ['test', '', '']);
        console.log("Results: ", rows);

        console.log("Trying pseudo-INSERT...");
        await pool.query('INSERT IGNORE INTO contacts (name, position, department, company) VALUES (?, ?, ?, ?)', ['test', '', '', '']);
        console.log("Inserted.");
    } catch (e) {
        console.error('SQL Error:', e.message);
    }
    process.exit(0);
}
check();
