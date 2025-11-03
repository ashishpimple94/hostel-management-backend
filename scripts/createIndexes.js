const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('../models/Student');
const Room = require('../models/Room');
const Fee = require('../models/Fee');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-management');
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Creating indexes...\n');

    // Student indexes
    await Student.collection.createIndex({ email: 1 }, { unique: true });
    await Student.collection.createIndex({ studentId: 1 }, { unique: true });
    await Student.collection.createIndex({ status: 1 });
    await Student.collection.createIndex({ roomNo: 1 });
    console.log('✓ Student indexes created');

    // Room indexes
    await Room.collection.createIndex({ roomNo: 1 }, { unique: true });
    await Room.collection.createIndex({ status: 1 });
    await Room.collection.createIndex({ isAC: 1 });
    await Room.collection.createIndex({ floor: 1, building: 1 });
    console.log('✓ Room indexes created');

    // Fee indexes
    await Fee.collection.createIndex({ student: 1, status: 1 });
    await Fee.collection.createIndex({ dueDate: 1 });
    await Fee.collection.createIndex({ status: 1 });
    await Fee.collection.createIndex({ semester: 1, year: 1 });
    console.log('✓ Fee indexes created');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    console.log('✓ User indexes created');

    // Complaint indexes
    await Complaint.collection.createIndex({ student: 1 });
    await Complaint.collection.createIndex({ status: 1 });
    await Complaint.collection.createIndex({ createdAt: -1 });
    await Complaint.collection.createIndex({ category: 1 });
    console.log('✓ Complaint indexes created');

    console.log('\n🎉 All indexes created successfully!');
    
    // Show index statistics
    const collections = ['students', 'rooms', 'fees', 'users', 'complaints'];
    console.log('\n📈 Index Statistics:\n');
    
    for (const collection of collections) {
      const indexes = await mongoose.connection.db.collection(collection).indexes();
      console.log(`${collection}: ${indexes.length} indexes`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
