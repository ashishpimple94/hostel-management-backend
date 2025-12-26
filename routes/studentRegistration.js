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

// Debug: Log route registration
console.log('✅ Student Registration routes registered:');
console.log('   GET /api/student-registration/pending');
console.log('   GET /api/student-registration');
console.log('   GET /api/student-registration/:id');
console.log('   POST /api/student-registration/:id/approve');
console.log('   POST /api/student-registration/:id/reject');
console.log('   DELETE /api/student-registration/:id');

// CRITICAL: Specific routes MUST come before parameterized routes
// Get pending registrations (specific route - must be FIRST)
router.get('/pending', authorize('admin', 'warden'), getPendingRegistrations);

// Approve registration (specific route with /approve suffix)
router.post('/:id/approve', authorize('admin', 'warden'), approveRegistration);

// Reject registration (specific route with /reject suffix)
router.post('/:id/reject', authorize('admin', 'warden'), rejectRegistration);

// Get all registrations (root route - must come after /pending but before /:id)
router.get('/', authorize('admin', 'warden'), getAllRegistrations);

// Get single registration (parameterized route - must come LAST to avoid conflicts)
router.get('/:id', authorize('admin', 'warden'), getRegistration);

// Delete registration (parameterized route - must come LAST)
router.delete('/:id', authorize('admin'), deleteRegistration);

module.exports = router;


