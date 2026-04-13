const axios = require('axios');

async function testLogin() {
    console.log('--- Đang kiểm tra API Đăng nhập ---');
    try {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        console.log('✅ Đăng nhập THÀNH CÔNG!');
        console.log('Token nhận được:', res.data.token.substring(0, 20) + '...');
        console.log('Thông tin User:', res.data.user);
    } catch (err) {
        console.error('❌ Đăng nhập THẤT BẠI!');
        if (err.response) {
            console.error('Lỗi từ Server:', err.response.status, err.response.data);
        } else {
            console.error('Lỗi kết nối:', err.message);
        }
    }
}

testLogin();
