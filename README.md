# 🏨 Hostel Management System - Backend

Backend API for Hostel Management System built with Node.js, Express, and MongoDB.

## 🚀 Features

- ✅ User Authentication (JWT-based)
- ✅ Student Management
- ✅ Room Management (AC/Non-AC)
- ✅ Fee Management with automated calculations
- ✅ Complaint System
- ✅ Dashboard Analytics
- ✅ Notice Board
- ✅ Attendance Tracking
- ✅ Multi-Role Support (Admin, Warden, Student, Accountant, Maintenance)

## 🏗️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **Express Rate Limit** - API rate limiting

## 📦 Installation

### Prerequisites
- Node.js 16+ installed
- MongoDB 5+ (local or Atlas)

### Setup
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your MongoDB URI and JWT secret
nano .env
```

### Environment Variables
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
```

## 🚀 Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on `http://localhost:5001`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student by ID
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Fees
- `GET /api/fees` - Get all fees
- `POST /api/fees` - Create fee
- `PUT /api/fees/:id` - Update fee
- `DELETE /api/fees/:id` - Delete fee

### Complaints
- `GET /api/complaints` - Get all complaints
- `POST /api/complaints` - Create complaint
- `PUT /api/complaints/:id` - Update complaint

### Dashboard
- `GET /api/dashboard` - Get dashboard stats

## 🔒 Security Features

- JWT Authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet security headers
- MongoDB injection protection
- XSS protection

## 📚 Project Structure

```
backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── scripts/         # Utility scripts
├── utils/           # Helper utilities
└── server.js        # Main server file
```

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options
- **Render** - Recommended for free tier
- **Railway** - Fast and simple
- **Vercel** - Serverless option

## 📝 License

ISC

## 👨‍💻 Author

Hostel Management Team

