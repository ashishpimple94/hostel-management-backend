const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: 'Not provided'
  },
  dateOfBirth: {
    type: Date,
    default: Date.now
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  religion: {
    type: String,
    trim: true
  },
  caste: {
    type: String,
    trim: true
  },
  aadharNumber: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  profilePhoto: {
    type: String,
    trim: true
  },
  // Academic Info
  institute: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    default: 'Not Assigned'
  },
  previousEducationDetails: {
    type: String,
    trim: true
  },
  course: {
    type: String,
    default: 'Not Assigned'
  },
  year: {
    type: Number,
    default: 1
  },
  semester: {
    type: Number,
    default: 1
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  admissionUpToDate: {
    type: Date
  },
  admissionMonths: {
    type: Number
  },
  // Guardian Info
  guardianName: {
    type: String,
    default: 'To be updated'
  },
  guardianLocalName: {
    type: String,
    trim: true
  },
  guardianPhone: {
    type: String,
    default: 'To be updated'
  },
  guardianRelation: {
    type: String,
    default: 'To be updated'
  },
  guardianEmail: String,
  motherName: {
    type: String,
    trim: true
  },
  fatherName: {
    type: String,
    trim: true
  },
  motherMobileNumber: {
    type: String,
    trim: true
  },
  fatherMobileNumber: {
    type: String,
    trim: true
  },
  guardianLocalArea: {
    type: String,
    trim: true
  },
  // Room Allocation
  roomNo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  allocationDate: Date,
  // Mess Provider/Account (yousel/huf)
  messProvider: {
    type: String,
    enum: ['yustel', 'huf', 'other', null],
    default: null
  },
  messAccountNumber: {
    type: String,
    default: null
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'suspended', 'registered'],
    default: 'active'
  },
  // Pending Fees Information
  hasPendingFees: {
    type: Boolean,
    default: false
  },
  totalPendingAmount: {
    type: Number,
    default: 0
  },
  pendingFeesFrom: {
    type: Date
  },
  pendingFeesUntil: {
    type: Date
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

studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Student', studentSchema);
