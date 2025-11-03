# 🌐 Hostel Management API - All Endpoints

**Base URL**: `https://hostel-backend-7lb7.onrender.com`

---

## ✅ Health Check

```
GET https://hostel-backend-7lb7.onrender.com/api/health
Response: {"status":"OK","message":"Server is running"}
```

---

## 🔐 Authentication APIs

### Register User
```
POST https://hostel-backend-7lb7.onrender.com/api/auth/register
Body: {
  "name": "Admin",
  "email": "admin@hostel.com",
  "password": "admin123",
  "role": "admin"
}
```

### Login User
```
POST https://hostel-backend-7lb7.onrender.com/api/auth/login
Body: {
  "email": "admin@hostel.com",
  "password": "admin123"
}
Response: {"token": "JWT_TOKEN_HERE"}
```

### Get Current User
```
GET https://hostel-backend-7lb7.onrender.com/api/auth/me
Headers: Authorization: Bearer YOUR_TOKEN
```

### Update Password
```
PUT https://hostel-backend-7lb7.onrender.com/api/auth/updatepassword
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "currentPassword": "old",
  "newPassword": "new"
}
```

---

## 👥 Student APIs

### Get All Students
```
GET https://hostel-backend-7lb7.onrender.com/api/students
Headers: Authorization: Bearer YOUR_TOKEN
Query: ?status=active&department=Computer Science&year=3
```

### Create Student
```
POST https://hostel-backend-7lb7.onrender.com/api/students
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "studentId": "STU001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@student.com",
  "phone": "1234567890",
  "dateOfBirth": "2000-01-01",
  "gender": "male",
  "bloodGroup": "O+",
  "department": "Computer Science",
  "course": "BE",
  "year": 3,
  "semester": 5,
  "guardianName": "Father",
  "guardianPhone": "9876543210",
  "guardianRelation": "Father"
}
```

### Get Student by ID
```
GET https://hostel-backend-7lb7.onrender.com/api/students/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Update Student
```
PUT https://hostel-backend-7lb7.onrender.com/api/students/:id
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "phone": "9876543210",
  "department": "Electronics"
}
```

### Delete Student
```
DELETE https://hostel-backend-7lb7.onrender.com/api/students/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Student Ledger
```
GET https://hostel-backend-7lb7.onrender.com/api/students/:id/ledger
Headers: Authorization: Bearer YOUR_TOKEN
```

---

## 🏠 Room APIs

### Get All Rooms
```
GET https://hostel-backend-7lb7.onrender.com/api/rooms
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Available Rooms
```
GET https://hostel-backend-7lb7.onrender.com/api/rooms/available
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Room Availability Stats
```
GET https://hostel-backend-7lb7.onrender.com/api/rooms/availability-stats
Headers: Authorization: Bearer YOUR_TOKEN
```

### Create Room
```
POST https://hostel-backend-7lb7.onrender.com/api/rooms
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "roomNumber": "101",
  "floor": 1,
  "building": "A",
  "type": "AC",
  "capacity": 3,
  "amenities": ["WiFi", "Cooler", "Furniture"]
}
```

### Get Room by ID
```
GET https://hostel-backend-7lb7.onrender.com/api/rooms/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Update Room
```
PUT https://hostel-backend-7lb7.onrender.com/api/rooms/:id
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "capacity": 4,
  "amenities": ["WiFi", "Cooler", "Furniture", "AC"]
}
```

### Delete Room
```
DELETE https://hostel-backend-7lb7.onrender.com/api/rooms/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Allocate Room
```
POST https://hostel-backend-7lb7.onrender.com/api/rooms/:id/allocate
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "studentId": "STUDENT_ID_HERE"
}
```

### Deallocate Room
```
POST https://hostel-backend-7lb7.onrender.com/api/rooms/:id/deallocate
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "studentId": "STUDENT_ID_HERE"
}
```

---

## 💰 Fee APIs

### Get All Fees
```
GET https://hostel-backend-7lb7.onrender.com/api/fees
Headers: Authorization: Bearer YOUR_TOKEN
```

### Create Fee
```
POST https://hostel-backend-7lb7.onrender.com/api/fees
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "studentId": "STUDENT_ID",
  "month": "2024-01",
  "roomRent": 5000,
  "messCharges": 3000,
  "fine": 0,
  "otherCharges": 0
}
```

