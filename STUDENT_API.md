# 👥 Student API - Complete Documentation

**Base URL**: `https://hostel-backend-7lb7.onrender.com`

---

## 📋 Student API Endpoints

All endpoints require **JWT Authentication** except specified.

### 1️⃣ Get All Students

**GET** `/api/students`

**Authorization**: Admin, Warden, Accountant

**Query Parameters** (optional):
- `status` - Filter by status (active, inactive, graduated, suspended)
- `department` - Filter by department
- `year` - Filter by year

**Example:**
```bash
GET https://hostel-backend-7lb7.onrender.com/api/students
Headers: Authorization: Bearer YOUR_TOKEN

# With filters
GET https://hostel-backend-7lb7.onrender.com/api/students?status=active&department=Computer Science&year=3
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "60a5e8a8b6c3d4e5f6789012",
      "studentId": "STU2024001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@student.com",
      "phone": "1234567890",
      "dateOfBirth": "2000-01-01T00:00:00.000Z",
      "gender": "male",
      "bloodGroup": "O+",
      "department": "Computer Science",
      "course": "BE",
      "year": 3,
      "semester": 5,
      "status": "active",
      "roomNo": {
        "_id": "60a5e8a8b6c3d4e5f6789013",
        "roomNumber": "101",
        "building": "A"
      },
      "guardianName": "Father Name",
      "guardianPhone": "9876543210",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### 2️⃣ Get Single Student

**GET** `/api/students/:id`

**Authorization**: Any authenticated user

**Example:**
```bash
GET https://hostel-backend-7lb7.onrender.com/api/students/60a5e8a8b6c3d4e5f6789012
Headers: Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60a5e8a8b6c3d4e5f6789012",
    "studentId": "STU2024001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@student.com",
    "phone": "1234567890",
    "dateOfBirth": "2000-01-01T00:00:00.000Z",
    "gender": "male",
    "bloodGroup": "O+",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "department": "Computer Science",
    "course": "BE",
    "year": 3,
    "semester": 5,
    "enrollmentDate": "2022-01-01T00:00:00.000Z",
    "guardianName": "Father Name",
    "guardianPhone": "9876543210",
    "guardianRelation": "Father",
    "guardianEmail": "father@email.com",
    "roomNo": {
      "_id": "60a5e8a8b6c3d4e5f6789013",
      "roomNumber": "101",
      "floor": 1,
      "building": "A",
      "type": "AC",
      "capacity": 3
    },
    "allocationDate": "2024-01-15T00:00:00.000Z",
    "status": "active",
    "hasPendingFees": false,
    "totalPendingAmount": 0,
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### 3️⃣ Create Student

**POST** `/api/students`

**Authorization**: Admin, Warden

**Required Fields:**
- `firstName` - First name (required)
- `lastName` - Last name (required)
- `email` - Email address (required, unique)
- `studentId` - Unique student ID (required)
- `phone` - Phone number (required, min 10 digits)

**Optional Fields:**
- `dateOfBirth` - Date of birth (YYYY-MM-DD)
- `gender` - male, female, other
- `bloodGroup` - A+, A-, B+, B-, AB+, AB-, O+, O-
- `address` - Object with street, city, state, pincode, country
- `department` - Department name
- `course` - Course name
- `year` - Year (number, default: 1)
- `semester` - Semester (number, default: 1)
- `guardianName` - Guardian name
- `guardianPhone` - Guardian phone
- `guardianRelation` - Relation to guardian
- `guardianEmail` - Guardian email
- `status` - active, inactive, graduated, suspended (default: active)

**Example:**
```bash
POST https://hostel-backend-7lb7.onrender.com/api/students
Headers: 
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json

Body:
{
  "studentId": "STU2024001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@student.com",
  "phone": "1234567890",
  "dateOfBirth": "2000-01-01",
  "gender": "male",
  "bloodGroup": "O+",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "department": "Computer Science",
  "course": "BE",
  "year": 3,
  "semester": 5,
  "guardianName": "Father Name",
  "guardianPhone": "9876543210",
  "guardianRelation": "Father",
  "guardianEmail": "father@email.com",
  "status": "active"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "60a5e8a8b6c3d4e5f6789012",
    "studentId": "STU2024001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@student.com",
    // ... full student object
  }
}
```

**Error Responses:**

400 Bad Request - Missing required fields:
```json
{
  "success": false,
  "message": "Missing required fields: firstName, email. Please fill all required fields."
}
```

400 Bad Request - Invalid email:
```json
{
  "success": false,
  "message": "Invalid email format. Please enter a valid email address."
}
```

400 Bad Request - Invalid phone:
```json
{
  "success": false,
  "message": "Invalid phone number. Please enter a valid phone number (minimum 10 digits)."
}
```

409 Conflict - Email already exists:
```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

### 4️⃣ Update Student

**PUT** `/api/students/:id`

**Authorization**: Admin, Warden

**Example:**
```bash
PUT https://hostel-backend-7lb7.onrender.com/api/students/60a5e8a8b6c3d4e5f6789012
Headers: 
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json

