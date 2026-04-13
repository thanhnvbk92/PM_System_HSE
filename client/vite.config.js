import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        basicSsl()
    ],
    server: {
        host: true, // Cho phép truy cập từ mạng LAN
        https: true, // Kích hoạt HTTPS để hỗ trợ Secure Context (Camera trên Mobile)
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false
            },
            '/uploads': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false
            }
        }
    }
})
