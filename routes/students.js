const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentLedger,
  addManualLedgerEntry,
  deleteManualLedgerEntries,
  autoCreateChecklistFee,
  deleteLedgerEntry,
  shiftLedgerEntry
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(authorize('admin', 'warden', 'accountant'), getStudents)
  .post(authorize('admin', 'warden'), createStudent);

// IMPORTANT: Specific routes must come BEFORE parameterized routes like /:id
// Otherwise Express will match /:id first and never reach these routes

// Ledger routes (specific paths)
router.get('/:id/ledger', getStudentLedger);
router.post('/:id/ledger/entries', authorize('admin', 'accountant', 'warden'), addManualLedgerEntry);
router.delete('/:id/ledger/entries', authorize('admin', 'accountant', 'warden'), deleteManualLedgerEntries);
router.delete('/:id/ledger/entries/:entryId', authorize('admin', 'accountant', 'warden'), deleteLedgerEntry);
router.put('/:id/ledger/entries/:entryId/shift', authorize('admin', 'accountant', 'warden'), shiftLedgerEntry);

// Checklist fee route (specific path - must come before /:id)
router.post('/:id/checklist/fees', authorize('admin', 'warden', 'accountant'), autoCreateChecklistFee);

// Generic student routes (parameterized - must come LAST)
router
  .route('/:id')
  .get(getStudent)
  .put(authorize('admin', 'warden'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

module.exports = router;
