const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Room = require('../models/Room');

exports.getFees = async (req, res) => {
  try {
    const { status, student, semester, year } = req.query;
    let query = {};

    // If user is a student, automatically filter by their student record
    if (req.user.role === 'student') {
      // Find student by user email
      const studentRecord = await Student.findOne({ email: req.user.email });
      if (studentRecord) {
        query.student = studentRecord._id;
      }
    } else {
      // For admin/accountant, allow filtering by student
      if (student) query.student = student;
    }

    if (status) query.status = status;
    if (semester) query.semester = semester;
    if (year) query.year = year;

    const fees = await Fee.find(query)
      .populate('student')
      .select('+transactionId +paymentMethod +paidDate')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: fees.length, data: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student')
      .select('+transactionId +paymentMethod +paidDate');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFee = async (req, res) => {
  try {
    // Validate required fields
    const { student, amount, dueDate, feeType } = req.body;
    
    const missingFields = [];
    if (!student || (typeof student === 'string' && student.trim() === '')) {
      missingFields.push('student');
    }
    if (!amount || (typeof amount === 'number' && amount <= 0) || amount === '') {
      missingFields.push('amount');
    }
    if (!dueDate || (typeof dueDate === 'string' && dueDate.trim() === '')) {
      missingFields.push('dueDate');
    }
    if (!feeType || (typeof feeType === 'string' && feeType.trim() === '')) {
      missingFields.push('feeType');
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}. Please fill all required fields.`
      });
    }

    // Validate amount is a positive number
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number. Please enter a valid amount.'
      });
    }

    // Validate dueDate is a valid date
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date format. Please enter a valid date.'
      });
    }

    // Validate feeType is valid
    const validFeeTypes = ['hostel', 'mess', 'security', 'other'];
    if (!validFeeTypes.includes(feeType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid fee type. Must be one of: ${validFeeTypes.join(', ')}`
      });
    }

    req.body.createdBy = req.user.id;
    const fee = await Fee.create(req.body);
    
    // Update room occupancy if hostel fee with bedLabel
    if (fee.feeType === 'hostel' && fee.bedLabel && fee.student) {
      try {
        const studentRecord = await Student.findById(fee.student).populate('roomNo');
        
        if (studentRecord && studentRecord.roomNo) {
          const roomId = studentRecord.roomNo._id || studentRecord.roomNo;
          const room = await Room.findById(roomId);
          
          if (room) {
            // Find the bed by bedLabel
            let bed = room.beds.find(b => b.bedLabel === fee.bedLabel);
            
            // If bed doesn't exist, create it
            if (!bed && room.capacity) {
              const bedLabels = ['A', 'B', 'C', 'D'];
              const bedIndex = bedLabels.indexOf(fee.bedLabel);
              if (bedIndex !== -1 && bedIndex < room.capacity) {
                bed = {
                  bedNumber: bedIndex + 1,
                  bedLabel: fee.bedLabel,
                  isOccupied: false,
                  studentId: null
                };
                if (!room.beds || room.beds.length === 0) {
                  room.beds = [];
                }
                room.beds.push(bed);
              }
            }
            
            // Mark bed as occupied if available
            if (bed && !bed.isOccupied) {
              bed.isOccupied = true;
              bed.studentId = studentRecord._id;
              
              // Add student to room if not already present
              if (!room.students.includes(studentRecord._id)) {
                room.students.push(studentRecord._id);
              }
              
              // Update occupied count based on actual students array length
              room.occupied = Math.max(room.occupied, room.students.length);
              
              // Update room status based on occupancy
              if (room.occupied >= room.capacity) {
                room.status = 'occupied';
              } else if (room.occupied > 0) {
                room.status = room.status === 'maintenance' ? room.status : 'available';
              }
              
              // Mark beds array as modified to ensure changes are saved
              room.markModified('beds');
              await room.save();
            }
          }
        }
      } catch (roomError) {
        console.error('Error updating room occupancy during fee creation:', roomError);
        // Don't fail fee creation if occupancy update fails, but log the error
      }
    }
    
    // Update student's pending fees information
    if (student) {
      await updateStudentPendingFees(student);
    }
    
    res.status(201).json({ success: true, data: fee });
  } catch (error) {
    console.error('Create fee error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while creating fee. Please try again.' 
    });
  }
};

