const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  feeType: {
    type: String,
    enum: ['hostel', 'mess', 'admission', 'security', 'maintenance', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partial', 'checked_out', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cash']
  },
  transactionId: String,
  // Payment split for hostel fees (rent → Youstel, mess → HUF)
  paidAmount: {
    type: Number,
    default: 0
  },
  youstelAmount: {
    type: Number,
    default: 0
  },
  hufAmount: {
    type: Number,
    default: 0
  },
  youstelVoucher: {
    type: String,
    default: null
  },
  hufVoucher: {
    type: String,
    default: null
  },
  remainingBalance: {
    type: Number,
    default: 0
  },
  semester: Number,
  year: Number,
  remarks: String,
  // Package and checkout tracking
  packageType: {
    type: String,
    enum: ['1month', '2months', '3months', '4months', '5months']
  },
  checkInDate: Date,
  checkOutDate: Date,
  actualStayMonths: Number,
  depositAmount: {
    type: Number,
    default: 0
  },
  rentAmount: {
    type: Number,
    default: 0
  },
  messAmount: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  // Room details (preserved for history when student changes rooms)
  roomNumber: String, // Room number at time of fee creation
  bedLabel: String, // Bed selected during fee creation
  roomType: String, // Room type: single, double, triple, quadruple
  // Mess provider/account (only for mess fees)
  messProvider: {
    type: String,
    enum: ['yustel', 'huf', 'other'],
    default: null
  },
  messAccountNumber: {
    type: String,
    default: null
  },
  // Bank account details (for hostel and mess fees)
  bankAccountNumber: {
    type: String,
    default: null
  },
  bankName: {
    type: String,
    default: null
  },
  bankIFSC: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  source: {
    type: String,
    enum: ['manual', 'checklist_auto', 'registration_auto'],
    default: 'manual'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update status based on due date
feeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'pending' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
