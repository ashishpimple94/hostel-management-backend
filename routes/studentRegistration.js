const express = require('express');
const router = express.Router();
const {
  submitRegistration,
  getPendingRegistrations,
  getAllRegistrations,
  getRegistration,
  approveRegistration,
  rejectRegistration,
  deleteRegistration
} = require('../controllers/studentRegistrationController');
const { protect, authorize } = require('../middleware/auth');

// IMPORTANT: Public route must be defined BEFORE protect middleware
// Public route - no authentication required for registration submission
router.post('/', submitRegistration);

// Protected routes - require authentication
router.use(protect);

// CRITICAL ROUTE ORDER: Specific routes MUST come before parameterized routes
// Express matches routes in the order they are defined

// 1. Get pending registrations (specific route - MUST be FIRST before /:id)
router.get('/pending', authorize('admin', 'warden'), getPendingRegistrations);

// 2. Get all registrations (root route - must come after /pending but before /:id)
router.get('/', authorize('admin', 'warden'), getAllRegistrations);

// 3. Approve registration (specific route with /approve suffix - before /:id)
router.post('/:id/approve', authorize('admin', 'warden'), approveRegistration);

// 4. Reject registration (specific route with /reject suffix - before /:id)
router.post('/:id/reject', authorize('admin', 'warden'), rejectRegistration);

// 5. Get single registration (parameterized route - MUST come LAST)
router.get('/:id', authorize('admin', 'warden'), getRegistration);

// 6. Delete registration (parameterized route - MUST come LAST)
router.delete('/:id', authorize('admin'), deleteRegistration);

// Debug: Log route registration on module load
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_ROUTES === 'true') {
  console.log('✅ Student Registration routes registered:');
  console.log('   1. GET    /api/student-registration/pending');
  console.log('   2. GET    /api/student-registration');
  console.log('   3. POST   /api/student-registration/:id/approve');
  console.log('   4. POST   /api/student-registration/:id/reject');
  console.log('   5. GET    /api/student-registration/:id');
  console.log('   6. DELETE /api/student-registration/:id');
}

module.exports = router;


