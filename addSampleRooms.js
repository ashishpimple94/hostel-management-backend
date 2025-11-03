const mongoose = require('mongoose');
const Room = require('./models/Room');

mongoose.connect('mongodb://localhost:27017/hostel-management')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const sampleRooms = [
  // AC Rooms
  { roomNo: '101', floor: 1, building: 'A', type: 'double', capacity: 2, isAC: true, occupied: 0, rent: 8000, rentFor5Months: 40000 },
  { roomNo: '102', floor: 1, building: 'A', type: 'double', capacity: 2, isAC: true, occupied: 2, rent: 8000, rentFor5Months: 40000 },
  { roomNo: '103', floor: 1, building: 'A', type: 'triple', capacity: 3, isAC: true, occupied: 1, rent: 7000, rentFor5Months: 35000 },
  { roomNo: '201', floor: 2, building: 'A', type: 'double', capacity: 2, isAC: true, occupied: 0, rent: 8000, rentFor5Months: 40000 },
  { roomNo: '202', floor: 2, building: 'A', type: 'triple', capacity: 3, isAC: true, occupied: 3, rent: 7000, rentFor5Months: 35000 },
  
  // Non-AC Rooms
  { roomNo: '104', floor: 1, building: 'A', type: 'double', capacity: 2, isAC: false, occupied: 0, rent: 5000, rentFor5Months: 25000 },
  { roomNo: '105', floor: 1, building: 'A', type: 'triple', capacity: 3, isAC: false, occupied: 0, rent: 4500, rentFor5Months: 22500 },
  { roomNo: '106', floor: 1, building: 'A', type: 'double', capacity: 2, isAC: false, occupied: 1, rent: 5000, rentFor5Months: 25000 },
  { roomNo: '203', floor: 2, building: 'A', type: 'triple', capacity: 3, isAC: false, occupied: 2, rent: 4500, rentFor5Months: 22500 },
  { roomNo: '204', floor: 2, building: 'A', type: 'quadruple', capacity: 4, isAC: false, occupied: 0, rent: 4000, rentFor5Months: 20000 },
];

async function addRooms() {
  try {
    // First, check if rooms already exist
    const existingRooms = await Room.countDocuments();
    
    if (existingRooms > 0) {
      console.log(`⚠️  ${existingRooms} rooms already exist. Skipping...`);
      console.log('To add these rooms, first delete existing rooms or use different room numbers.');
      process.exit(0);
    }
    
    // Add sample rooms
    const result = await Room.insertMany(sampleRooms);
    console.log(`✅ Successfully added ${result.length} sample rooms!`);
    
    // Show summary
    const acCount = result.filter(r => r.isAC).length;
    const nonAcCount = result.filter(r => !r.isAC).length;
    
    console.log('\n📊 Summary:');
    console.log(`   AC Rooms: ${acCount}`);
    console.log(`   Non-AC Rooms: ${nonAcCount}`);
    console.log(`   Total: ${result.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding rooms:', error.message);
    process.exit(1);
  }
}

addRooms();