### Get Fee by ID
```
GET https://hostel-backend-7lb7.onrender.com/api/fees/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Update Fee
```
PUT https://hostel-backend-7lb7.onrender.com/api/fees/:id
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "roomRent": 5500,
  "messCharges": 3500
}
```

### Pay Fee
```
PUT https://hostel-backend-7lb7.onrender.com/api/fees/:id/pay
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "paymentMode": "Cash",
  "transactionId": "TXN123456"
}
```

### Delete Fee
```
DELETE https://hostel-backend-7lb7.onrender.com/api/fees/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Student Fees
```
GET https://hostel-backend-7lb7.onrender.com/api/fees/student/:studentId
Headers: Authorization: Bearer YOUR_TOKEN
```

---

## 📋 Complaint APIs

### Get All Complaints
```
GET https://hostel-backend-7lb7.onrender.com/api/complaints
Headers: Authorization: Bearer YOUR_TOKEN
```

### Create Complaint
```
POST https://hostel-backend-7lb7.onrender.com/api/complaints
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "title": "Water Leakage",
  "description": "Severe water leakage in bathroom",
  "priority": "high",
  "category": "plumbing"
}
```

### Get Complaint by ID
```
GET https://hostel-backend-7lb7.onrender.com/api/complaints/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Update Complaint
```
PUT https://hostel-backend-7lb7.onrender.com/api/complaints/:id
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "status": "resolved",
  "description": "Updated description"
}
```

### Delete Complaint
```
DELETE https://hostel-backend-7lb7.onrender.com/api/complaints/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Assign Complaint
```
PUT https://hostel-backend-7lb7.onrender.com/api/complaints/:id/assign
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "assignedTo": "USER_ID_HERE"
}
```

### Update Complaint Status
```
PUT https://hostel-backend-7lb7.onrender.com/api/complaints/:id/status
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "status": "resolved"
}
```

---

## ✅ Attendance APIs

### Get All Attendance
```
GET https://hostel-backend-7lb7.onrender.com/api/attendance
Headers: Authorization: Bearer YOUR_TOKEN
```

### Mark Attendance
```
POST https://hostel-backend-7lb7.onrender.com/api/attendance
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "studentId": "STUDENT_ID",
  "date": "2024-01-15",
  "status": "present",
  "remarks": "On time"
}
```

### Bulk Mark Attendance
```
POST https://hostel-backend-7lb7.onrender.com/api/attendance/bulk
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "attendance": [
    {"studentId": "ID1", "status": "present"},
    {"studentId": "ID2", "status": "absent"}
  ],
  "date": "2024-01-15"
}
```

### Get Attendance Stats
```
GET https://hostel-backend-7lb7.onrender.com/api/attendance/stats
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Today's Attendance
```
GET https://hostel-backend-7lb7.onrender.com/api/attendance/today
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Student Attendance
```
GET https://hostel-backend-7lb7.onrender.com/api/attendance/student/:studentId
Headers: Authorization: Bearer YOUR_TOKEN
```

### Update Attendance
```
PUT https://hostel-backend-7lb7.onrender.com/api/attendance/:id
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "status": "present",
  "remarks": "Updated"
}
```

---

## 📢 Notice APIs

### Get All Notices
```
GET https://hostel-backend-7lb7.onrender.com/api/notices
Headers: Authorization: Bearer YOUR_TOKEN
```

### Create Notice
```
POST https://hostel-backend-7lb7.onrender.com/api/notices
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "title": "Hostel Meeting",
  "description": "All students must attend the meeting on Sunday at 6 PM",
  "category": "general",
  "priority": "high",
  "targetAudience": "all"
}
```

### Get Notice by ID
```
GET https://hostel-backend-7lb7.onrender.com/api/notices/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

### Update Notice
```
PUT https://hostel-backend-7lb7.onrender.com/api/notices/:id
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "description": "Updated description"
}
```

### Delete Notice
```
DELETE https://hostel-backend-7lb7.onrender.com/api/notices/:id
Headers: Authorization: Bearer YOUR_TOKEN
```

---

## 📊 Dashboard APIs

### Get Dashboard Stats
```
GET https://hostel-backend-7lb7.onrender.com/api/dashboard/stats
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Room Occupancy Report
```
GET https://hostel-backend-7lb7.onrender.com/api/dashboard/room-occupancy
Headers: Authorization: Bearer YOUR_TOKEN
```

### Get Fee Collection Report
```
GET https://hostel-backend-7lb7.onrender.com/api/dashboard/fee-collection
Headers: Authorization: Bearer YOUR_TOKEN
```

---

## 🔥 Quick Copy-Paste URLs

### Public Endpoints (No Auth)
```
https://hostel-backend-7lb7.onrender.com/api/health
```