exports.updateFee = async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    // Update student's pending fees information (only if student exists)
    if (fee.student) {
      const studentId = fee.student._id || fee.student;
      if (studentId) {
        await updateStudentPendingFees(studentId);
      }
    }
    
    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while updating fee. Please try again.' 
    });
  }
};

exports.payFee = async (req, res) => {
  try {
    const { paymentMethod, transactionId } = req.body;
    
    // Validate required fields
    const missingFields = [];
    if (!paymentMethod || (typeof paymentMethod === 'string' && paymentMethod.trim() === '')) {
      missingFields.push('paymentMethod');
    }
    if (!transactionId || (typeof transactionId === 'string' && transactionId.trim() === '')) {
      missingFields.push('transactionId');
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}. Please fill all required fields.`
      });
    }

    // Validate paymentMethod is valid
    const validPaymentMethods = ['cash', 'bank_transfer', 'upi', 'card', 'online', 'cheque'];
    if (!validPaymentMethods.includes(paymentMethod.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
      });
    }
    
    const fee = await Fee.findById(req.params.id).populate('student');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }

    // Check if student is associated with this fee
    if (!fee.student) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fee is not associated with any student. Please contact administrator.' 
      });
    }

    // Get student ID safely
    const studentId = fee.student._id || fee.student;
    if (!studentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid student information in fee record. Please contact administrator.' 
      });
    }

    fee.status = 'paid';
    fee.paidDate = new Date();
    fee.paymentMethod = paymentMethod;
    fee.transactionId = transactionId;
    await fee.save();
    
    // Auto-allocate bed if hostel fee and bedLabel provided
    if (fee.feeType === 'hostel' && fee.bedLabel && fee.student) {
      // Get fresh student data to check room allocation
      const student = await Student.findById(studentId).populate('roomNo');
      
      if (!student) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student associated with this fee not found. Please contact administrator.' 
        });
      }

      if (student.roomNo) {
        const roomId = student.roomNo._id || student.roomNo;
        if (!roomId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid room allocation data. Please contact administrator.' 
          });
        }

        const room = await Room.findById(roomId);
        
        if (room) {
          // Find and allocate the specific bed
          const bed = room.beds.find(b => b.bedLabel === fee.bedLabel && !b.isOccupied);
          if (bed) {
            bed.isOccupied = true;
            bed.studentId = student._id;
            if (!room.students.includes(student._id)) {
              room.students.push(student._id);
            }
            room.occupied = Math.max(room.occupied, room.students.length);
            // Mark beds array as modified to ensure changes are saved
            room.markModified('beds');
            await room.save();
          }
        }
      }
    }
    
    // Update student's pending fees information
    await updateStudentPendingFees(studentId);

    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    console.error('Pay fee error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while processing payment. Please try again.' 
    });
  }
};

exports.getStudentFees = async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.params.studentId })
      .select('+transactionId +paymentMethod +paidDate');
    res.status(200).json({ success: true, count: fees.length, data: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFee = async (req, res) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.id);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    // Update student's pending fees information (only if student exists)
    if (fee.student) {
      const studentId = fee.student._id || fee.student;
      if (studentId) {
        await updateStudentPendingFees(studentId);
      }
    }
    
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete fee error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while deleting fee. Please try again.' 
    });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { feeId } = req.params;
    const { checkOutDate, reason } = req.body;
    
    // Validate checkOutDate if provided
    if (checkOutDate) {
      const checkOutDateObj = new Date(checkOutDate);
      if (isNaN(checkOutDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid checkout date format. Please enter a valid date.'
        });
      }
      
      // Validate checkOutDate is not in the future
      if (checkOutDateObj > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Checkout date cannot be in the future. Please enter a valid date.'
        });
      }
    }
    
    const fee = await Fee.findById(feeId).populate('student');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    // Check if student is associated with this fee
    if (!fee.student) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fee is not associated with any student. Please contact administrator.' 
      });
    }

    // Get student ID safely
    const feeStudentId = fee.student._id || fee.student;
    if (!feeStudentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid student information in fee record. Please contact administrator.' 
      });
    }
    
    // Check if already checked out
    if (fee.status === 'checked_out' || fee.checkOutDate) {
      return res.status(400).json({ success: false, message: 'Already checked out' });
    }
    
    const student = await Student.findById(feeStudentId).populate('roomNo');
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student associated with this fee not found. Please contact administrator.' 
      });
    }

    if (!student.roomNo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student does not have a room allocated. Cannot process checkout.' 
      });
    }
    
    // Get room ID safely
    const roomId = student.roomNo._id || student.roomNo;
    if (!roomId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid room allocation data. Please contact administrator.' 
      });
    }

    // Fetch the actual Room document from database to ensure we can update it properly
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room associated with student not found. Please contact administrator.' 
      });
    }
    const checkIn = fee.checkInDate || fee.paidDate || fee.createdAt;
    const checkOut = new Date(checkOutDate || Date.now());
    
    // Calculate actual stay duration in days
    const daysDiff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const actualMonths = Math.ceil(daysDiff / 30); // For display
    
    // Get package info
    const packageType = fee.packageType || '5months';
    const expectedMonths = parseInt(packageType.replace('months', ''));
    const expectedDays = expectedMonths * 30;
    
    // Calculate refund/adjustment
    let refundAmount = 0;
    let adjustmentNote = '';
    
    if (daysDiff < expectedDays) {
      // Early checkout - calculate refund based on actual amounts paid
      const depositAmount = fee.depositAmount || 0;
      const rentAmount = fee.rentAmount || 0;
      const messAmount = fee.messAmount || 0;
      
      // Calculate actual usage (days-based pro-rata)
      const unusedDays = expectedDays - daysDiff;
      const rentPerDay = rentAmount / expectedDays;
      const messPerDay = messAmount / expectedDays;
      
      // Refund = unused rent + unused mess + full deposit
      const unusedRent = rentPerDay * unusedDays;
      const unusedMess = messPerDay * unusedDays;
      
      refundAmount = unusedRent + unusedMess + depositAmount;
      
      const actualDaysNote = `${daysDiff} days (${actualMonths} months)`;
      adjustmentNote = `Early checkout: ${actualDaysNote} of ${expectedMonths} months. Refund: ₹${refundAmount.toLocaleString()} (Rent: ₹${unusedRent.toFixed(0)}, Mess: ₹${unusedMess.toFixed(0)}, Deposit: ₹${depositAmount.toLocaleString()})`;
    }
    
    // Update fee with checkout info
    fee.checkOutDate = checkOut;
    fee.actualStayMonths = actualMonths;
    fee.refundAmount = refundAmount;
    fee.refundReason = reason || adjustmentNote;
    fee.remarks = fee.remarks ? `${fee.remarks} | ${adjustmentNote}` : adjustmentNote;
    fee.status = 'checked_out';
    
    await fee.save();
    
    // Create refund entry if applicable
    if (refundAmount > 0) {
      await Fee.create({
        student: feeStudentId,
        feeType: 'other',
        amount: refundAmount,
        dueDate: new Date(),
        status: 'refunded',
        paidDate: new Date(),
        remarks: `Refund for early checkout: ${reason || 'No reason provided'}`,
        semester: fee.semester,
        year: fee.year
      });
    }
    
    // Update student room status - free up the bed
    // Find beds allocated to this student - prioritize by studentId (more reliable)
    const studentId = feeStudentId.toString();
    const studentIdObj = feeStudentId;
    
    // Find ALL beds allocated to this student by studentId (most reliable method)
    const bedsByStudentId = room.beds.filter(b => {
      if (!b.studentId) return false;
      return b.studentId.toString() === studentId;
    });
    
    // Also try to find by bedLabel if fee has it (secondary check)
    let bedsByLabel = [];
    if (fee.bedLabel) {
      const bedByLabel = room.beds.find(b => 
        b.bedLabel === fee.bedLabel && 
        b.studentId && 
        b.studentId.toString() === studentId
      );
      if (bedByLabel) {
        bedsByLabel.push(bedByLabel);
      }
    }
    
    // Combine all methods - prioritize studentId matches
    let allBedsToFree = [...bedsByStudentId];
    if (bedsByLabel.length > 0 && allBedsToFree.length === 0) {
      allBedsToFree = [...bedsByLabel];
    }
    
    // If still no beds found, check by studentId object comparison
    if (allBedsToFree.length === 0) {
      const bedsByObjId = room.beds.filter(b => {
        if (!b.studentId) return false;
        return b.studentId.equals ? b.studentId.equals(studentIdObj) : b.studentId.toString() === studentId;
      });
      if (bedsByObjId.length > 0) {
        allBedsToFree = [...bedsByObjId];
      }
    }
    
    // Final fallback - find by studentId string match
    if (allBedsToFree.length === 0) {
      const bedsByFallback = room.beds.filter(b => {
        if (!b.studentId) return false;
        const bedStudentId = b.studentId.toString ? b.studentId.toString() : String(b.studentId);
        return bedStudentId === studentId;
      });
      if (bedsByFallback.length > 0) {
        allBedsToFree = [...bedsByFallback];
      }
    }
    
    // Deduplicate beds
    const uniqueBedsToFree = Array.from(
      new Map(allBedsToFree.map(bed => [bed.bedNumber || bed.bedLabel, bed])).values()
    );
    
    // Free up ALL beds that belong to this student
    const finalBedsToFree = uniqueBedsToFree.length > 0 ? uniqueBedsToFree : [];
    
    console.log(`Freeing ${finalBedsToFree.length} bed(s) for student ${studentId}`);
    finalBedsToFree.forEach(bed => {
      console.log(`Freeing bed ${bed.bedLabel} (was occupied by ${bed.studentId})`);
      bed.isOccupied = false;
      bed.studentId = null;
    });
    
    // Remove student from room's students array (multiple ways to ensure it works)
    const originalStudentsCount = room.students.length;
    
    // First pass: filter by string comparison
    room.students = room.students.filter(
      s => {
        const studentIdStr = s._id ? s._id.toString() : s.toString();
        return studentIdStr !== studentId;
      }
    );
    
    // Second pass: if still same count, try ObjectId comparison
    if (room.students.length === originalStudentsCount && studentIdObj) {
      room.students = room.students.filter(
        s => {
          if (s.equals && typeof s.equals === 'function') {
            return !s.equals(studentIdObj);
          }
          return s.toString() !== studentId;
        }
      );
    }
    
    // Third pass: direct comparison
    if (room.students.length === originalStudentsCount) {
      room.students = room.students.filter(
        s => {
          const sId = String(s._id || s);
          return sId !== studentId;
        }
      );
    }
    
    console.log(`Removed student from room. Before: ${originalStudentsCount} students, After: ${room.students.length} students`);
    
    // Update occupied count based on actual students array length
    room.occupied = room.students.length;
    
    // Update status based on occupancy
    if (room.occupied === 0) {
      room.status = 'available';
    } else if (room.occupied < room.capacity) {
      room.status = room.status === 'occupied' ? 'available' : room.status;
    }
    
    // Mark room as modified to ensure beds array is saved
    room.markModified('beds');
    await room.save();
    
    // Update student allocation
    await Student.findByIdAndUpdate(feeStudentId, {
      roomNo: null,
      status: 'inactive'
    });
    
    // Fetch updated room data to show bed availability
    const updatedRoom = await Room.findById(roomId).populate('students');
    
    // Get available beds - properly extract bedLabel from beds array
    let availableBeds = [];
    console.log('Updated room beds:', JSON.stringify(updatedRoom.beds, null, 2));
    console.log('Updated room occupied:', updatedRoom.occupied, 'capacity:', updatedRoom.capacity);
    
    if (updatedRoom && updatedRoom.beds && Array.isArray(updatedRoom.beds) && updatedRoom.beds.length > 0) {
      // Filter beds that are not occupied
      availableBeds = updatedRoom.beds
        .filter(b => {
          const isOccupied = b.isOccupied === true;
          const bedLabel = b.bedLabel;
          return !isOccupied && bedLabel;
        })
        .map(b => b.bedLabel)
        .filter(label => label && ['A', 'B', 'C', 'D'].includes(label)); // Only valid bed labels
      
      console.log('Available beds after filter:', availableBeds);
    }
    
    // Fallback: if no beds array or empty result, calculate from occupancy
    if (availableBeds.length === 0 && updatedRoom && updatedRoom.capacity) {
      const bedLabels = ['A', 'B', 'C', 'D'];
      const totalBeds = Math.min(updatedRoom.capacity, 4);
      const occupiedCount = updatedRoom.occupied || 0;
      const availableCount = totalBeds - occupiedCount;
      
      // If we know which beds are occupied, exclude them
      if (updatedRoom.beds && updatedRoom.beds.length > 0) {
        const occupiedBeds = updatedRoom.beds
          .filter(b => b.isOccupied === true)
          .map(b => b.bedLabel)
          .filter(label => label);
        
        availableBeds = bedLabels
          .slice(0, totalBeds)
          .filter(label => !occupiedBeds.includes(label));
      } else {
        // Simple calculation: if 2/4 occupied, beds C and D available
        for (let i = occupiedCount; i < totalBeds; i++) {
          if (bedLabels[i]) {
            availableBeds.push(bedLabels[i]);
          }
        }
      }
    }
    
    // Sort bed labels for consistent display
    availableBeds.sort();
    console.log('Final available beds:', availableBeds);
    
    res.status(200).json({
      success: true,
      data: {
        fee,
        refundAmount,
        actualMonths,
        adjustmentNote,
        room: {
          _id: updatedRoom._id,
          roomNo: updatedRoom.roomNo,
          occupied: updatedRoom.occupied,
          capacity: updatedRoom.capacity,
          status: updatedRoom.status,
          availableBeds: availableBeds,
          totalBeds: updatedRoom.beds?.length || updatedRoom.capacity,
          beds: updatedRoom.beds?.map(b => ({
            bedLabel: b.bedLabel || b.bed?.bedLabel,
            isOccupied: b.isOccupied !== undefined ? b.isOccupied : (b.bed?.isOccupied || false),
            studentId: b.studentId || b.bed?.studentId
          })) || []
        }
      }
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred during checkout. Please try again.' 
    });
  }
};

// Helper function to update student's pending fees information
const updateStudentPendingFees = async (studentId) => {
  try {
    // Validate studentId
    if (!studentId) {
      console.error('updateStudentPendingFees: studentId is null or undefined');
      return;
    }

    // Get all pending fees for the student
    const pendingFees = await Fee.find({
      student: studentId,
      status: { $in: ['pending', 'overdue'] }
    }).sort('dueDate');
    
    // Calculate total pending amount
    const totalPendingAmount = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Get earliest and latest pending fee dates
    const hasPendingFees = pendingFees.length > 0;
    const pendingFeesFrom = hasPendingFees ? pendingFees[0].dueDate : null;
    const pendingFeesUntil = hasPendingFees ? pendingFees[pendingFees.length - 1].dueDate : null;
    
    // Update student record
    await Student.findByIdAndUpdate(studentId, {
      hasPendingFees,
      totalPendingAmount,
      pendingFeesFrom,
      pendingFeesUntil
    });
  } catch (error) {
    console.error('Error updating student pending fees:', error);
    // Don't throw error, just log it - this is a helper function
  }
};
