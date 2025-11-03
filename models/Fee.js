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
    enum: ['cash', 'card', 'upi', 'netbanking', 'other']
  },
  transactionId: String,
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
  bedLabel: String, // Bed selected during fee creation
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