Body:
{
  "phone": "9876543210",
  "department": "Electronics",
  "year": 4,
  "semester": 7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60a5e8a8b6c3d4e5f6789012",
    // ... updated student object
  }
}
```

---

### 5️⃣ Delete Student

**DELETE** `/api/students/:id`

**Authorization**: Admin only

**Example:**
```bash
DELETE https://hostel-backend-7lb7.onrender.com/api/students/60a5e8a8b6c3d4e5f6789012
Headers: Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Student deleted successfully",
  "data": {}
}
```

---

### 6️⃣ Get Student Ledger

**GET** `/api/students/:id/ledger`

**Authorization**: Any authenticated user

**Example:**
```bash
GET https://hostel-backend-7lb7.onrender.com/api/students/60a5e8a8b6c3d4e5f6789012/ledger
Headers: Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "_id": "60a5e8a8b6c3d4e5f6789012",
      "studentId": "STU2024001",
      "firstName": "John",
      "lastName": "Doe"
    },
    "fees": [
      {
        "_id": "60a5e8a8b6c3d4e5f6789014",
        "month": "2024-01",
        "totalAmount": 8000,
        "paidAmount": 8000,
        "pendingAmount": 0,
        "status": "paid",
        "paidAt": "2024-01-05T00:00:00.000Z"
      },
      {
        "_id": "60a5e8a8b6c3d4e5f6789015",
        "month": "2024-02",
        "totalAmount": 8000,
        "paidAmount": 0,
        "pendingAmount": 8000,
        "status": "pending"
      }
    ],
    "totalPaid": 8000,
    "totalPending": 8000,
    "totalFees": 16000
  }
}
```

---

## 📝 Complete Student Schema

```typescript
{
  studentId: string,          // Required, Unique
  firstName: string,          // Required
  lastName: string,           // Required
  email: string,              // Required, Unique
  phone: string,              // Required, min 10 digits
  dateOfBirth: Date,          // Optional
  gender: "male" | "female" | "other",  // Optional
  bloodGroup: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-",  // Optional
  address: {
    street: string,
    city: string,
    state: string,
    pincode: string,
    country: string
  },
  department: string,         // Optional
  course: string,             // Optional
  year: number,               // Optional, default: 1
  semester: number,           // Optional, default: 1
  enrollmentDate: Date,       // Auto-generated
  guardianName: string,       // Optional
  guardianPhone: string,      // Optional
  guardianRelation: string,   // Optional
  guardianEmail: string,      // Optional
  roomNo: ObjectId,           // Reference to Room
  allocationDate: Date,       // Optional
  status: "active" | "inactive" | "graduated" | "suspended",  // Optional, default: active
  hasPendingFees: boolean,    // Auto-calculated
  totalPendingAmount: number, // Auto-calculated
  pendingFeesFrom: Date,      // Auto-calculated
  pendingFeesUntil: Date,     // Auto-calculated
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

---

## 🧪 Postman Testing Example

### Quick Test Flow:

1. **Login** to get token:
```bash
POST /api/auth/login
Body: {"email":"admin@hostel.com","password":"admin123"}
```

2. **Create Student**:
```bash
POST /api/students
Headers: Authorization: Bearer TOKEN
Body: {
  "studentId": "STU001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@test.com",
  "phone": "1234567890"
}
```

3. **Get All Students**:
```bash
GET /api/students
Headers: Authorization: Bearer TOKEN
```

4. **Get Student by ID**:
```bash
GET /api/students/STUDENT_ID
Headers: Authorization: Bearer TOKEN
```

5. **Update Student**:
```bash
PUT /api/students/STUDENT_ID
Headers: Authorization: Bearer TOKEN
Body: {"department": "Computer Science"}
```

6. **Get Student Ledger**:
```bash
GET /api/students/STUDENT_ID/ledger
Headers: Authorization: Bearer TOKEN
```

7. **Delete Student**:
```bash
DELETE /api/students/STUDENT_ID
Headers: Authorization: Bearer TOKEN
```

---

## ⚠️ Common Validation Rules

1. **Email**: Must be valid email format
2. **Phone**: Minimum 10 digits, numeric only
3. **Student ID**: Must be unique
4. **Email**: Must be unique
5. **Gender**: Must be one of: male, female, other
6. **Blood Group**: Must be valid blood group
7. **Status**: Must be one of: active, inactive, graduated, suspended

---

## 🔒 Authorization by Role

| Endpoint | Admin | Warden | Accountant | Student |
|----------|-------|--------|------------|---------|
| GET /students | ✅ | ✅ | ✅ | ❌ |
| POST /students | ✅ | ✅ | ❌ | ❌ |
| GET /students/:id | ✅ | ✅ | ✅ | Self only |
| PUT /students/:id | ✅ | ✅ | ❌ | ❌ |
| DELETE /students/:id | ✅ | ❌ | ❌ | ❌ |
| GET /students/:id/ledger | ✅ | ✅ | ✅ | Self only |

---

## 📚 Related APIs

- **Rooms API**: Allocate/deallocate students to rooms
- **Fees API**: Track student fees
- **Attendance API**: Track student attendance
- **Complaints API**: Student can create complaints

---

Made for Hostel Management System 🏨

