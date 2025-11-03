# ⚡ Quick Login Guide

**Database Issue**: If login says "Invalid credentials", you need to register first!

---

## 🎯 Solution: Register First

### Register via API

```bash
curl -X POST https://hostel-backend-7lb7.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hostel.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### Then Login

```bash
curl -X POST https://hostel-backend-7lb7.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hostel.com",
    "password": "admin123"
  }'
```

---

## 🧪 Working Test Credentials

✅ **Created and tested:**
- Email: `test@test.com`
- Password: `test123`
- Role: `admin`

### Test it now:

```bash
curl -X POST https://hostel-backend-7lb7.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

## 📋 Quick Registration Template

Copy-paste to create your own user:

### Admin User
```json
POST https://hostel-backend-7lb7.onrender.com/api/auth/register
{
  "email": "admin@hostel.com",
  "password": "admin123",
  "role": "admin"
}
```

### Warden User
```json
{
  "email": "warden@hostel.com",
  "password": "warden123",
  "role": "warden"
}
```

### Accountant User
```json
{
  "email": "accountant@hostel.com",
  "password": "accountant123",
  "role": "accountant"
}
```

### Student User
```json
{
  "email": "student@hostel.com",
  "password": "student123",
  "role": "student",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890"
}
```

---

## 🔑 Use the Token

After login, you'll get a JWT token. Use it in all API requests:

```bash
curl https://hostel-backend-7lb7.onrender.com/api/students \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ Verified Working

Test user created and working:
- ✅ Registration successful
- ✅ Login successful  
- ✅ Token generated
- ✅ Ready for API calls

---

**Problem**: Empty database  
**Solution**: Register users via API or run seed script!

