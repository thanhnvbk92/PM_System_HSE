const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const SECRET_KEY = process.env.JWT_SECRET || 'pm_system_secret_key_2026';
app.use(cors({ origin: '*' }));
app.use(express.json());

// Thiết lập static route cho thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cấu hình Multer dùng bộ nhớ tạm để Sharp xử lý
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 5000;
const ADMIN_KEY = 'admin123'; // Đơn giản cho bản demo

// Kết nối MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware bảo mật mới dùng JWT
const authMiddleware = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Truy cập bị từ chối' });

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        req.user = verified;
        next();
    } catch (err) {
        console.error(`[AUTH] Lỗi xác thực:`, err.name, err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token đã hết hạn, vui lòng đăng nhập lại' });
        }
        res.status(401).json({ error: 'Phiên làm việc không hợp lệ hoặc đã hết hạn' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Quyền Admin mới được thực hiện' });
    }
    next();
};

const adminAuth = [authMiddleware, adminOnly]; // Tương thích với các route cũ

// --- API AUTH ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password, full_name, employee_id, position, department } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, full_name, employee_id, position, department, role, status) VALUES (?, ?, ?, ?, ?, ?, "user", "pending")',
            [username, hashedPassword, full_name, employee_id || '', position || '', department || '']
        );
        res.json({ message: 'Đăng ký thành công, vui lòng chờ Admin phê duyệt.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[AUTH] Thử đăng nhập: ${username}`);
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            console.log(`[AUTH] Thất bại: Không tìm thấy username ${username}`);
            return res.status(401).json({ error: 'Tài khoản không tồn tại' });
        }

        const user = users[0];
        console.log(`[AUTH] Tìm thấy user: ${user.username}, Trạng thái: ${user.status}`);

        if (user.status !== 'approved') {
            console.log(`[AUTH] Thất bại: Tài khoản chưa được duyệt`);
            return res.status(403).json({ error: 'Tài khoản đang chờ duyệt hoặc đã bị khóa' });
        }

        const validPass = await bcrypt.compare(password, user.password);
        console.log(`[AUTH] Kiểm tra mật khẩu: ${validPass ? 'Đúng' : 'Sai'}`);

        if (!validPass) return res.status(401).json({ error: 'Mật khẩu sai' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, employee_id: user.employee_id, position: user.position, department: user.department, full_name: user.full_name }, SECRET_KEY, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, employee_id: user.employee_id, position: user.position, department: user.department } });
    } catch (e) {
        console.error(`[AUTH] Lỗi hệ thống:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, full_name, role, status, created_at FROM users');
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/approve', adminAuth, async (req, res) => {
    try {
        await pool.query('UPDATE users SET status = "approved" WHERE id = ?', [req.params.id]);
        res.json({ message: 'Người dùng đã được phê duyệt' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/role', adminAuth, async (req, res) => {
    const { role } = req.body;
    try {
        await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'Cập nhật vai trò thành công' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'Xóa người dùng thành công' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json(req.user);
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    try {
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        const validPass = await bcrypt.compare(currentPassword, users[0].password);
        if (!validPass) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
        res.json({ message: 'Mật khẩu đã được thay đổi thành công' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- API UPLOAD ---
app.post('/api/upload', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

        const outputPath = path.join(uploadPath, fileName);

        // Nén và resize ảnh bằng Sharp trước khi lưu
        await sharp(req.file.buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .toFormat('jpeg', { quality: 80 })
            .toFile(outputPath);

        const imageUrl = `/uploads/${fileName}`;
        res.json({ url: imageUrl });
    } catch (e) {
        console.error('Upload Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- API LOGIC ---

// --- API CONTACTS ---
app.get('/api/contacts', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contacts ORDER BY name ASC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/contacts', authMiddleware, async (req, res) => {
    const { name, position, department, company } = req.body;
    console.log(`[CONTACTS] Thử lưu: ${name} (${company || 'No Company'})`);
    try {
        const [existing] = await pool.query('SELECT id FROM contacts WHERE name = ? AND (company = ? OR (? = \'\' AND company IS NULL))', [name, company || '', company || '']);
        if (existing.length > 0) {
            console.log(`[CONTACTS] Update ID: ${existing[0].id}`);
            await pool.query('UPDATE contacts SET position = ?, department = ?, company = ? WHERE id = ?', [position || '', department || '', company || '', existing[0].id]);
            return res.json({ id: existing[0].id, message: 'Contact updated' });
        }

        const [result] = await pool.query(
            'INSERT INTO contacts (name, position, department, company) VALUES (?, ?, ?, ?)',
            [name, position || '', department || '', company || '']
        );
        console.log(`[CONTACTS] Insert thành công: ${result.insertId}`);
        res.json({ id: result.insertId, message: 'Contact added' });
    } catch (e) {
        console.error(`[CONTACTS] Lỗi:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

// 1. Lọc & Lấy Location
app.get('/api/locations/lines', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM `lines`');
    res.json(rows);
});

app.get('/api/locations/stations', async (req, res) => {
    const [rows] = await pool.query('SELECT s.*, l.name as line_name FROM stations s JOIN `lines` l ON s.line_id = l.id');
    res.json(rows);
});

app.get('/api/locations/stations/:lineId', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM stations WHERE line_id = ?', [req.params.lineId]);
    res.json(rows);
});

