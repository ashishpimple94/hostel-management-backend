require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these in your .env file or environment');
  process.exit(1);
}

const mongoose = require('mongoose');
const { exec } = require('child_process');

// IMPORTANT: Set bufferCommands BEFORE importing routes/models
// This ensures commands are buffered until connection is ready
// Note: bufferMaxEntries is not a valid option in Mongoose 8.0.0
mongoose.set('bufferCommands', true);

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');

// Import security middleware
const { 
  helmetConfig, 
  limiter, 
  authLimiter, 
  mongoSanitizeConfig, 
  hppConfig 
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const studentRegistrationRoutes = require('./routes/studentRegistration');
const roomRoutes = require('./routes/rooms');
const feeRoutes = require('./routes/fees');
const complaintRoutes = require('./routes/complaints');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Trust proxy - needed for rate limiting behind proxies/load balancers
app.set('trust proxy', 1);

// Security Middleware (applied first)
app.use(helmetConfig); // Set security HTTP headers
app.use(mongoSanitizeConfig); // Prevent MongoDB injection
app.use(hppConfig); // Prevent HTTP Parameter Pollution

// Comprehensive health check route (not rate-limited)
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const getConnectionStatus = require('./config/database').getConnectionStatus;
  
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      state: mongoose.connection.readyState,
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };

  // If database is not connected, return 503
  if (mongoose.connection.readyState !== 1) {
    healthStatus.status = 'DEGRADED';
    healthStatus.message = 'Database connection not available';
    return res.status(503).json(healthStatus);
  }

  res.json(healthStatus);
});

// General rate limiter for all routes (after health)
app.use('/api/', limiter);

// CORS Configuration - Allow all origins in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    // In production, you can specify allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// Body parsing middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increased limit for photo uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authLimiter, authRoutes); // Apply stricter rate limit to auth
app.use('/api/students', studentRoutes);
app.use('/api/student-registration', studentRegistrationRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);

// (health route moved above to avoid rate limiting)

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build folder
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing - return index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Import error handler
const { errorHandler } = require('./middleware/errorHandler');

// Middleware to check MongoDB connection before processing database requests
const checkDBConnection = (req, res, next) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not ready. Please try again in a moment.'
    });
  }
  next();
};

// Apply DB connection check to all API routes except health check
app.use('/api/', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  checkDBConnection(req, res, next);
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Function to kill process on port
const killPort = (port) => {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error || !stdout.trim()) {
        // Port is free, nothing to kill
        resolve(false);
        return;
      }
      
      const pid = stdout.trim();
      console.log(`🔄 Killing process ${pid} on port ${port}...`);
      exec(`kill -9 ${pid}`, (killError) => {
        if (killError) {
          console.log(`⚠️ Could not kill process ${pid}: ${killError.message}`);
        } else {
          console.log(`✅ Process ${pid} killed successfully`);
        }
        // Wait a bit for port to be released
        setTimeout(() => resolve(true), 500);
      });
    });
  });
};

// Start server only after MongoDB connection is established
const startServer = async () => {
  try {
    console.log('🚀 Starting Hostel Management Backend Server...');
    console.log('📊 BufferCommands setting:', mongoose.get('bufferCommands'));
    console.log('📊 Environment:', process.env.NODE_ENV || 'development');
    
    // Kill any process using the port before starting
    await killPort(PORT);
    
    // Connect to MongoDB first
    await connectDB();
    
    // Verify connection is ready
    const connectionState = mongoose.connection.readyState;
    console.log('📊 MongoDB readyState:', connectionState);
    console.log('📊 BufferCommands after connect:', mongoose.get('bufferCommands'));
    
    if (connectionState !== 1) {
      throw new Error(`MongoDB connection not ready. State: ${connectionState}`);
    }
    
    // Start server after connection is ready
    // Listen on all interfaces (0.0.0.0) to accept network connections
    const server = app.listen(PORT, '0.0.0.0', () => {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let networkIP = 'localhost';
      
      // Find first non-internal IPv4 address
      for (const interfaceName of Object.keys(networkInterfaces)) {
        for (const iface of networkInterfaces[interfaceName]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            networkIP = iface.address;
            break;
          }
        }
        if (networkIP !== 'localhost') break;
      }
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API (localhost): http://localhost:${PORT}/api`);
      console.log(`🌐 API (network): http://${networkIP}:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/api/health`);
      console.log(`📊 MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
      console.log(`📊 Connection State: ${connectionState} (1 = connected)`);
      console.log('='.repeat(60) + '\n');
    });

    // Set server timeout
    server.timeout = 30000; // 30 seconds
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

    // Handle port already in use
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.log('\n🔧 Solutions:');
        console.log('1. Kill the process: lsof -ti:' + PORT + ' | xargs kill -9');
        console.log('2. Change PORT in .env file');
        console.log('3. Use different port: PORT=5002 node server.js\n');
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });

    // Graceful shutdown for server
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log('✅ HTTP server closed');
        try {
          await mongoose.connection.close();
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

startServer();
