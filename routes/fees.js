const express = require('express');
const router = express.Router();
const {
  getFees,
  getFee,
  createFee,
  updateFee,
  payFee,
  getStudentFees,
  deleteFee,
  checkOut
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(authorize('admin', 'warden', 'accountant', 'student'), getFees)
  .post(authorize('admin', 'accountant'), createFee);

router.get('/student/:studentId', getStudentFees);

// Specific routes must come before generic :id routes
router.put('/:id/pay', authorize('student', 'admin', 'accountant'), payFee);
router.post('/:feeId/checkout', authorize('admin', 'accountant'), checkOut);

router
  .route('/:id')
  .get(getFee)
  .put(authorize('admin', 'accountant'), updateFee)
  .delete(authorize('admin'), deleteFee);

module.exports = router;