app.get('/api/locations/jigs', async (req, res) => {
    const [rows] = await pool.query(`
        SELECT j.*, s.name as station_name, l.name as line_name 
        FROM jigs j 
        JOIN stations s ON j.station_id = s.id 
        JOIN \`lines\` l ON s.line_id = l.id
    `);
    res.json(rows);
});

app.get('/api/locations/jigs/:stationId', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM jigs WHERE station_id = ?', [req.params.stationId]);
    res.json(rows);
});

// 2. CRUD cho Lines (Admin only)
app.post('/api/locations/lines', adminAuth, async (req, res) => {
    const { name } = req.body;
    console.log(`[LINES] Thử thêm: ${name}`);
    try {
        const [result] = await pool.query('INSERT INTO `lines` (name) VALUES (?)', [name]);
        res.json({ id: result.insertId, message: 'Line added' });
    } catch (e) {
        console.error(`[LINES] Lỗi thêm:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/locations/lines/:id', adminAuth, async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('UPDATE `lines` SET name = ? WHERE id = ?', [name, req.params.id]);
        res.json({ message: 'Line updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/locations/lines/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM `lines` WHERE id = ?', [req.params.id]);
        res.json({ message: 'Line deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. CRUD cho Stations (Admin only)
app.post('/api/locations/stations', adminAuth, async (req, res) => {
    const { name, line_id } = req.body;
    console.log(`[STATIONS] Thử thêm: ${name} vào Line: ${line_id}`);
    try {
        const [result] = await pool.query('INSERT INTO stations (name, line_id) VALUES (?, ?)', [name, line_id]);
        res.json({ id: result.insertId, message: 'Station added' });
    } catch (e) {
        console.error(`[STATIONS] Lỗi thêm:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/locations/stations/:id', adminAuth, async (req, res) => {
    const { name, line_id } = req.body;
    try {
        await pool.query('UPDATE stations SET name = ?, line_id = ? WHERE id = ?', [name, line_id, req.params.id]);
        res.json({ message: 'Station updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/locations/stations/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM stations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Station deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. CRUD cho Jigs (Admin only)
app.post('/api/locations/jigs', adminAuth, async (req, res) => {
    const { name, station_id, ip_address, gmes_name } = req.body;
    console.log(`[JIGS] Thử thêm: ${name} vào Station: ${station_id}`);
    try {
        const [result] = await pool.query('INSERT INTO jigs (name, station_id, ip_address, gmes_name) VALUES (?, ?, ?, ?)', [name, station_id, ip_address || '', gmes_name || '']);
        res.json({ id: result.insertId, message: 'Jig added' });
    } catch (e) {
        console.error(`[JIGS] Lỗi thêm:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/locations/jigs/:id', adminAuth, async (req, res) => {
    const { name, station_id, ip_address, gmes_name } = req.body;
    try {
        await pool.query('UPDATE jigs SET name = ?, station_id = ?, ip_address = ?, gmes_name = ? WHERE id = ?', [name, station_id, ip_address || '', gmes_name || '', req.params.id]);
        res.json({ message: 'Jig updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/locations/jigs/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM jigs WHERE id = ?', [req.params.id]);
        res.json({ message: 'Jig deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4.5. Quản lý Danh mục (New)
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', adminAuth, async (req, res) => {
    const { name, description } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
        res.json({ id: result.insertId, name });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/categories/:id', adminAuth, async (req, res) => {
    const { name, description } = req.body;
    try {
        await pool.query('UPDATE categories SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
        res.json({ message: 'Category updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Quản lý Thiết bị
app.get('/api/equipment', async (req, res) => {
    const [rows] = await pool.query(`
        SELECT e.*, j.name as jig_name, s.name as station_name, l.name as line_name, c.name as category_name,
               s.line_id as line_id, j.station_id as station_id
        FROM equipment e 
        LEFT JOIN jigs j ON e.jig_id = j.id 
        LEFT JOIN stations s ON j.station_id = s.id 
        LEFT JOIN \`lines\` l ON s.line_id = l.id 
        LEFT JOIN categories c ON e.category_id = c.id
        ORDER BY e.created_at DESC
    `);
    res.json(rows);
});

app.post('/api/equipment', async (req, res) => {
    let { code, name, part_no, serial_no, asset_type, category, category_id, owner_company, status, jig_id, is_calibrated, expiry_date, last_calibration, image_url, is_bulk, current_quantity, unit, min_stock } = req.body;

    if (!code || code.trim() === '') {
        code = 'EQ-' + Date.now().toString().slice(-5);
    }
    const final_jig_id = (jig_id === '' || jig_id === 0) ? null : jig_id;
    const final_expiry = (expiry_date === '' || expiry_date === null) ? null : expiry_date;
    const final_last_cal = (last_calibration === '' || last_calibration === null) ? null : last_calibration;

    try {
        const cleanPN = (part_no || '').trim();
        const cleanSN = (serial_no || '').trim();

        if (cleanPN && cleanSN) {
            const [existing] = await pool.query(
                'SELECT * FROM equipment WHERE TRIM(part_no) = ? AND TRIM(serial_no) = ?',
                [cleanPN, cleanSN]
            );
            if (existing.length > 0) {
                return res.status(409).json({
                    error: 'Thiết bị đã tồn tại (Duplicate PN/SN)',
                    existing: existing[0]
                });
            }
        }

        const [result] = await pool.query(
            'INSERT INTO equipment (code, name, part_no, serial_no, asset_type, category, category_id, owner_company, status, is_at_hse, jig_id, is_calibrated, expiry_date, last_calibration, image_url, is_bulk, current_quantity, unit, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [code, name, part_no, serial_no, asset_type, category || '', category_id || null, owner_company || '', status || 'OK', 1, final_jig_id, is_calibrated || false, final_expiry, final_last_cal, image_url || '', is_bulk || false, current_quantity || 1.0, unit || 'ea', min_stock || 0.0]
        );
        res.json({ id: result.insertId, code: code });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/equipment/:id', async (req, res) => {
    let { code, name, part_no, serial_no, asset_type, category, category_id, owner_company, status, jig_id, is_calibrated, expiry_date, last_calibration, image_url, is_bulk, current_quantity, unit, min_stock } = req.body;

    const final_jig_id = (jig_id === '' || jig_id === 0) ? null : jig_id;
    const final_expiry = (expiry_date === '' || expiry_date === null) ? null : expiry_date;
    const final_last_cal = (last_calibration === '' || last_calibration === null) ? null : last_calibration;

    try {
        await pool.query(
            'UPDATE equipment SET code = ?, name = ?, part_no = ?, serial_no = ?, asset_type = ?, category = ?, category_id = ?, owner_company = ?, status = ?, jig_id = ?, is_calibrated = ?, expiry_date = ?, last_calibration = ?, image_url = ?, is_bulk = ?, current_quantity = ?, unit = ?, min_stock = ? WHERE id = ?',
            [code, name, part_no, serial_no, asset_type, category, category_id || null, owner_company, status, final_jig_id, is_calibrated || false, final_expiry, final_last_cal, image_url, is_bulk, current_quantity, unit, min_stock, req.params.id]
        );
        res.json({ message: 'Equipment updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5.1 Quản lý Spare Parts (Mới)
app.get('/api/spare-parts', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT sp.*, c.name as category_name
            FROM spare_parts sp
            LEFT JOIN categories c ON sp.category_id = c.id
            ORDER BY sp.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/spare-parts', async (req, res) => {
    let { code, name, part_no, specification, category_id, unit, current_quantity, min_stock, owner_company, image_url, status } = req.body;

    if (!code || code.trim() === '') {
        const dateStr = Date.now().toString().slice(-6);
        code = 'SP-' + dateStr;
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO spare_parts (code, name, part_no, specification, category_id, unit, current_quantity, min_stock, owner_company, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [code, name, part_no, specification || '', category_id || null, unit || 'ea', parseFloat(current_quantity) || 0, parseFloat(min_stock) || 0, owner_company || 'HSE', image_url || '', status || 'OK']
        );
        res.json({ id: result.insertId, code: code });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/spare-parts/:id', async (req, res) => {
    let { code, name, part_no, specification, category_id, unit, current_quantity, min_stock, owner_company, image_url, status } = req.body;
    try {
        await pool.query(
            'UPDATE spare_parts SET code = ?, name = ?, part_no = ?, specification = ?, category_id = ?, unit = ?, current_quantity = ?, min_stock = ?, owner_company = ?, image_url = ?, status = ? WHERE id = ?',
            [code, name, part_no, specification, category_id || null, unit, current_quantity, min_stock, owner_company, image_url, status, req.params.id]
        );
        res.json({ message: 'Spare Part updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/spare-parts/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM spare_parts WHERE id = ?', [req.params.id]);
        res.json({ message: 'Spare Part deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/calibrations/history/all', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, e.code as equipment_code, e.name as equipment_name, e.serial_no 
            FROM calibrations c
            JOIN equipment e ON c.equipment_id = e.id
            ORDER BY c.calibration_date DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/calibrations/:equipmentId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM calibrations WHERE equipment_id = ? ORDER BY calibration_date DESC', [req.params.equipmentId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/calibrations', async (req, res) => {
    const { equipment_id, calibration_date, result, technician, certificate_number, notes, next_due_date } = req.body;
    try {
        await pool.query(
            'INSERT INTO calibrations (equipment_id, calibration_date, result, technician, certificate_number, notes, next_due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [equipment_id, calibration_date, result, technician, certificate_number, notes, next_due_date]
        );
        // Cập nhật ngày hiệu chuẩn và trạng thái trong bảng equipment
        // Lưu ý: bảng equipment dùng expiry_date thay vì next_due_date
        await pool.query(
            'UPDATE equipment SET last_calibration = ?, expiry_date = ?, status = ? WHERE id = ?',
            [calibration_date, next_due_date, result === 'Passed' ? 'Available' : 'Maintenance', equipment_id]
        );
        res.json({ message: 'Lưu lịch sử hiệu chuẩn thành công' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/calibrations/bulk', async (req, res) => {
    const { equipment_ids, calibration_date, result, technician, certificate_number, notes, next_due_date } = req.body;
    if (!Array.isArray(equipment_ids) || equipment_ids.length === 0) {
        return res.status(400).json({ error: 'Danh sách thiết bị không hợp lệ' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const id of equipment_ids) {
            await connection.query(
                'INSERT INTO calibrations (equipment_id, calibration_date, result, technician, certificate_number, notes, next_due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, calibration_date, result, technician, certificate_number, notes, next_due_date]
            );
            // Cập nhật ngày hiệu chuẩn và trạng thái trong bảng equipment
            await connection.query(
                'UPDATE equipment SET last_calibration = ?, expiry_date = ?, status = ? WHERE id = ?',
                [calibration_date, next_due_date, result === 'Passed' ? 'Available' : 'Maintenance', id]
            );
        }

        await connection.commit();
        res.json({ message: `Đã cập nhật thành công ${equipment_ids.length} thiết bị` });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/equipment/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM equipment WHERE id = ?', [req.params.id]);
        res.json({ message: 'Equipment deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/equipment/code/:code', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.*, j.name as jig_name, s.name as station_name, l.name as line_name 
            FROM equipment e 
            LEFT JOIN jigs j ON e.jig_id = j.id 
            LEFT JOIN stations s ON j.station_id = s.id 
            LEFT JOIN \`lines\` l ON s.line_id = l.id 
            WHERE e.code = ? OR e.serial_no = ? OR e.part_no = ? OR e.name LIKE ?
        `, [req.params.code, req.params.code, req.params.code, `%${req.params.code}%`]);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
        res.json(rows); // Return Array for Multiple Matches!
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. Transactions
app.get('/api/transactions', async (req, res) => {
    const [rows] = await pool.query(`
        SELECT t.*, e.name as equipment_name, e.code as equipment_code, e.serial_no, e.part_no, e.image_url, e.status as equipment_status 
        FROM transactions t 
        JOIN equipment e ON t.equipment_id = e.id 
        ORDER BY t.transaction_date DESC
    `);
    res.json(rows);
});

// NOTE: Trùng lặp code: API get /api/equipment/code/:code đã được định nghĩa ở trên (dòng 142).
// Tôi loại bỏ đoạn code thừa (do trước đây thêm vào dưới đáy) để tránh lỗi Route không định tuyến đúng.

// Chỉnh sửa API POST: Nhận mảng thiết bị và validate logic
app.post('/api/transactions', async (req, res) => {
    // batch information
    const { type, person_in_charge, department, notes, related_person, purpose, sender_name, sender_position, sender_department, sender_company, receiver_name, receiver_position, receiver_department, receiver_company, items } = req.body;

    // items is array of { id, quantity, is_bulk, item_type, unit, scrap_weight, scrap_unit, last_calibration, expiry_date }
    const equipList = Array.isArray(items) ? items : req.body.equipment_ids?.map(id => ({ id, quantity: 1, item_type: 'equipment' }));

    if (!equipList || equipList.length === 0) {
        return res.status(400).json({ error: 'Vui lòng cung cấp danh sách thiết bị cần xử lý' });
    }

    const isInternal = req.body.is_internal || false;

    // Generate batch code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    let prefix = isInternal ? 'INT' : (type === 'Import' ? 'IMP' : (type === 'Scrap' ? 'SCR' : 'EXP'));
    const batch_code = `${prefix}-${dateStr}-${rand}`;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (let item of equipList) {
            const item_id = item.id;
            const transactQty = parseFloat(item.quantity) || parseFloat(req.body.quantity) || 1;
            const itemType = item.item_type || 'equipment';

            if (itemType === 'spare_part') {
                const [spRows] = await connection.query('SELECT current_quantity, unit FROM spare_parts WHERE id = ? FOR UPDATE', [item_id]);
                if (spRows.length === 0) throw new Error(`Linh kiện ID ${item_id} không tồn tại`);

                const spInfo = spRows[0];
                if ((type === 'Export' || type === 'Scrap') && spInfo.current_quantity < transactQty) {
                    throw new Error(`Linh kiện ID ${item_id} dư không đủ. Có: ${spInfo.current_quantity}, Cần: ${transactQty}`);
                }

                let newQty = (type === 'Export' || type === 'Scrap') ? (spInfo.current_quantity - transactQty) : (spInfo.current_quantity + transactQty);
                await connection.query('UPDATE spare_parts SET current_quantity = ? WHERE id = ?', [newQty, item_id]);

                await connection.query(
                    'INSERT INTO transactions (spare_part_id, type, quantity, unit, person_in_charge, department, notes, related_person, batch_code, purpose, sender_name, sender_position, sender_department, sender_company, receiver_name, receiver_position, receiver_department, receiver_company, scrap_weight, scrap_unit, is_internal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [item_id, type, transactQty, item.unit || spInfo.unit || 'ea', person_in_charge || '', department || '', notes || '', related_person || '', batch_code, purpose || '',
                        sender_name || '', sender_position || '', sender_department || '', sender_company || '',
                        receiver_name || '', receiver_position || '', receiver_department || '', receiver_company || '',
                        item.scrap_weight || 0, item.scrap_unit || 'kg', isInternal]
                );
            } else {
                const [eqRows] = await connection.query('SELECT status, is_at_hse, current_quantity, unit FROM equipment WHERE id = ? FOR UPDATE', [item_id]);
                if (eqRows.length === 0) throw new Error(`Thiết bị có ID ${item_id} không tồn tại`);

                const eqInfo = eqRows[0];

                if (eqInfo.is_bulk) {
                    if ((type === 'Export' || type === 'Scrap') && eqInfo.current_quantity < transactQty) {
                        throw new Error(`Thiết bị (Bulk) ID ${item_id} dư không đủ. Có: ${eqInfo.current_quantity}, Cần: ${transactQty}`);
                    }
                    let newQty = (type === 'Export' || type === 'Scrap') ? (eqInfo.current_quantity - transactQty) : (eqInfo.current_quantity + transactQty);
                    await connection.query('UPDATE equipment SET current_quantity = ? WHERE id = ?', [newQty, item_id]);
                } else {
                    if (type === 'Export' && !isInternal && eqInfo.is_at_hse === 0) {
                        throw new Error(`Lỗi: Thiết bị ID ${item_id} đang ở ngoài (Outside), không thể xuất thêm`);
                    }
                    if (type === 'Import' && eqInfo.is_at_hse === 1) {
                        throw new Error(`Lỗi: Thiết bị ID ${item_id} đang trong kho (HSE), không thể nhập thêm`);
                    }

                    if (!isInternal) {
                        let newAtHse = type === 'Export' ? 0 : 1;
                        await connection.query('UPDATE equipment SET is_at_hse = ? WHERE id = ?', [newAtHse, item_id]);
                    }
                }

                if (type === 'Import' && item.last_calibration && item.expiry_date) {
                    await connection.query('UPDATE equipment SET last_calibration = ?, expiry_date = ? WHERE id = ?', [item.last_calibration, item.expiry_date, item_id]);
                    await connection.query(
                        'INSERT INTO calibrations (equipment_id, calibration_date, result, technician, notes, next_due_date) VALUES (?, ?, ?, ?, ?, ?)',
                        [item_id, item.last_calibration, 'Passed', person_in_charge || '', 'Cập nhật tự động khi nhập kho', item.expiry_date]
                    );
                }

                await connection.query(
                    'INSERT INTO transactions (equipment_id, type, quantity, unit, person_in_charge, department, notes, related_person, batch_code, purpose, sender_name, sender_position, sender_department, sender_company, receiver_name, receiver_position, receiver_department, receiver_company, scrap_weight, scrap_unit, is_internal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [item_id, type, transactQty, item.unit || eqInfo.unit || 'ea', person_in_charge || '', department || '', notes || '', related_person || '', batch_code, purpose || '',
                        sender_name || '', sender_position || '', sender_department || '', sender_company || '',
                        receiver_name || '', receiver_position || '', receiver_department || '', receiver_company || '',
                        item.scrap_weight || 0, item.scrap_unit || 'kg', isInternal]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Lưu phiếu giao dịch thành công!', batch_code });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

app.get('/api/lookup/code/:code', async (req, res) => {
    const { code } = req.params;
    const searchPattern = `%${code}%`;
    try {
        // Search equipment by multiple fields
        const [eqRows] = await pool.query(`
            SELECT *, "equipment" as item_type 
            FROM equipment 
            WHERE code = ? OR serial_no = ? OR part_no = ? OR name LIKE ?
        `, [code, code, code, searchPattern]);

        // Search spare parts by multiple fields
        const [spRows] = await pool.query(`
            SELECT *, "spare_part" as item_type 
            FROM spare_parts 
            WHERE code = ? OR part_no = ? OR name LIKE ?
        `, [code, code, searchPattern]);

        // Combine results
        const combined = [...eqRows, ...spRows];

        if (combined.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy thiết bị hoặc linh kiện nào' });
        }

        res.json(combined);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.post('/api/transactions/evidence', authMiddleware, upload.single('file'), async (req, res) => {
    const { batch_code, type } = req.body;
    if (!req.file || !batch_code || !type) return res.status(400).json({ error: 'Missing file/batch/type' });

    try {
        const fileName = `evidence-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        const outputPath = path.join(uploadPath, fileName);

        // Nén ảnh minh chứng
        await sharp(req.file.buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .toFormat('jpeg', { quality: 80 })
            .toFile(outputPath);

        const imageUrl = `/uploads/${fileName}`;
        const col = type === 'delivery' ? 'evidence_delivery_url' : 'evidence_gatepass_url';

        await pool.query(`UPDATE transactions SET ${col} = ? WHERE batch_code = ?`, [imageUrl, batch_code]);
        res.json({ message: 'OK', url: imageUrl });
    } catch (e) {
        console.error('Evidence Upload Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 7. Delete Transactions (Admin Only)
app.delete('/api/transactions/batch/:batch_code', authMiddleware, adminOnly, async (req, res) => {
    const { batch_code } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get all transactions in this batch
        const [transactions] = await connection.query('SELECT * FROM transactions WHERE batch_code = ?', [batch_code]);
        if (transactions.length === 0) throw new Error('Không tìm thấy mã phiếu này');

        // 2. Revert equipment status/quantity for each transaction
        for (let t of transactions) {
            const [eqRows] = await connection.query('SELECT is_bulk, current_quantity, is_at_hse FROM equipment WHERE id = ? FOR UPDATE', [t.equipment_id]);
            if (eqRows.length > 0) {
                const eq = eqRows[0];
                if (eq.is_bulk) {
                    let revertedQty = t.type === 'Export' ? (eq.current_quantity + t.quantity) : (eq.current_quantity - t.quantity);
                    await connection.query('UPDATE equipment SET current_quantity = ? WHERE id = ?', [revertedQty, t.equipment_id]);
                } else {
                    let revertedAtHse = t.type === 'Export' ? 1 : 0;
                    await connection.query('UPDATE equipment SET is_at_hse = ? WHERE id = ?', [revertedAtHse, t.equipment_id]);
                }
            }
        }

        // 3. Delete transactions
        await connection.query('DELETE FROM transactions WHERE batch_code = ?', [batch_code]);

        await connection.commit();
        res.json({ message: `Đã xóa phiếu ${batch_code} và phục hồi trạng thái thiết bị!` });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/transactions/:id', authMiddleware, adminOnly, async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get transaction
        const [tRows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [id]);
        if (tRows.length === 0) throw new Error('Không tìm thấy lịch sử này');
        const t = tRows[0];

        // 2. Revert equipment status/quantity
        const [eqRows] = await connection.query('SELECT is_bulk, current_quantity, is_at_hse FROM equipment WHERE id = ? FOR UPDATE', [t.equipment_id]);
        if (eqRows.length > 0) {
            const eq = eqRows[0];
            if (eq.is_bulk) {
                let revertedQty = t.type === 'Export' ? (eq.current_quantity + t.quantity) : (eq.current_quantity - t.quantity);
                await connection.query('UPDATE equipment SET current_quantity = ? WHERE id = ?', [revertedQty, t.equipment_id]);
            } else {
                let revertedAtHse = t.type === 'Export' ? 1 : 0;
                await connection.query('UPDATE equipment SET is_at_hse = ? WHERE id = ?', [revertedAtHse, t.equipment_id]);
            }
        }

        // 3. Delete transaction
        await connection.query('DELETE FROM transactions WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'Đã xóa lịch sử và phục hồi trạng thái thiết bị!' });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

// --- MAINTENANCE LOGS APIs ---
app.get('/api/maintenance/:equipmentId', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM maintenance_logs WHERE equipment_id = ? ORDER BY date DESC', [req.params.equipmentId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 12. API EXTRAS - Dashboard Stats & Trends
app.get('/api/stats/trends', authMiddleware, async (req, res) => {
    try {
        // Daily Transactions (Import/Export) - Last 7 days
        const [transRows] = await pool.query(`
            SELECT DATE(transaction_date) as date, 
                   SUM(CASE WHEN type='Import' THEN quantity ELSE 0 END) as imports,
                   SUM(CASE WHEN type='Export' THEN quantity ELSE 0 END) as exports
            FROM transactions 
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(transaction_date)
            ORDER BY date ASC
        `);

        // Daily NGO (Maintenance Damage logs) - Last 7 days
        const [ngRows] = await pool.query(`
            SELECT date, COUNT(*) as count 
            FROM maintenance_logs 
            WHERE type = 'Damage' AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY date
            ORDER BY date ASC
        `);

        // Daily Calibrations - Last 7 days
        const [calibRows] = await pool.query(`
            SELECT calibration_date as date, COUNT(*) as count 
            FROM calibrations 
            WHERE calibration_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY calibration_date 
            ORDER BY date ASC
        `);

        res.json({
            transactions: transRows,
            ngTrends: ngRows,
            calibTrends: calibRows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/maintenance', authMiddleware, async (req, res) => {
    const { equipment_id, type, date, reported_by, technician, description, result_status } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            'INSERT INTO maintenance_logs (equipment_id, type, date, reported_by, technician, description, result_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [equipment_id, type, date, reported_by, technician, description, result_status]
        );

        // Tự động cập nhật trạng thái thiết bị dựa trên loại log
        if (type === 'Damage') {
            await connection.query('UPDATE equipment SET status = "NG" WHERE id = ?', [equipment_id]);
        } else if (type === 'Repair' && result_status === 'OK') {
            await connection.query('UPDATE equipment SET status = "OK" WHERE id = ?', [equipment_id]);
        }

        await connection.commit();
        res.json({ message: 'Đã lưu lịch sử bảo trì thành công!' });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
