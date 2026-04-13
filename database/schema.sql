CREATE DATABASE IF NOT EXISTS PMSystemDB;
USE PMSystemDB;

-- Bảng Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    employee_id VARCHAR(50),
    position VARCHAR(100),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Contacts (Danh bạ người liên hệ)
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    department VARCHAR(255),
    company VARCHAR(255),
    UNIQUE KEY unique_contact (name, company)
);

-- Bảng Line (Sử dụng backtick vì 'lines' là từ khóa dành riêng)
CREATE TABLE IF NOT EXISTS `lines` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Bảng Station
CREATE TABLE IF NOT EXISTS stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    line_id INT NOT NULL,
    FOREIGN KEY (line_id) REFERENCES `lines`(id) ON DELETE CASCADE
);

-- Bảng Jig
CREATE TABLE IF NOT EXISTS jigs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    station_id INT NOT NULL,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

-- Bảng lưu trữ thông tin thiết bị/tài sản
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    part_no VARCHAR(100),
    serial_no VARCHAR(100),
    asset_type VARCHAR(100),
    image_url TEXT,
    status ENUM('Available', 'In Use', 'Maintenance', 'Broken', 'Calibration') DEFAULT 'Available',
    jig_id INT,
    is_calibrated BOOLEAN DEFAULT FALSE,
    last_calibration DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (jig_id) REFERENCES jigs(id) ON DELETE SET NULL
);

-- Bảng giao dịch (Bản nâng cấp đầy đủ)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    type ENUM('Import', 'Export', 'Return', 'Dispose') NOT NULL,
    quantity INT DEFAULT 1,
    person_in_charge VARCHAR(255),
    department VARCHAR(255),
    notes TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    related_person VARCHAR(255),
    batch_code VARCHAR(100),
    purpose VARCHAR(255),
    sender_name VARCHAR(255),
    sender_position VARCHAR(255),
    sender_department VARCHAR(255),
    sender_company VARCHAR(255),
    receiver_name VARCHAR(255),
    receiver_position VARCHAR(255),
    receiver_department VARCHAR(255),
    receiver_company VARCHAR(255),
    evidence_delivery_url TEXT,
    evidence_gatepass_url TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- Bảng hiệu chuẩn
CREATE TABLE IF NOT EXISTS calibrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    calibration_date DATE NOT NULL,
    result ENUM('Passed', 'Failed', 'Needs Repair') NOT NULL,
    technician VARCHAR(255),
    certificate_number VARCHAR(100),
    notes TEXT,
    next_due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- Dữ liệu mẫu
INSERT INTO `lines` (name) VALUES ('Line A'), ('Line B');
INSERT INTO stations (name, line_id) VALUES ('Station 1', 1), ('Station 2', 1), ('Station 3', 2);
INSERT INTO jigs (name, station_id) VALUES ('Jig 001', 1), ('Jig 002', 1), ('Jig 003', 2), ('Jig 004', 3);

-- Tài khoản Admin mặc định (Pass: admin123 - đã được hash bằng bcrypt)
INSERT IGNORE INTO users (username, password, full_name, role, status) 
VALUES ('admin', '$2b$10$aubEUQydBIqdBRPLOwCfQOL6rUesbRktwR9NCGcWB7xnaPWZg9YUi', 'System Admin', 'admin', 'approved');

INSERT INTO equipment (code, name, part_no, serial_no, asset_type, status, jig_id, is_calibrated, expiry_date) VALUES 
('EQ-001', 'Máy đo Fluke 179', 'FLK-179', 'SN123456', 'Thiết bị đo', 'Available', 1, TRUE, '2026-12-31'),
('EQ-002', 'Máy hiện sóng Tek', 'TEK-2000', 'SN789012', 'Thiết bị đo', 'In Use', 2, TRUE, '2026-06-15');
