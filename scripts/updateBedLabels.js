const mongoose = require('mongoose');
require('dotenv').config();
const Room = require('../models/Room');

const updateBedLabels = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const rooms = await Room.find({});
    console.log(`Found ${rooms.length} rooms to update`);

    const bedLabels = ['A', 'B', 'C', 'D'];

    for (const room of rooms) {
      if (room.beds && room.beds.length > 0) {
        // Add bedLabel to each bed if it doesn't exist
        room.beds = room.beds.map((bed, index) => ({
          ...bed.toObject(),
          bedLabel: bed.bedLabel || bedLabels[index]
        }));
        
        await room.save();
        console.log(`Updated room ${room.roomNo} with bed labels`);
      }
    }

    console.log('All rooms updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating bed labels:', error);
    process.exit(1);
  }
};

updateBedLabels();
