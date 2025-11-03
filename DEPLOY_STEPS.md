# 🚀 Backend Deployment - Step by Step Guide

## Prerequisites Checklist

- [ ] MongoDB Atlas account created
- [ ] MongoDB cluster created (Free M0)
- [ ] Database user created with password
- [ ] IP whitelist configured (0.0.0.0/0)
- [ ] GitHub account ready

---

## 🎯 Option 1: Render Deployment (Recommended - Free)

### Step 1: Prepare MongoDB Atlas

1. **Get Connection String:**
   - Go to MongoDB Atlas Dashboard
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hostel_management?retryWrites=true&w=majority`

2. **Test Connection Locally (Optional):**
   ```bash
   # Create .env file with your connection string
   echo "MONGODB_URI=your_connection_string_here" > .env
   echo "JWT_SECRET=MySuperSecureJWTSecretKey2024@#$%^&*" >> .env
   echo "NODE_ENV=production" >> .env
   echo "PORT=5001" >> .env
   ```

### Step 2: Push Code to GitHub

```bash
cd "/Users/ashishpimple/Desktop/Hostel Manage/backend"

# Initialize git (if not already)
git init

# Check if already has remote
git remote -v

# Add all files
git add .

# Commit
git commit -m "Backend ready for production deployment"

# Create new repo on GitHub first: https://github.com/new
# Name: hostel-backend
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/hostel-backend.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Render

1. **Sign up/Login:**
   - Go to https://render.com
   - Sign up with GitHub account

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `hostel-backend` repository

3. **Configure Settings:**
   ```
   Name: hostel-management-backend
   Region: Singapore (or closest)
   Branch: main
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

4. **Add Environment Variables:**
   Click "Advanced" → "Add Environment Variable"
   
   Add these variables:
   ```
   NODE_ENV = production
   PORT = 10000
   MONGODB_URI = your_mongodb_atlas_connection_string
   JWT_SECRET = MySuperSecureJWTSecretKey2024@#$%^&*(min_32_chars)
   JWT_EXPIRE = 7d
   RATE_LIMIT_WINDOW_MS = 900000
   RATE_LIMIT_MAX_REQUESTS = 100
   AUTH_RATE_LIMIT_MAX = 5
   REQUEST_BODY_LIMIT = 10kb
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your backend URL: `https://hostel-management-backend.onrender.com`

### Step 4: Test Deployment

```bash
# Health check
curl https://hostel-management-backend.onrender.com/api/health

# Should return: {"status":"OK","message":"Server is running"}
```

---

## 🚂 Option 2: Railway Deployment (Alternative)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Deploy

```bash
cd "/Users/ashishpimple/Desktop/Hostel Manage/backend"

railway init
railway up
```

### Step 3: Add Environment Variables

```bash
railway variables set MONGODB_URI="your_mongodb_connection_string"
railway variables set JWT_SECRET="MySuperSecureJWTSecretKey2024@#$%"
railway variables set NODE_ENV="production"
railway variables set JWT_EXPIRE="7d"
```

Your backend will be live automatically! Check Railway dashboard for URL.

---

## ⚡ Option 3: Vercel Deployment

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy

```bash
cd "/Users/ashishpimple/Desktop/Hostel Manage/backend"

vercel --prod
```

### Step 3: Add Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `JWT_EXPIRE=7d`

5. Redeploy:
```bash
vercel --prod
```

---

## 📝 Post-Deployment Steps

### 1. Update Frontend API URL

Update `frontend/.env`:
```
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
```

### 2. Test All Endpoints

```bash
# Health check
curl https://your-backend-url.onrender.com/api/health

# Register test user
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### 3. Seed Initial Data (Optional)

```bash
# You may need to run seed script locally pointing to production DB
# Or add it as a deployment script
```

---

## 🔒 Security Checklist

- ✅ MongoDB connection string is secure and stored in environment variables
- ✅ JWT_SECRET is strong (min 32 characters)
- ✅ CORS is configured (currently allows all origins - update for production)
- ✅ Rate limiting is enabled
- ✅ Helmet security headers are active
- ✅ MongoDB injection prevention enabled
- ✅ XSS protection enabled
- ✅ Request body size limits configured

---

## ⚠️ Important Notes

1. **Free Tier Limits:**
   - Render: Sleeps after 15 mins of inactivity (first request after sleep is slow)
   - MongoDB Atlas: 512MB storage limit on free tier
   - Railway: $5 free credit per month

2. **CORS Configuration:**
   - Currently allows all origins (`cors()`)
   - For production, update `server.js` to allow only your frontend domain:
   ```javascript
   app.use(cors({
     origin: 'https://your-frontend-domain.com',
     credentials: true
   }));
   ```

3. **Monitoring:**
   - Render: Built-in logs and metrics
   - Use UptimeRobot (free) for uptime monitoring
   - MongoDB Atlas: Built-in monitoring dashboard

---

## 🆘 Troubleshooting

### Backend won't start
- Check MongoDB connection string format
- Verify all environment variables are set
- Check Render/Railway logs for errors
- Ensure PORT is set correctly (10000 for Render)

### Can't connect from frontend
- Check CORS configuration
- Verify API URL in frontend `.env`
- Check if backend is sleeping (Render free tier)
- Verify backend URL is accessible

### Database connection failed
- Verify MongoDB Atlas IP whitelist (0.0.0.0/0)
- Check username/password in connection string
- Ensure cluster is running (not paused)
- Check network access settings

### Rate limiting issues
- Increase `RATE_LIMIT_MAX_REQUESTS` if needed
- Adjust `RATE_LIMIT_WINDOW_MS` for window size

---

## 📞 Quick Commands Reference

```bash
# Check backend status
curl https://your-backend-url.onrender.com/api/health

# Test registration
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","role":"student","firstName":"Test","lastName":"User"}'

# View logs (Render Dashboard)
# Or Railway: railway logs
# Or Vercel: vercel logs
```

---

**Your backend URL will be:**
- Render: `https://hostel-management-backend.onrender.com`
- Railway: `https://your-app-name.railway.app`
- Vercel: `https://your-app-name.vercel.app`

**Good luck with deployment! 🚀**