### Auth Endpoints
```
POST https://hostel-backend-7lb7.onrender.com/api/auth/register
POST https://hostel-backend-7lb7.onrender.com/api/auth/login
GET  https://hostel-backend-7lb7.onrender.com/api/auth/me
PUT  https://hostel-backend-7lb7.onrender.com/api/auth/updatepassword
```

### Student Endpoints
```
GET    https://hostel-backend-7lb7.onrender.com/api/students
POST   https://hostel-backend-7lb7.onrender.com/api/students
GET    https://hostel-backend-7lb7.onrender.com/api/students/:id
PUT    https://hostel-backend-7lb7.onrender.com/api/students/:id
DELETE https://hostel-backend-7lb7.onrender.com/api/students/:id
GET    https://hostel-backend-7lb7.onrender.com/api/students/:id/ledger
```

### Room Endpoints
```
GET    https://hostel-backend-7lb7.onrender.com/api/rooms
GET    https://hostel-backend-7lb7.onrender.com/api/rooms/available
POST   https://hostel-backend-7lb7.onrender.com/api/rooms
GET    https://hostel-backend-7lb7.onrender.com/api/rooms/:id
PUT    https://hostel-backend-7lb7.onrender.com/api/rooms/:id
DELETE https://hostel-backend-7lb7.onrender.com/api/rooms/:id
POST   https://hostel-backend-7lb7.onrender.com/api/rooms/:id/allocate
POST   https://hostel-backend-7lb7.onrender.com/api/rooms/:id/deallocate
```

### Fee Endpoints
```
GET    https://hostel-backend-7lb7.onrender.com/api/fees
POST   https://hostel-backend-7lb7.onrender.com/api/fees
GET    https://hostel-backend-7lb7.onrender.com/api/fees/:id
PUT    https://hostel-backend-7lb7.onrender.com/api/fees/:id
PUT    https://hostel-backend-7lb7.onrender.com/api/fees/:id/pay
DELETE https://hostel-backend-7lb7.onrender.com/api/fees/:id
GET    https://hostel-backend-7lb7.onrender.com/api/fees/student/:studentId
```

### Complaint Endpoints
```
GET    https://hostel-backend-7lb7.onrender.com/api/complaints
POST   https://hostel-backend-7lb7.onrender.com/api/complaints
GET    https://hostel-backend-7lb7.onrender.com/api/complaints/:id
PUT    https://hostel-backend-7lb7.onrender.com/api/complaints/:id
DELETE https://hostel-backend-7lb7.onrender.com/api/complaints/:id
PUT    https://hostel-backend-7lb7.onrender.com/api/complaints/:id/assign
PUT    https://hostel-backend-7lb7.onrender.com/api/complaints/:id/status
```

### Attendance Endpoints
```
GET    https://hostel-backend-7lb7.onrender.com/api/attendance
POST   https://hostel-backend-7lb7.onrender.com/api/attendance
POST   https://hostel-backend-7lb7.onrender.com/api/attendance/bulk
GET    https://hostel-backend-7lb7.onrender.com/api/attendance/stats
GET    https://hostel-backend-7lb7.onrender.com/api/attendance/today
GET    https://hostel-backend-7lb7.onrender.com/api/attendance/student/:studentId
PUT    https://hostel-backend-7lb7.onrender.com/api/attendance/:id
```

### Notice Endpoints
```
GET    https://hostel-backend-7lb7.onrender.com/api/notices
POST   https://hostel-backend-7lb7.onrender.com/api/notices
GET    https://hostel-backend-7lb7.onrender.com/api/notices/:id
PUT    https://hostel-backend-7lb7.onrender.com/api/notices/:id
DELETE https://hostel-backend-7lb7.onrender.com/api/notices/:id
```

### Dashboard Endpoints
```
GET    https://hostel-backend-7lb7.onrender.com/api/dashboard/stats
GET    https://hostel-backend-7lb7.onrender.com/api/dashboard/room-occupancy
GET    https://hostel-backend-7lb7.onrender.com/api/dashboard/fee-collection
```

---

## 🎯 Quick Start

1. **Test API Health**
```bash
curl https://hostel-backend-7lb7.onrender.com/api/health
```

2. **Register/Login**
```bash
curl -X POST https://hostel-backend-7lb7.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hostel.com","password":"admin123"}'
```

3. **Use Token**
```bash
curl https://hostel-backend-7lb7.onrender.com/api/students \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Total: 44+ API Endpoints Ready to Use!** 🚀

Made for Hostel Management System 🏨

