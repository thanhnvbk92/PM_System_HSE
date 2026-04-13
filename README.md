# PM System (Preventive Maintenance System)

A comprehensive Preventive Maintenance (PM) Management System designed for efficient tracking and maintenance of assets. This project features a modern React frontend and a robust Node.js/Express backend.

## 🚀 Features

- **Asset Management**: Track and manage equipment and maintenance schedules.
- **Frontend**: Built with **React**, **Vite**, and **TypeScript** for a fast and responsive user experience.
- **Backend**: **Express.js** API handling authentication, data management, and file uploads.
- **Data Visualization**: Integrated **Recharts** for maintenance insights.
- **Scanning Capabilities**: Supports **Barcode** and **QR Code** scanning for quick asset identification.
- **Image Processing**: Automated image handling and optimization using **Sharp**.

## 🛠️ Tech Stack

### Client
- React 19
- Vite
- TypeScript
- Tailwind CSS (or Vanilla CSS as per project configuration)
- Lucide React (Icons)
- Axios (API Calls)
- Recharts (Data Viz)

### Server
- Node.js
- Express.js
- MySQL (Database)
- JSON Web Token (Authentication)
- Multer (File Uploads)
- Sharp (Image Processing)

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [MySQL](https://www.mysql.com/) database

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/thanhnvbk92/PM_System_HSE.git
   cd PM_System_HSE
   ```

2. **Server Setup**:
   ```bash
   cd server
   npm install
   ```
   - Create a `.env` file in the `server` directory and configure the following:
     ```env
     PORT=5000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=pm_system
     JWT_SECRET=your_jwt_secret
     ```
   - Run the server:
     ```bash
     npm run dev
     ```

3. **Client Setup**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   - Access the application at `http://localhost:5173`.

## 📂 Project Structure

```
PM_System/
├── client/          # Frontend React application
├── server/          # Backend Express API
├── database/        # Database scripts and migrations
└── README.md        # Project documentation
```

## 📄 License

This project is licensed under the ISC License.
