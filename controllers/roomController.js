const Room = require('../models/Room');
const Student = require('../models/Student');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
exports.getRooms = async (req, res) => {
  try {
    const { status, type, building } = req.query;
    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (building) query.building = building;

    const rooms = await Room.find(query).populate('students');

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get available rooms
// @route   GET /api/rooms/available
// @access  Private
exports.getAvailableRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      $expr: { $lt: ['$occupied', '$capacity'] },
      status: 'available'
    });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get room availability statistics
// @route   GET /api/rooms/availability-stats
// @access  Private
exports.getRoomAvailabilityStats = async (req, res) => {
  try {
    const rooms = await Room.find({ status: { $ne: 'maintenance' } }).populate('students', 'firstName lastName studentId');
    
    console.log('Total rooms found:', rooms.length);
    console.log('AC rooms:', rooms.filter(r => r.isAC).length);
    console.log('AC Single:', rooms.filter(r => r.isAC && r.type === 'single').length);

    // Organize by AC/Non-AC and sharing type
    const stats = {
      nonAC: {
        fourSharing: { total: 0, occupied: 0, available: 0, beds: [] },
        twoSharing: { total: 0, occupied: 0, available: 0, beds: [] },
        oneSharing: { total: 0, occupied: 0, available: 0, beds: [] }
      },
      AC: {
        fourSharing: { total: 0, occupied: 0, available: 0, beds: [] },
        twoSharing: { total: 0, occupied: 0, available: 0, beds: [] },
        oneSharing: { total: 0, occupied: 0, available: 0, beds: [] }
      }
    };

    rooms.forEach(room => {
      const section = room.isAC ? 'AC' : 'nonAC';
      let sharingType;

      switch(room.type) {
        case 'quadruple':
          sharingType = 'fourSharing';
          break;
        case 'double':
          sharingType = 'twoSharing';
          break;
        case 'single':
          sharingType = 'oneSharing';
          break;
        default:
          return;
      }

      // Calculate actual occupied from beds array
      const actualOccupied = room.beds && Array.isArray(room.beds)
        ? room.beds.filter(bed => bed.isOccupied === true).length
        : room.occupied || 0;
      
      const availableBeds = room.capacity - actualOccupied;
      stats[section][sharingType].total += room.capacity;
      stats[section][sharingType].occupied += actualOccupied;
      stats[section][sharingType].available += availableBeds;

      // Add room details with bed information
      stats[section][sharingType].beds.push({
        roomNo: room.roomNo,
        building: room.building,
        floor: room.floor,
        capacity: room.capacity,
        occupied: actualOccupied,
        available: availableBeds,
        beds: room.beds || [],
        students: room.students,
        rent: room.rent,
        rentFor5Months: room.rentFor5Months,
        messChargePerMonth: room.messChargePerMonth || 3000,
        messChargeFor5Months: room.messChargeFor5Months || 15000,
        status: room.status
      });
    });
    
    console.log('AC oneSharing stats:', {
      total: stats.AC.oneSharing.total,
      available: stats.AC.oneSharing.available,
      bedsCount: stats.AC.oneSharing.beds.length
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('students');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Private (Admin/Warden)
exports.createRoom = async (req, res) => {
  try {
    // Validate required fields
    const { roomNo, floor, building, type, capacity, rent, rentFor5Months } = req.body;
    
    const missingFields = [];
    if (!roomNo || (typeof roomNo === 'string' && roomNo.trim() === '')) {
      missingFields.push('roomNo');
    }
    if (floor === undefined || floor === null || floor === '') {
      missingFields.push('floor');
    }
    if (!building || (typeof building === 'string' && building.trim() === '')) {
      missingFields.push('building');
    }
    if (!type || (typeof type === 'string' && type.trim() === '')) {
      missingFields.push('type');
    }
    if (capacity === undefined || capacity === null || capacity === '' || capacity <= 0) {
      missingFields.push('capacity');
    }
    if (rent === undefined || rent === null || rent === '' || rent <= 0) {
      missingFields.push('rent');
    }
    if (rentFor5Months === undefined || rentFor5Months === null || rentFor5Months === '' || rentFor5Months <= 0) {
      missingFields.push('rentFor5Months');
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}. Please fill all required fields.`
      });
    }

    // Validate type is valid
    const validTypes = ['single', 'double', 'triple', 'quadruple'];
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid room type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate that single AC rooms are not allowed
    if (type.toLowerCase() === 'single' && isAC) {
      return res.status(400).json({
        success: false,
        message: 'Single AC rooms are not available. Only double AC rooms (2 sharing) are available.'
      });
    }

    // Validate capacity matches type
    const capacityMap = {
      'single': 1,
      'double': 2,
      'triple': 3,
      'quadruple': 4
    };
    if (capacity !== capacityMap[type.toLowerCase()]) {
      return res.status(400).json({
        success: false,
        message: `Capacity ${capacity} does not match room type ${type}. Expected capacity: ${capacityMap[type.toLowerCase()]}`
      });
    }

    // Validate floor is a positive number
    if (isNaN(floor) || Number(floor) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Floor must be a valid positive number.'
      });
    }

    // Validate rent amounts are positive numbers
    if (isNaN(rent) || Number(rent) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Rent must be a positive number. Please enter a valid amount.'
      });
    }

    if (isNaN(rentFor5Months) || Number(rentFor5Months) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Rent for 5 months must be a positive number. Please enter a valid amount.'
      });
    }

    const room = await Room.create(req.body);

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Room number already exists. Please use a different room number.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while creating room. Please try again.' 
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Admin/Warden)
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Allocate student to room
// @route   POST /api/rooms/:id/allocate
// @access  Private (Admin/Warden)
exports.allocateRoom = async (req, res) => {
  try {
    const { studentId, bedLabel } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!studentId || (typeof studentId === 'string' && studentId.trim() === '')) {
      missingFields.push('studentId');
    }
    if (!bedLabel || (typeof bedLabel === 'string' && bedLabel.trim() === '')) {
      missingFields.push('bedLabel');
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}. Please fill all required fields.`
      });
    }

    // Validate bedLabel format
    const validBedLabels = ['A', 'B', 'C', 'D'];
    if (!validBedLabels.includes(bedLabel.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid bed label. Must be one of: ${validBedLabels.join(', ')}`
      });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if room is available
    if (room.occupied >= room.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student already has a room
    if (student.roomNo) {
      return res.status(400).json({
        success: false,
        message: 'Student already has a room allocated'
      });
    }

    // Find specific bed if bedLabel provided, otherwise first available
    let availableBed;
    if (bedLabel) {
      availableBed = room.beds.find(bed => bed.bedLabel === bedLabel && !bed.isOccupied);
      if (!availableBed) {
        return res.status(400).json({
          success: false,
          message: `Bed ${bedLabel} is not available`
        });
      }
    } else {
      availableBed = room.beds.find(bed => !bed.isOccupied);
      if (!availableBed) {
        return res.status(400).json({
          success: false,
          message: 'No available beds in this room'
        });
      }
    }

    // Allocate room and bed
    if (!room.students.includes(student._id)) {
      room.students.push(student._id);
    }
    room.occupied = Math.max(room.occupied, room.students.length);
    availableBed.isOccupied = true;
    availableBed.studentId = student._id;
    
    // Update status based on occupancy
    if (room.occupied >= room.capacity) {
      room.status = 'occupied';
    }
    
    // Mark beds array as modified to ensure changes are saved
    room.markModified('beds');
    await room.save();

    student.roomNo = room._id;
    student.allocationDate = new Date();
    await student.save();

    res.status(200).json({
      success: true,
      data: { room, student, bed: availableBed.bedLabel }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Deallocate student from room
// @route   POST /api/rooms/:id/deallocate
// @access  Private (Admin/Warden)
exports.deallocateRoom = async (req, res) => {
  try {
    const { studentId } = req.body;

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Remove student from room and free the bed
    room.students = room.students.filter(
      s => s.toString() !== studentId.toString()
    );
    
    // Find and free the bed(s)
    const studentBeds = room.beds.filter(bed => bed.studentId && bed.studentId.toString() === studentId.toString());
    studentBeds.forEach(bed => {
      bed.isOccupied = false;
      bed.studentId = null;
    });
    
    // Update occupied count based on actual students array length
    room.occupied = Math.max(0, room.students.length);
    
    // Update status based on occupancy
    if (room.occupied === 0) {
      room.status = 'available';
    } else if (room.occupied < room.capacity) {
      room.status = room.status === 'occupied' ? 'available' : room.status;
    }
    
    // Mark beds array as modified to ensure changes are saved
    room.markModified('beds');
    await room.save();

    student.roomNo = null;
    student.allocationDate = null;
    await student.save();

    res.status(200).json({
      success: true,
      data: { room, student }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Admin)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.occupied > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with allocated students'
      });
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
