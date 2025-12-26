const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['Payment', 'Other'],
    default: 'Payment'
  },
  description: {
    type: String,
    default: ''
  },
  account: {
    type: String,
    enum: ['Youstel', 'HUF'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  voucher: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cash'],
    default: 'online'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);





