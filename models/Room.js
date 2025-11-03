const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  floor: {
    type: Number,
    required: true
  },
  building: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['single', 'double', 'triple', 'quadruple'],
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  isAC: {
    type: Boolean,
    default: false
  },
  isBunk: {
    type: Boolean,
    default: false
  },
  occupied: {
    type: Number,
    default: 0
  },
  // Bed availability tracking - array of bed numbers with their status
  beds: [{
    bedNumber: {
      type: Number,
      required: true
    },
    bedLabel: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      required: true
    },
    isOccupied: {
      type: Boolean,
      default: false
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null
    }
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  amenities: [{
    type: String
  }],
  rent: {
    type: Number,
    required: true
  },
  rentFor5Months: {
    type: Number,
    required: true
  },
  // Month-wise rent structure (rent per month varies by duration)
  rentPerMonth: {
    '1month': { type: Number, default: 0 },
    '2months': { type: Number, default: 0 },
    '3months': { type: Number, default: 0 },
    '4months': { type: Number, default: 0 },
    '5months': { type: Number, default: 0 }
  },
  // Package information
  messChargePerMonth: {
    type: Number,
    default: 3000,
    required: true
  },
  messChargeFor5Months: {
    type: Number,
    default: 15000,
    required: true
  },
  isMessCompulsory: {
    type: Boolean,
    default: true
  },
  extraCharge1to2Months: {
    type: Number,
    default: 2000
  },
  extraCharge3to4Months: {
    type: Number,
    default: 1000
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'unavailable'],
    default: 'available'
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

// Virtual for availability
roomSchema.virtual('isAvailable').get(function() {
  return this.occupied < this.capacity && this.status === 'available';
});

roomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Initialize beds array if not present
  if (!this.beds || this.beds.length === 0) {
    this.beds = [];
    const bedLabels = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= this.capacity; i++) {
      this.beds.push({
        bedNumber: i,
        bedLabel: bedLabels[i - 1],
        isOccupied: false,
        studentId: null
      });
    }
  }
  
  // Update status based on occupancy
  if (this.occupied >= this.capacity) {
    this.status = 'occupied';
  } else if (this.occupied === 0 && this.status === 'occupied') {
    this.status = 'available';
  }
  next();
});

module.exports = mongoose.model('Room', roomSchema);
