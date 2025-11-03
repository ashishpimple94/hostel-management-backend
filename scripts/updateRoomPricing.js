const mongoose = require('mongoose');
require('dotenv').config();
const Room = require('../models/Room');

// Excel pricing data
const pricingData = {
  // AC Rooms
  'single-ac': {
    '5months': 22000,
    '4months': 23000,
    '3months': 23000,
    '2months': 24000,
    '1month': 24000
  },
  'double-ac': {
    '5months': 21000,
    '4months': 22000,
    '3months': 22000,
    '2months': 23000,
    '1month': 23000
  },
  // Non-AC Rooms
  'quadruple-nonac': {
    '5months': 12000,
    '4months': 13000,
    '3months': 13000,
    '2months': 14000,
    '1month': 14000
  },
  'single-nonac': {
    '5months': 18000,
    '4months': 19000,
    '3months': 19000,
    '2months': 21000,
    '1month': 21000
  },
  'double-nonac': {
    '5months': 17000,
    '4months': 18000,
    '3months': 18000,
    '2months': 19000,
    '1month': 19000
  }
};

const updateRoomPricing = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const rooms = await Room.find({});
    console.log(`Found ${rooms.length} rooms to update`);

    for (const room of rooms) {
      // Determine pricing key based on room type and AC status
      let pricingKey = '';
      const roomType = room.type.toLowerCase(); // single, double, triple, quadruple
      const isAC = room.isAC ? 'ac' : 'nonac';
      
      // Map triple to double pricing (if needed)
      let mappedType = roomType;
      if (roomType === 'triple') {
        mappedType = 'double'; // Use double pricing for triple
      }
      
      pricingKey = `${mappedType}-${isAC}`;
      
      const pricing = pricingData[pricingKey];
      
      if (pricing) {
        room.rentPerMonth = {
          '1month': pricing['1month'],
          '2months': pricing['2months'],
          '3months': pricing['3months'],
          '4months': pricing['4months'],
          '5months': pricing['5months']
        };
        
        // Also update base rent to 5 months rate
        room.rent = pricing['5months'];
        room.rentFor5Months = pricing['5months'] * 5;
        
        // Set mess charges
        room.messChargePerMonth = 3000;
        room.messChargeFor5Months = 15000;
        
        // Fix bed labels if missing
        const bedLabels = ['A', 'B', 'C', 'D'];
        if (room.beds && room.beds.length > 0) {
          room.beds = room.beds.map((bed, index) => ({
            ...bed.toObject(),
            bedLabel: bed.bedLabel || bedLabels[index]
          }));
        }
        
        await room.save();
        console.log(`✅ Updated room ${room.roomNo} (${room.type} ${isAC.toUpperCase()}) with pricing:`, pricing);
      } else {
        console.log(`⚠️  No pricing found for room ${room.roomNo} (${pricingKey})`);
      }
    }

    console.log('\n🎉 All rooms updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating room pricing:', error);
    process.exit(1);
  }
};

updateRoomPricing();
