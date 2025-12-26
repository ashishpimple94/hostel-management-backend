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
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Update room fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'students' && key !== 'beds' && key !== 'occupied') {
        room[key] = req.body[key];
      }
    });

    // If status is being updated to 'available', check and fix occupancy
    if (req.body.status === 'available') {
      // Clear any invalid student references
      if (room.students && room.students.length === 0) {
        room.occupied = 0;
        // Clear all beds
        if (room.beds && room.beds.length > 0) {
          room.beds.forEach(bed => {
            bed.isOccupied = false;
            bed.studentId = null;
          });
        }
      } else {
        // Recalculate occupied based on actual students
        room.occupied = room.students.length;
        // Update beds based on actual students
        if (room.beds && room.beds.length > 0) {
          room.beds.forEach(bed => {
            if (bed.studentId && !room.students.some(s => s.toString() === bed.studentId.toString())) {
              bed.isOccupied = false;
              bed.studentId = null;
            }
          });
        }
      }
    }

    // Update status based on occupancy if not explicitly set
    if (!req.body.status) {
      if (room.occupied >= room.capacity) {
        room.status = 'occupied';
      } else if (room.occupied === 0) {
        room.status = 'available';
      } else if (room.occupied > 0 && room.occupied < room.capacity) {
        room.status = room.status === 'maintenance' ? 'maintenance' : 'available';
      }
    } else {
      // If status is explicitly set, validate it
      if (req.body.status === 'available' && room.occupied > 0 && room.occupied < room.capacity) {
        // Keep status as available if partially occupied
        room.status = 'available';
      } else if (req.body.status === 'available' && room.occupied === 0) {
        room.status = 'available';
      } else if (req.body.status === 'occupied' && room.occupied >= room.capacity) {
        room.status = 'occupied';
      } else {
        room.status = req.body.status;
      }
    }

    room.markModified('beds');
    await room.save();

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Fix room status - make room available if it has no students
// @route   POST /api/rooms/:id/fix-status
// @access  Private (Admin/Warden)
exports.fixRoomStatus = async (req, res) => {
  try {
    // Try to find by ID first, then by roomNo
    let room = await Room.findById(req.params.id).populate('students');
    if (!room) {
      // Try finding by roomNo
      room = await Room.findOne({ roomNo: req.params.id }).populate('students');
    }
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if room has any actual students (populated students)
    let actualStudents = [];
    if (room.students && room.students.length > 0) {
      // Filter out null/undefined and check if students are actually populated objects
      actualStudents = room.students.filter(s => {
        if (!s || s === null || s === undefined) return false;
        // If it's an ObjectId string, it's not populated - skip it
        if (typeof s === 'string') return false;
        // If it's an object with _id, it's populated - include it
        return s._id || s.studentId;
      });
    }
    
    console.log(`\n🔍 Fixing Room ${room.roomNo} status:`);
    console.log(`   - room.students array length: ${room.students ? room.students.length : 0}`);
    console.log(`   - actualStudents (valid) length: ${actualStudents.length}`);
    
    // If no students, make room available - AGGRESSIVE CLEANUP
    if (actualStudents.length === 0) {
      console.log(`   ✅ No students found - making room available (AGGRESSIVE CLEANUP)`);
      
      // FORCE: Clear students array completely
      room.students = [];
      
      // FORCE: Clear all beds - no matter what
      if (room.beds && room.beds.length > 0) {
        let clearedCount = 0;
        room.beds.forEach(bed => {
          if (bed.isOccupied || bed.studentId) {
            console.log(`   🧹 Clearing bed ${bed.bedLabel} (was occupied: ${bed.isOccupied}, had studentId: ${bed.studentId ? 'yes' : 'no'})`);
            bed.isOccupied = false;
            bed.studentId = null;
            clearedCount++;
          }
        });
        console.log(`   🧹 Cleared ${clearedCount} bed(s)`);
      }
      
      // FORCE: Set occupied to 0
      room.occupied = 0;
      
      // FORCE: Set status to available
      room.status = 'available';
      
      // Mark beds as modified
      room.markModified('beds');
      room.markModified('students');
      
      // Save room
      await room.save();

      console.log(`   ✅ Room ${room.roomNo} is now COMPLETELY AVAILABLE (vacant)`);
      console.log(`   ✅ occupied: ${room.occupied}, status: ${room.status}`);
      
      return res.status(200).json({
        success: true,
        message: `Room ${room.roomNo} status fixed. Room is now completely available (vacant). All beds cleared.`,
        data: room
      });
    } else {
      // Recalculate occupied count
      room.occupied = actualStudents.length;
      
      // Update beds - sync bed status with students
      if (room.beds && room.beds.length > 0) {
        // First, mark beds as occupied if they have valid studentId
        room.beds.forEach(bed => {
          if (bed.studentId) {
            const studentExists = actualStudents.some(s => s._id.toString() === bed.studentId.toString());
            if (studentExists) {
              // Student exists, bed should be occupied
              if (!bed.isOccupied) {
                bed.isOccupied = true;
              }
            } else {
              // Student doesn't exist, clear bed
              bed.isOccupied = false;
              bed.studentId = null;
            }
          } else {
            // No studentId, bed should be available
            bed.isOccupied = false;
          }
        });
        
        // Also check if students are allocated but beds are not marked
        // This handles the case where student is in students array but bed is not marked as occupied
        actualStudents.forEach(student => {
          const studentId = student._id.toString();
          // Check if this student has a bed allocated
          const studentBed = room.beds.find(b => b.studentId && b.studentId.toString() === studentId);
          if (!studentBed) {
            // Student is in room but no bed allocated - find first available bed and allocate
            const availableBed = room.beds.find(b => !b.isOccupied && !b.studentId);
            if (availableBed) {
              availableBed.isOccupied = true;
              availableBed.studentId = student._id;
            }
          }
        });
      }
      
      // Recalculate occupied from beds array - check if beds actually have valid students
      let actualOccupiedBeds = 0;
      if (room.beds && room.beds.length > 0) {
        // Count only beds that are marked occupied AND have a valid studentId that exists in actualStudents
        actualOccupiedBeds = room.beds.filter(bed => {
          if (!bed.isOccupied) return false;
          if (!bed.studentId) {
            // Bed marked as occupied but no studentId - clear it
            console.log(`   🧹 Bed ${bed.bedLabel}: Marked occupied but no studentId - clearing`);
            bed.isOccupied = false;
            return false;
          }
          // Check if studentId exists in actualStudents array
          const studentExists = actualStudents.some(s => s._id.toString() === bed.studentId.toString());
          if (!studentExists) {
            // Bed has studentId but student doesn't exist - clear it
            console.log(`   🧹 Bed ${bed.bedLabel}: Student ${bed.studentId} not found - clearing`);
            bed.isOccupied = false;
            bed.studentId = null;
            return false;
          }
          return true;
        }).length;
      }
      
      // Use the actual count (beds with valid students)
      room.occupied = Math.max(actualOccupiedBeds, actualStudents.length);
      
      console.log(`🔍 Room ${room.roomNo} status check:`);
      console.log(`   - actualStudents.length: ${actualStudents.length}`);
      console.log(`   - actualOccupiedBeds (with valid students): ${actualOccupiedBeds}`);
      console.log(`   - room.occupied (final): ${room.occupied}`);
      
      // Update status based on occupancy
      if (room.occupied >= room.capacity) {
        room.status = 'occupied';
        console.log(`   ✅ Status: occupied (full)`);
      } else if (room.occupied === 0) {
        room.status = 'available';
        console.log(`   ✅ Status: available (vacant)`);
      } else {
        room.status = room.status === 'maintenance' ? 'maintenance' : 'available';
        console.log(`   ✅ Status: available (partially occupied: ${room.occupied}/${room.capacity})`);
      }
      
      room.markModified('beds');
      await room.save();

      return res.status(200).json({
        success: true,
        message: `Room ${room.roomNo} status updated. Occupied: ${room.occupied}/${room.capacity}`,
        data: room
      });
    }
  } catch (error) {
    console.error('Fix room status error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while fixing room status.' 
    });
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

    let room = await Room.findById(req.params.id);
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

    const targetRoomId = room._id.toString();
    const existingRoomId = student.roomNo ? student.roomNo.toString() : null;

    // If student already allocated, free previous bed
    if (existingRoomId) {
      const currentRoom = await Room.findById(existingRoomId);
      if (currentRoom) {
        currentRoom.students = currentRoom.students.filter(
          (s) => s.toString() !== student._id.toString()
        );

        currentRoom.beds = currentRoom.beds.map((bed) => {
          if (bed.studentId && bed.studentId.toString() === student._id.toString()) {
            bed.isOccupied = false;
            bed.studentId = null;
          }
          return bed;
        });

        const currentOccupiedBeds = currentRoom.beds.filter((bed) => bed.isOccupied).length;
        currentRoom.occupied = Math.max(currentOccupiedBeds, currentRoom.students.length);

        if (currentRoom.occupied === 0) {
          currentRoom.status = 'available';
        } else if (currentRoom.occupied < currentRoom.capacity) {
          currentRoom.status = currentRoom.status === 'maintenance' ? 'maintenance' : 'available';
        } else {
          currentRoom.status = 'occupied';
        }

        currentRoom.markModified('beds');
        await currentRoom.save();

        if (currentRoom._id.toString() === targetRoomId) {
          room = currentRoom;
        }
      }
    }

    // Refresh room data if needed
    if (!room) {
      room = await Room.findById(req.params.id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found after reassignment'
        });
      }
    }

    // Check if room is available (after possible deallocation)
    if (room.occupied >= room.capacity && (!existingRoomId || existingRoomId !== targetRoomId)) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Find specific bed if bedLabel provided, otherwise first available
    let availableBed;
    if (bedLabel) {
      availableBed = room.beds.find((bed) => {
        const matchesLabel =
          (bed.bedLabel && bed.bedLabel.toString().toLowerCase() === bedLabel.toString().toLowerCase()) ||
          (bed.bedNumber && bed.bedNumber.toString().toLowerCase() === bedLabel.toString().toLowerCase()) ||
          (bed._id && bed._id.toString() === bedLabel.toString());
        return matchesLabel && !bed.isOccupied;
      });
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
      data: { room, student, bed: availableBed.bedLabel, previousRoom: existingRoomId }
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

// @desc    Shift student from one room to another
// @route   POST /api/rooms/shift
// @access  Private (Admin/Warden)
exports.shiftRoom = async (req, res) => {
  try {
    const Fee = require('../models/Fee');
    const { studentId, newRoomId, bedLabel } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!studentId || (typeof studentId === 'string' && studentId.trim() === '')) {
      missingFields.push('studentId');
    }
    if (!newRoomId || (typeof newRoomId === 'string' && newRoomId.trim() === '')) {
      missingFields.push('newRoomId');
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

    // Get student
    const student = await Student.findById(studentId).populate('roomNo');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student has a room
    if (!student.roomNo) {
      return res.status(400).json({
        success: false,
        message: 'Student does not have a room allocated. Use allocate instead.'
      });
    }

    const oldRoomId = student.roomNo._id || student.roomNo;
    const oldRoom = await Room.findById(oldRoomId);
    if (!oldRoom) {
      return res.status(404).json({
        success: false,
        message: 'Current room not found'
      });
    }

    // Get new room
    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) {
      return res.status(404).json({
        success: false,
        message: 'New room not found'
      });
    }

    // Check if new room has available bed
    if (newRoom.occupied >= newRoom.capacity) {
      return res.status(400).json({
        success: false,
        message: 'New room is full'
      });
    }

    // Check if the specific bed is available
    const availableBed = newRoom.beds.find(bed => bed.bedLabel === bedLabel && !bed.isOccupied);
    if (!availableBed) {
      return res.status(400).json({
        success: false,
        message: `Bed ${bedLabel} is not available in the new room`
      });
    }

    // Check if shifting to same room
    if (oldRoomId.toString() === newRoomId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Student is already in this room'
      });
    }

    // Calculate rent difference per month
    const oldRentPerMonth = oldRoom.rent || 0;
    const newRentPerMonth = newRoom.rent || 0;
    const rentDifferencePerMonth = newRentPerMonth - oldRentPerMonth;

    // Calculate mess charge difference per month
    const oldMessPerMonth = oldRoom.messChargePerMonth || 3000;
    const newMessPerMonth = newRoom.messChargePerMonth || 3000;
    const messDifferencePerMonth = newMessPerMonth - oldMessPerMonth;

    // Get student's active fee to determine package type
    const activeFee = await Fee.findOne({
      student: studentId,
      status: { $in: ['paid', 'pending'] },
      feeType: 'hostel'
    }).sort('-createdAt');

    let packageType = '5months';
    let remainingMonths = 5;
    
    if (activeFee && activeFee.packageType) {
      packageType = activeFee.packageType;
      const expectedMonths = parseInt(packageType.replace('months', ''));
      
      // Calculate remaining months from check-in date
      if (activeFee.checkInDate || activeFee.paidDate) {
        const checkInDate = new Date(activeFee.checkInDate || activeFee.paidDate);
        const today = new Date();
        const daysDiff = Math.ceil((today - checkInDate) / (1000 * 60 * 60 * 24));
        // Fixed 30-day cycle calculation
        const monthsUsed = Math.floor(daysDiff / 30); // Always 30 days per month
        remainingMonths = Math.max(0, expectedMonths - monthsUsed);
      } else {
        remainingMonths = expectedMonths;
      }
    }

    // Calculate adjustment amount for remaining period
    const rentAdjustment = rentDifferencePerMonth * remainingMonths;
    const messAdjustment = messDifferencePerMonth * remainingMonths;
    const totalAdjustment = rentAdjustment + messAdjustment;

    // Deallocate from old room
    oldRoom.students = oldRoom.students.filter(
      s => s.toString() !== studentId.toString()
    );
    
    // Find and free the bed(s) in old room
    const studentBeds = oldRoom.beds.filter(bed => bed.studentId && bed.studentId.toString() === studentId.toString());
    studentBeds.forEach(bed => {
      bed.isOccupied = false;
      bed.studentId = null;
    });
    
    oldRoom.occupied = Math.max(0, oldRoom.students.length);
    
    if (oldRoom.occupied === 0) {
      oldRoom.status = 'available';
    } else if (oldRoom.occupied < oldRoom.capacity) {
      oldRoom.status = oldRoom.status === 'occupied' ? 'available' : oldRoom.status;
    }
    
    oldRoom.markModified('beds');
    await oldRoom.save();

    // Allocate to new room
    if (!newRoom.students.includes(student._id)) {
      newRoom.students.push(student._id);
    }
    newRoom.occupied = Math.max(newRoom.occupied, newRoom.students.length);
    availableBed.isOccupied = true;
    availableBed.studentId = student._id;
    
    // Update room status based on occupancy
    if (newRoom.occupied >= newRoom.capacity) {
      newRoom.status = 'occupied';
    } else if (newRoom.occupied > 0) {
      newRoom.status = newRoom.status === 'maintenance' ? 'maintenance' : 'available';
    }
    
    newRoom.markModified('beds');
    await newRoom.save();

    // Update student room allocation
    student.roomNo = newRoom._id;
    student.allocationDate = new Date();
    await student.save();

    // Create ledger entries for room shift
    const LedgerEntry = require('../models/LedgerEntry');
    let adjustmentFee = null;
    
    // ALWAYS create a "Room Shifted" info entry in ledger (even if no fee adjustment)
    const shiftInfoVoucher = `SHIFT-${Date.now()}`;
    const oldBedLabel = studentBeds[0]?.bedLabel || 'N/A';
    await LedgerEntry.create({
      student: studentId,
      date: new Date(),
      type: 'Other',
      account: 'Youstel',
      amount: 0,
      description: `🏠 Room Shifted: ${oldRoom.roomNo} (${oldRoom.type}, Bed ${oldBedLabel}) → ${newRoom.roomNo} (${newRoom.type}, Bed ${bedLabel})`,
      voucher: shiftInfoVoucher,
      paymentMethod: 'online'
    });
    
    // Create fee adjustment entries if there's a difference
    if (totalAdjustment !== 0) {
      const isUpgrade = totalAdjustment > 0;
      const adjustmentDescription = isUpgrade
        ? `Room Shift - Upgrade: ${oldRoom.roomNo} (${oldRoom.type}) → ${newRoom.roomNo} (${newRoom.type})`
        : `Room Shift - Downgrade: ${oldRoom.roomNo} (${oldRoom.type}) → ${newRoom.roomNo} (${newRoom.type})`;
      
      // Create ledger entries for Hostel (Youstel) adjustment
      if (rentAdjustment !== 0) {
        const hostelVoucher = `GV-Shift-Hostel-${Date.now()}`;
        await LedgerEntry.create({
          student: studentId,
          date: new Date(),
          type: isUpgrade ? 'Other' : 'Payment', // Use valid enum: 'Payment' for credit, 'Other' for debit
          account: 'Youstel',
          amount: Math.abs(rentAdjustment),
          description: `${adjustmentDescription} - Hostel Fee (${remainingMonths} months remaining) ${isUpgrade ? '[Additional Charge]' : '[Refund]'}`,
          voucher: hostelVoucher,
          paymentMethod: 'online' // Use valid enum value
        });
      }
      
      // Create ledger entries for Mess (HUF) adjustment
      if (messAdjustment !== 0) {
        const messVoucher = `GV-Shift-Mess-${Date.now()}`;
        await LedgerEntry.create({
          student: studentId,
          date: new Date(),
          type: isUpgrade ? 'Other' : 'Payment', // Use valid enum: 'Payment' for credit, 'Other' for debit
          account: 'HUF',
          amount: Math.abs(messAdjustment),
          description: `${adjustmentDescription} - Mess Fee (${remainingMonths} months remaining) ${isUpgrade ? '[Additional Charge]' : '[Refund]'}`,
          voucher: messVoucher,
          paymentMethod: 'online' // Use valid enum value
        });
      }
      
      // Also create Fee record for tracking (optional, for reports)
      const adjustmentType = isUpgrade ? 'hostel' : 'other';
      adjustmentFee = await Fee.create({
        student: studentId,
        feeType: adjustmentType,
        amount: Math.abs(totalAdjustment),
        dueDate: new Date(),
        status: isUpgrade ? 'pending' : 'paid',
        remarks: `${adjustmentDescription}. Rent: ₹${rentAdjustment > 0 ? '+' : ''}${rentAdjustment.toLocaleString()}, Mess: ₹${messAdjustment > 0 ? '+' : ''}${messAdjustment.toLocaleString()}, Remaining: ${remainingMonths} months`,
        rentAmount: Math.abs(rentAdjustment),
        messAmount: Math.abs(messAdjustment),
        packageType: packageType,
        bedLabel: bedLabel,
        paidDate: isUpgrade ? null : new Date(),
        paymentMethod: isUpgrade ? null : 'adjustment',
        transactionId: isUpgrade ? null : `ADJ-${Date.now()}`
      });
    }

    // Update student's pending fees - call the helper function directly
    try {
      const feeController = require('./feeController');
      // The function is not exported, so we'll update manually
      const studentForUpdate = await Student.findById(studentId).populate('roomNo');
      if (studentForUpdate && studentForUpdate.roomNo) {
        const Fee = require('../models/Fee');
        const pendingFees = await Fee.find({
          student: studentId,
          status: { $in: ['pending', 'overdue'] }
        }).sort('dueDate');
        
        const totalPendingAmount = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
        const hasPendingFees = pendingFees.length > 0;
        const pendingFeesFrom = hasPendingFees ? pendingFees[0].dueDate : null;
        const pendingFeesUntil = hasPendingFees ? pendingFees[pendingFees.length - 1].dueDate : null;
        
        await Student.findByIdAndUpdate(studentId, {
          hasPendingFees,
          totalPendingAmount,
          pendingFeesFrom,
          pendingFeesUntil
        });
      }
    } catch (updateError) {
      console.error('Error updating student pending fees:', updateError);
      // Don't fail the shift if this fails
    }

    // Fetch updated rooms to show bed status
    const updatedOldRoom = await Room.findById(oldRoomId);
    const updatedNewRoom = await Room.findById(newRoomId);

    res.status(200).json({
      success: true,
      message: `Student successfully shifted from Room ${oldRoom.roomNo} (${oldRoom.type}) to Room ${newRoom.roomNo} (${newRoom.type})`,
      data: {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
          roomNo: newRoom.roomNo
        },
        oldRoom: {
          _id: updatedOldRoom._id,
          roomNo: updatedOldRoom.roomNo,
          type: updatedOldRoom.type,
          occupied: updatedOldRoom.occupied,
          capacity: updatedOldRoom.capacity,
          status: updatedOldRoom.status,
          beds: updatedOldRoom.beds.map(bed => ({
            bedLabel: bed.bedLabel,
            bedNumber: bed.bedNumber,
            isOccupied: bed.isOccupied,
            studentId: bed.studentId
          }))
        },
        newRoom: {
          _id: updatedNewRoom._id,
          roomNo: updatedNewRoom.roomNo,
          type: updatedNewRoom.type,
          occupied: updatedNewRoom.occupied,
          capacity: updatedNewRoom.capacity,
          status: updatedNewRoom.status,
          allocatedBed: availableBed.bedLabel,
          beds: updatedNewRoom.beds.map(bed => ({
            bedLabel: bed.bedLabel,
            bedNumber: bed.bedNumber,
            isOccupied: bed.isOccupied,
            studentId: bed.studentId
          }))
        },
        adjustment: {
          rentDifferencePerMonth,
          messDifferencePerMonth,
          rentAdjustment,
          messAdjustment,
          totalAdjustment,
          remainingMonths,
          packageType
        },
        adjustmentFee: adjustmentFee ? {
          _id: adjustmentFee._id,
          amount: adjustmentFee.amount,
          status: adjustmentFee.status,
          remarks: adjustmentFee.remarks
        } : null
      }
    });
  } catch (error) {
    console.error('Room shift error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while shifting room. Please try again.' 
    });
  }
};
