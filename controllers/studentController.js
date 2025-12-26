const Student = require('../models/Student');
const User = require('../models/User');
const Room = require('../models/Room');
const Fee = require('../models/Fee');

const PACKAGE_MONTHS = {
  '5months': 5,
  '4months': 4,
  '3months': 3,
  '2months': 2,
  '1month': 1
};

const SECURITY_DEPOSIT_AMOUNT = 10000;

const getRentPerPackage = (room, packageType) => {
  if (!room) return 0;
  const rentPerMonth =
    (room.rentPerMonth && room.rentPerMonth[packageType]) ||
    room.rent ||
    (room.rentFor5Months ? room.rentFor5Months / 5 : 0);
  return Number(rentPerMonth) || 0;
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin/Warden)
exports.getStudents = async (req, res) => {
  try {
    const { status, department, year } = req.query;
    let query = {};

    if (status) query.status = status;
    if (department) query.department = department;
    if (year) query.year = year;

    const students = await Student.find(query).populate('roomNo');

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('roomNo');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Admin/Warden)
exports.createStudent = async (req, res) => {
  try {
    // Validate required fields
    const { firstName, lastName, email, studentId, phone } = req.body;
    
    const missingFields = [];
    if (!firstName || (typeof firstName === 'string' && firstName.trim() === '')) {
      missingFields.push('firstName');
    }
    if (!lastName || (typeof lastName === 'string' && lastName.trim() === '')) {
      missingFields.push('lastName');
    }
    if (!email || (typeof email === 'string' && email.trim() === '')) {
      missingFields.push('email');
    }
    if (!studentId || (typeof studentId === 'string' && studentId.trim() === '')) {
      missingFields.push('studentId');
    }
    if (!phone || (typeof phone === 'string' && phone.trim() === '')) {
      missingFields.push('phone');
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}. Please fill all required fields.`
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format. Please enter a valid email address.'
      });
    }

    // Validate phone format (should be numeric and 10 digits minimum)
    const phoneRegex = /^[0-9]{10,}$/;
    if (!phoneRegex.test(phone.trim().replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please enter a valid phone number (minimum 10 digits).'
      });
    }

    // Check if email already exists
    const existingStudent = await Student.findOne({ email: email.trim().toLowerCase() });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists. Please use a different email address.'
      });
    }

    // Check if studentId already exists
    const existingStudentId = await Student.findOne({ studentId: studentId.trim() });
    if (existingStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID already exists. Please use a different student ID.'
      });
    }

    const student = await Student.create(req.body);

    // Create user account for student
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: req.body.email.trim().toLowerCase() });
      if (existingUser) {
        // If user exists but doesn't have studentId, update it
        if (!existingUser.studentId) {
          existingUser.studentId = student._id;
          await existingUser.save();
        }
      } else {
        // Create new user
        await User.create({
          email: req.body.email.trim().toLowerCase(),
          password: req.body.password || 'student123',
          role: 'student',
          studentId: student._id
        });
      }
    } catch (userError) {
      console.error('Error creating user account:', userError);
      // If user creation fails, still return student (user can be created later)
      // But log the error
      if (userError.code === 11000) {
        console.warn('User account already exists for this email, skipping user creation');
      }
    }

    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Create student error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please use a different ${field}.`
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while creating student. Please try again.' 
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin/Warden)
exports.updateStudent = async (req, res) => {
  try {
    console.log('🔄 Update Student Request:', {
      id: req.params.id,
      body: req.body
    });

    // Check if student exists first
    const existingStudent = await Student.findById(req.params.id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Prepare update data - clean and validate
    const updateData = { ...req.body };

    // Handle email - trim and lowercase
    if (updateData.email !== undefined) {
      if (updateData.email && typeof updateData.email === 'string') {
        updateData.email = updateData.email.trim().toLowerCase();
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid email format. Please enter a valid email address.'
          });
        }

        // Check if new email already exists (if email is being changed)
        if (updateData.email !== existingStudent.email) {
          const emailExists = await Student.findOne({ 
            email: updateData.email,
            _id: { $ne: req.params.id }
          });
          if (emailExists) {
            return res.status(400).json({
              success: false,
              message: 'Email already exists. Please use a different email address.'
            });
          }
        }
      }
    }

    // Handle studentId - trim
    if (updateData.studentId !== undefined && updateData.studentId) {
      updateData.studentId = updateData.studentId.trim();
      
      // Check if new studentId already exists (if studentId is being changed)
      if (updateData.studentId !== existingStudent.studentId) {
        const studentIdExists = await Student.findOne({ 
          studentId: updateData.studentId,
          _id: { $ne: req.params.id }
        });
        if (studentIdExists) {
          return res.status(400).json({
            success: false,
            message: 'Student ID already exists. Please use a different student ID.'
          });
        }
      }
    }

    // Handle phone - validate format if provided
    if (updateData.phone !== undefined && updateData.phone) {
      if (typeof updateData.phone === 'string') {
        const phoneRegex = /^[0-9]{10,}$/;
        const cleanPhone = updateData.phone.trim().replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid phone number. Please enter a valid phone number (minimum 10 digits).'
          });
        }
        updateData.phone = cleanPhone;
      }
    }

    // Clean string fields - trim whitespace
    const stringFields = ['firstName', 'middleName', 'lastName', 'religion', 'caste', 
                         'aadharNumber', 'institute', 'department', 'course',
                         'guardianName', 'guardianLocalName', 'guardianPhone', 
                         'guardianRelation', 'guardianEmail', 'motherMobileNumber', 
                         'guardianLocalArea'];
    
    stringFields.forEach(field => {
      if (updateData[field] !== undefined && typeof updateData[field] === 'string') {
        updateData[field] = updateData[field].trim();
        // Convert empty strings to null for optional fields (except required ones)
        if (updateData[field] === '' && !['firstName', 'lastName'].includes(field)) {
          updateData[field] = null;
        }
      }
    });

    // Handle address object
    if (updateData.address && typeof updateData.address === 'object') {
      Object.keys(updateData.address).forEach(key => {
        if (typeof updateData.address[key] === 'string') {
          updateData.address[key] = updateData.address[key].trim();
          if (updateData.address[key] === '') {
            updateData.address[key] = null;
          }
        }
      });
    }

    // Convert year and semester to numbers if provided
    if (updateData.year !== undefined) {
      updateData.year = Number(updateData.year) || 1;
    }
    if (updateData.semester !== undefined) {
      updateData.semester = Number(updateData.semester) || 1;
    }

    // Don't update password in update endpoint (should be separate endpoint)
    delete updateData.password;

    // If status is being set to 'inactive', automatically deallocate room
    if (updateData.status === 'inactive' && existingStudent.status !== 'inactive') {
      console.log('🔄 Marking student inactive - starting room deallocation process...');
      
      if (existingStudent.roomNo) {
        try {
          // Handle both populated and non-populated roomNo
          const roomId = existingStudent.roomNo._id || existingStudent.roomNo;
          const room = await Room.findById(roomId);
          
          if (!room) {
            console.warn(`⚠️ Room ${roomId} not found for student ${existingStudent._id}. Proceeding with status update.`);
          } else {
            console.log(`🔄 Deallocating room ${room.roomNo} for student ${existingStudent.studentId}...`);
            
            // Track initial state for logging
            const initialOccupied = room.occupied;
            const initialStudentsCount = room.students.length;
            const initialBedsCount = room.beds.filter(b => b.isOccupied).length;
            
            // Remove student from room's students array (robust filtering)
            const beforeStudentsCount = room.students.length;
            room.students = room.students.filter(
              studentId => studentId && studentId.toString() !== existingStudent._id.toString()
            );
            const afterStudentsCount = room.students.length;
            console.log(`   Students array: ${beforeStudentsCount} → ${afterStudentsCount}`);
            
            // Find and free ALL beds assigned to this student (handle multiple beds)
            const studentBeds = room.beds.filter(bed => 
              bed.studentId && bed.studentId.toString() === existingStudent._id.toString()
            );
            console.log(`   Found ${studentBeds.length} bed(s) to free`);
            
            studentBeds.forEach((bed, index) => {
              bed.isOccupied = false;
              bed.studentId = null;
              console.log(`   ✅ Freed bed: ${bed.bedLabel || `Bed ${index + 1}`}`);
            });
            
            // Update occupied count based on actual students array length (more accurate)
            const actualOccupied = room.students.length;
            room.occupied = Math.max(0, actualOccupied);
            console.log(`   Occupied count: ${initialOccupied} → ${room.occupied}`);
            
            // Update room status based on occupancy
            if (room.occupied === 0) {
              room.status = 'available';
              console.log(`   Room status: → available (empty)`);
            } else if (room.occupied < room.capacity) {
              // Room has space but not empty
              if (room.status === 'occupied') {
                room.status = 'available';
                console.log(`   Room status: occupied → available (has space)`);
              }
            }
            
            // CRITICAL: Mark nested arrays as modified to ensure Mongoose saves changes
            room.markModified('beds');
            room.markModified('students');
            
            // Save room with error handling
            await room.save();
            
            console.log(`✅ Room ${room.roomNo} successfully deallocated:`);
            console.log(`   - Students: ${initialStudentsCount} → ${room.students.length}`);
            console.log(`   - Beds freed: ${studentBeds.length}`);
            console.log(`   - Occupied: ${initialOccupied} → ${room.occupied}/${room.capacity}`);
            console.log(`   - Status: ${room.status}`);
          }
        } catch (roomError) {
          // Log error but don't fail the entire operation
          console.error('❌ Error during room deallocation:', roomError);
          console.error('   Stack:', roomError.stack);
          // Continue with status update even if room deallocation fails
          // This ensures student status is updated even if room data is inconsistent
        }
        
        // Always set roomNo to null in update data (even if room save failed)
        updateData.roomNo = null;
        updateData.allocationDate = null;
        console.log('   Student roomNo set to null');
      } else {
        console.log('   No room allocated - skipping deallocation');
      }
      
      // Clear pending fees since student no longer has a room
      // Fees remain in history for accounting, but pending status is cleared
      updateData.hasPendingFees = false;
      updateData.totalPendingAmount = 0;
      updateData.pendingFeesFrom = null;
      updateData.pendingFeesUntil = null;
      console.log('   Pending fees cleared (student has no room)');
      
      // Check if student is leaving early (before admissionUpToDate)
      // If early checkout: Youstel and Mess fees are NON-REFUNDABLE, only Deposit is refundable
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (existingStudent.admissionUpToDate) {
        const admissionUpToDate = new Date(existingStudent.admissionUpToDate);
        admissionUpToDate.setHours(23, 59, 59, 999);
        
        const isEarlyCheckout = today < admissionUpToDate;
        
        if (isEarlyCheckout) {
          console.log('⚠️ Early Checkout Detected!');
          console.log(`   Today: ${today.toISOString().split('T')[0]}`);
          console.log(`   Admission Up To: ${admissionUpToDate.toISOString().split('T')[0]}`);
          
          // Get active fees for this student
          const Fee = require('../models/Fee');
          const LedgerEntry = require('../models/LedgerEntry');
          
          const activeFees = await Fee.find({
            student: existingStudent._id,
            $or: [
              { source: 'checklist_auto' },
              { source: { $exists: false } },
              { source: null }
            ],
            status: { $in: ['pending', 'partial', 'paid'] }
          }).sort({ createdAt: -1 });
          
          if (activeFees.length > 0) {
            // Get the most recent active fee (current package)
            const currentFee = activeFees[0];
            
            console.log(`   Current Fee Package: ${currentFee.packageType || 'N/A'}`);
            console.log(`   Rent Amount: ₹${currentFee.rentAmount || 0}`);
            console.log(`   Mess Amount: ₹${currentFee.messAmount || 0}`);
            console.log(`   Deposit Amount: ₹${currentFee.depositAmount || 0}`);
            
            // Calculate non-refundable amounts (Youstel + Mess)
            // These are FULLY non-refundable in early checkout scenario
            const youstelNonRefundable = currentFee.rentAmount || 0;
            const messNonRefundable = currentFee.messAmount || 0;
            
            if (youstelNonRefundable > 0 || messNonRefundable > 0) {
              console.log(`   💰 Creating Non-Refundable Fee Entries:`);
              console.log(`      Youstel (Hostel): ₹${youstelNonRefundable} - NON-REFUNDABLE`);
              console.log(`      Mess: ₹${messNonRefundable} - NON-REFUNDABLE`);
              console.log(`      Deposit: ₹${currentFee.depositAmount || 0} - REFUNDABLE`);
              
              // Create non-refundable ledger entries for Youstel (Hostel)
              if (youstelNonRefundable > 0) {
                const youstelNonRefundableEntry = new LedgerEntry({
                  student: existingStudent._id,
                  date: today,
                  type: 'Other',
                  account: 'Youstel',
                  amount: youstelNonRefundable,
                  description: `Early Checkout - Hostel Fees (Non-Refundable) - Package: ${currentFee.packageType || 'N/A'}`,
                  voucher: `GV-NR-Youstel-${today.toISOString().split('T')[0]}`,
                  paymentMethod: 'cash', // Non-refundable entries are marked as cash
                  createdBy: req.user?._id || null
                });
                await youstelNonRefundableEntry.save();
                console.log(`   ✅ Created Youstel Non-Refundable Entry: ${youstelNonRefundableEntry.voucher}`);
              }
              
              // Create non-refundable ledger entries for Mess
              if (messNonRefundable > 0) {
                const messNonRefundableEntry = new LedgerEntry({
                  student: existingStudent._id,
                  date: today,
                  type: 'Other',
                  account: 'HUF',
                  amount: messNonRefundable,
                  description: `Early Checkout - Mess Fees (Non-Refundable) - Package: ${currentFee.packageType || 'N/A'}`,
                  voucher: `GV-NR-Mess-${today.toISOString().split('T')[0]}`,
                  paymentMethod: 'cash', // Non-refundable entries are marked as cash
                  createdBy: req.user?._id || null
                });
                await messNonRefundableEntry.save();
                console.log(`   ✅ Created Mess Non-Refundable Entry: ${messNonRefundableEntry.voucher}`);
              }
              
              console.log(`   ✅ Non-Refundable entries created successfully`);
              console.log(`   💡 Only Deposit (₹${currentFee.depositAmount || 0}) is refundable`);
            } else {
              console.log(`   ℹ️ No fees to mark as non-refundable (amounts are 0)`);
            }
          } else {
            console.log(`   ℹ️ No active fees found for early checkout processing`);
          }
        } else {
          console.log(`   ✅ Normal checkout (on or after admissionUpToDate)`);
          console.log(`   Today: ${today.toISOString().split('T')[0]}`);
          console.log(`   Admission Up To: ${admissionUpToDate.toISOString().split('T')[0]}`);
        }
      } else {
        console.log(`   ℹ️ No admissionUpToDate set - skipping early checkout check`);
      }
      
      // Note: Fee records and ledger history are preserved for accounting
      // Only pending status is cleared since student no longer has active room
      console.log('✅ Room deallocation process completed');
      console.log('📝 Note: Fee records and ledger history are preserved for accounting purposes');
    }

    console.log('📤 Cleaned Update Data:', JSON.stringify(updateData, null, 2));

    // Update student using findOneAndUpdate for better error handling
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).populate('roomNo');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found after update'
      });
    }

    console.log('✅ Student updated successfully:', student._id);

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('❌ Error updating student:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation error: ${messages.join(', ')}`
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please use a different ${field}.`
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while updating student. Please try again.' 
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
exports.deleteStudent = async (req, res) => {
  try {
    // First, get the student to check if they have a room allocated
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // If student has a room allocated, update the room
    if (student.roomNo) {
      const room = await Room.findById(student.roomNo);

      if (room) {
        // Remove student from room's students array
        room.students = room.students.filter(
          studentId => studentId.toString() !== student._id.toString()
        );

        // Clear the bed allocation for this student
        if (room.beds && room.beds.length > 0) {
          room.beds.forEach(bed => {
            if (bed.studentId && bed.studentId.toString() === student._id.toString()) {
              bed.isOccupied = false;
              bed.studentId = null;
            }
          });
        }

        // Recalculate occupied count based on actual occupied beds
        const occupiedBeds = room.beds.filter(b => b.isOccupied === true).length;
        room.occupied = occupiedBeds;

        // Update room status based on occupancy
        if (room.occupied >= room.capacity) {
          room.status = 'occupied';
        } else if (room.occupied === 0) {
          room.status = 'available';
        } else {
          room.status = room.status === 'maintenance' ? 'maintenance' : 'available';
        }

        // Mark beds array as modified
        room.markModified('beds');
        room.markModified('students');
        
        // Save the room
        await room.save();
        
        console.log(`✅ Room ${room.roomNo} updated after student deletion. Occupied: ${room.occupied}/${room.capacity}`);
      }
    }

    // Now delete the student
    await Student.findByIdAndDelete(req.params.id);

    // Also delete user account
    await User.findOneAndDelete({ studentId: student._id });

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully. Room allocation has been cleared if applicable.',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student ledger (complete account statement)
// @route   GET /api/students/:id/ledger
// @access  Private
exports.getStudentLedger = async (req, res) => {
  try {
    const Fee = require('../models/Fee');
    const student = await Student.findById(req.params.id).populate('roomNo');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all fees for the student
    // Include checklist_auto fees (new format) AND fees without source (old format for backward compatibility)
    const fees = await Fee.find({ 
      student: req.params.id,
      $or: [
        { source: 'checklist_auto' },
        { source: { $exists: false } }, // Old fees without source field
        { source: null } // Old fees with null source
      ]
    }).sort('dueDate');
    
    console.log(`\n📊 ===== LEDGER REQUEST FOR STUDENT ${req.params.id} =====`);
    console.log(`📊 Found ${fees.length} fees for this student`);
    if (fees.length > 0) {
      fees.forEach((fee, idx) => {
        console.log(`   Fee ${idx + 1}: ID=${fee._id}, Source=${fee.source || 'none'}, Status=${fee.status}, Package=${fee.packageType}, Created=${fee.createdAt}, DueDate=${fee.dueDate}`);
      });
    } else {
      console.log(`   ⚠️  NO FEES FOUND - Sessions will be created from student data only`);
    }
    
    // Debug: Log student and fee data
    console.log(`\n📊 ===== LEDGER REQUEST FOR STUDENT ${req.params.id} =====`);
    console.log(`📅 Student enrollmentDate: ${student.enrollmentDate ? new Date(student.enrollmentDate).toISOString().split('T')[0] : 'NOT SET'}`);
    console.log(`📅 Student admissionUpToDate: ${student.admissionUpToDate ? new Date(student.admissionUpToDate).toISOString().split('T')[0] : 'NOT SET'}`);
    console.log(`📅 Student admissionMonths: ${student.admissionMonths || 'NOT SET'}`);
    console.log(`📊 Found ${fees.length} fees`);
    fees.forEach((fee, idx) => {
      console.log(`   Fee ${idx + 1}: ID=${fee._id}, Source=${fee.source || 'none'}, Status=${fee.status}, Package=${fee.packageType}, Created=${fee.createdAt}, DueDate=${fee.dueDate}`);
    });

    // Create complete ledger with payment entries
    const completeLedger = [];
    fees.forEach(fee => {
      // Add fee entry with breakdown (but skip if it's already a refund entry with status 'refunded')
      if (!(fee.status === 'refunded' && fee.feeType === 'other')) {
        const semesterInfo = fee.semester ? ` - Semester ${fee.semester}` : '';
        const yearInfo = fee.year ? `, Year ${fee.year}` : '';
        
        // For fees with package, expand into month-wise entries
        // Include both checklist_auto (new) and old fees without source (backward compatibility)
        const isChecklistAuto = fee.source === 'checklist_auto' || !fee.source;
        if (fee.packageType && isChecklistAuto && fee.rentAmount > 0 && fee.messAmount > 0) {
          const months = PACKAGE_MONTHS[fee.packageType] || 1;
          const rentPerMonth = (fee.rentAmount || 0) / months;
          const messPerMonth = (fee.messAmount || 0) / months;
          const enrollmentDate = student.enrollmentDate || fee.dueDate;
          
          // Create month-wise entries for display using 30-day cycle
          for (let monthIndex = 0; monthIndex < months; monthIndex++) {
            // Calculate month end date using fixed 30-day cycle
            const monthStartDate = new Date(enrollmentDate);
            monthStartDate.setDate(enrollmentDate.getDate() + (monthIndex * 30));
            const monthEndDate = new Date(monthStartDate);
            monthEndDate.setDate(monthStartDate.getDate() + 29); // 30-day month (0-29 = 30 days)
            const monthDueDate = fee.dueDate > monthEndDate ? fee.dueDate : monthEndDate;
            
            // Hostel (Youstel) entry for this month
            // Calculate paid amount: youstelAmount includes rent + deposit, so subtract deposit to get rent paid
            // Then divide by months to get per-month rent paid
            let hostelPaid = 0;
            if (fee.status === 'paid' || fee.status === 'partial') {
              const depositAmount = fee.depositAmount || 0;
              const rentPaid = Math.max(0, (fee.youstelAmount || 0) - depositAmount);
              hostelPaid = rentPaid / months; // Divide total rent paid by months
            }
            const hostelDue = Math.max(0, rentPerMonth - hostelPaid);
            
            completeLedger.push({
              _id: fee._id + '_hostel_month_' + monthIndex,
              date: monthDueDate,
              type: 'Fee',
              component: 'Hostel (Youstel)',
              description: `Hostel (Youstel) - Month ${monthIndex + 1}/${months} - ${fee.packageType.replace('months', ' Months').replace('month', ' Month')}`,
              debit: rentPerMonth,
              credit: 0,
              status: fee.status,
              paidDate: fee.paidDate || null,
              transactionId: fee.transactionId || null,
              paymentMethod: fee.paymentMethod || null,
              semester: fee.semester || null,
              year: fee.year || null,
              feeId: fee._id,
              rentAmount: rentPerMonth,
              messAmount: 0,
              depositAmount: 0,
              packageType: fee.packageType,
              packageAmount: rentPerMonth,
              paidAmount: hostelPaid,
              balanceDue: Math.max(0, hostelDue),
              voucher: fee.youstelVoucher || null
            });
            
            // Mess (HUF) entry for this month
            const messPaid = fee.status === 'paid' || fee.status === 'partial' 
              ? ((fee.hufAmount || 0) / months) 
              : 0;
            const messDue = messPerMonth - messPaid;
            
            completeLedger.push({
              _id: fee._id + '_mess_month_' + monthIndex,
              date: monthDueDate,
              type: 'Fee',
              component: 'Mess (HUF)',
              description: `Mess (HUF) - Month ${monthIndex + 1}/${months} - ${fee.packageType.replace('months', ' Months').replace('month', ' Month')}`,
              debit: messPerMonth,
              credit: 0,
              status: fee.status,
              paidDate: fee.paidDate || null,
              transactionId: fee.transactionId || null,
              paymentMethod: fee.paymentMethod || null,
              semester: fee.semester || null,
              year: fee.year || null,
              feeId: fee._id,
              rentAmount: 0,
              messAmount: messPerMonth,
              depositAmount: 0,
              packageType: fee.packageType,
              packageAmount: messPerMonth,
              paidAmount: messPaid,
              balanceDue: Math.max(0, messDue),
              voucher: fee.hufVoucher || null
            });
          }
          
          // Deposit entry (one-time, not month-wise)
          if (fee.depositAmount > 0) {
            // Calculate deposit paid: youstelAmount - rentAmount (deposit is the remaining part of youstelAmount after rent)
            // If fully paid, depositPaid = depositAmount; if partial, calculate from youstelAmount
            const depositPaid = fee.status === 'paid' || fee.status === 'partial' 
              ? Math.min(fee.depositAmount, Math.max(0, (fee.youstelAmount || 0) - (fee.rentAmount || 0))) // Deposit is part of youstelAmount, but cap at depositAmount
              : 0;
            const depositDue = fee.depositAmount - depositPaid;
            
            completeLedger.push({
              _id: fee._id + '_deposit',
              date: fee.dueDate,
              type: 'Fee',
              component: 'Deposit (Youstel)',
              description: `Deposit (Youstel) - ${fee.packageType.replace('months', ' Months').replace('month', ' Month')}`,
              debit: fee.depositAmount,
              credit: 0,
              status: fee.status,
              paidDate: fee.paidDate || null,
              transactionId: fee.transactionId || null,
              paymentMethod: fee.paymentMethod || null,
              semester: fee.semester || null,
              year: fee.year || null,
              feeId: fee._id,
              rentAmount: 0,
              messAmount: 0,
              depositAmount: fee.depositAmount,
              packageType: fee.packageType,
              packageAmount: fee.depositAmount,
              paidAmount: depositPaid,
              balanceDue: Math.max(0, depositDue),
              voucher: fee.youstelVoucher || null
            });
          }
        } else {
          // Regular fee entry (non-package or old format)
          let description = `${fee.feeType.charAt(0).toUpperCase() + fee.feeType.slice(1)} Fee${semesterInfo}${yearInfo}`;
          
          // Add breakdown for hostel fees
          if (fee.feeType === 'hostel') {
            const rentAmount = fee.rentAmount || 0;
            const messAmount = fee.messAmount || 0;
            const depositAmount = fee.depositAmount || 0;
            if (rentAmount > 0 || messAmount > 0 || depositAmount > 0) {
              description += ` (Rent: ₹${rentAmount.toLocaleString()}, Mess: ₹${messAmount.toLocaleString()}, Deposit: ₹${depositAmount.toLocaleString()})`;
            }
          }
          
          // Add component info for ledger display
          let component = 'Other';
          if (fee.feeType === 'hostel') {
            component = 'Hostel (Youstel)';
          } else if (fee.feeType === 'mess') {
            component = 'Mess (HUF)';
          } else if (fee.feeType === 'security') {
            component = 'Deposit (Youstel)';
          }
          
          completeLedger.push({
            _id: fee._id + '_fee',
            date: fee.dueDate,
            type: 'Fee',
            description: description,
            component: component,
            debit: fee.amount,
            credit: 0,
            status: fee.status,
            paidDate: fee.paidDate || null,
            transactionId: fee.transactionId || null,
            paymentMethod: fee.paymentMethod || null,
            semester: fee.semester || null,
            year: fee.year || null,
            feeId: fee._id,
            rentAmount: fee.rentAmount || 0,
            messAmount: fee.messAmount || 0,
            depositAmount: fee.depositAmount || 0,
            packageType: fee.packageType || null,
            packageAmount: fee.amount,
            paidAmount: (fee.status === 'paid' || fee.status === 'partial') ? (fee.paidAmount || fee.amount) : 0,
            balanceDue: fee.status === 'paid' ? 0 : (fee.status === 'partial' ? (fee.remainingBalance || 0) : fee.amount),
            voucher: fee.feeType === 'hostel' || fee.feeType === 'security' ? fee.youstelVoucher : fee.hufVoucher
          });
        }
      }

      // Add split payment entries if payment exists
      if ((fee.status === 'paid' || fee.status === 'partial') && fee.paidDate) {
        const paidAmount = fee.paidAmount || fee.amount;
        
        // Add Youstel payment entry if exists
        if (fee.youstelAmount > 0) {
          const component = fee.feeType === 'security' ? 'Deposit (Youstel)' : 'Hostel (Youstel)';
          completeLedger.push({
            _id: fee._id + '_payment_youstel',
            date: fee.paidDate,
            type: 'Payment',
            component: component,
            description: `Payment to Youstel - GV: ${fee.youstelVoucher || 'N/A'} | ${fee.paymentMethod || 'N/A'}`,
            debit: 0,
            credit: fee.youstelAmount,
            status: fee.status,
            transactionId: fee.transactionId,
            paymentMethod: fee.paymentMethod,
            account: 'Youstel',
            voucher: fee.youstelVoucher,
            feeId: fee._id,
            packageAmount: fee.amount,
            paidAmount: fee.youstelAmount,
            balanceDue: fee.status === 'paid' ? 0 : (fee.status === 'partial' ? (fee.remainingBalance || 0) : fee.amount - fee.youstelAmount)
          });
        }
        
        // Add HUF payment entry if exists
        if (fee.hufAmount > 0) {
          completeLedger.push({
            _id: fee._id + '_payment_huf',
            date: fee.paidDate,
            type: 'Payment',
            component: 'Mess (HUF)',
            description: `Payment to HUF - GV: ${fee.hufVoucher || 'N/A'} | ${fee.paymentMethod || 'N/A'}`,
            debit: 0,
            credit: fee.hufAmount,
            status: fee.status,
            transactionId: fee.transactionId,
            paymentMethod: fee.paymentMethod,
            account: 'HUF',
            voucher: fee.hufVoucher,
            feeId: fee._id,
            packageAmount: fee.amount,
            paidAmount: fee.hufAmount,
            balanceDue: fee.status === 'paid' ? 0 : (fee.status === 'partial' ? (fee.remainingBalance || 0) : fee.amount - fee.hufAmount)
          });
        }
        
        // Add remaining balance entry if partial payment
        if (fee.status === 'partial' && fee.remainingBalance > 0) {
          completeLedger.push({
            _id: fee._id + '_remaining',
            date: fee.paidDate,
            type: 'Balance',
            description: `Remaining Balance (Due: ₹${fee.remainingBalance.toLocaleString()})`,
            debit: 0,
            credit: 0,
            status: 'pending',
            remainingBalance: fee.remainingBalance,
            feeId: fee._id
          });
        }
      }
      
      // Add refund entry if refunded - mark as Other not Refund since hostel policy doesn't allow full refunds
      if (fee.status === 'refunded' && fee.paidDate) {
        completeLedger.push({
          _id: fee._id + '_refund',
          date: fee.paidDate,
          type: 'Other',
          description: fee.remarks || 'Refund processed',
          debit: 0,
          credit: fee.amount,
          status: 'refunded',
          transactionId: fee.transactionId || null,
          paymentMethod: fee.paymentMethod || null,
          feeId: fee._id
        });
      }
    });

    // Sort by date
    completeLedger.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let balance = 0;
    completeLedger.forEach(entry => {
      balance += entry.debit - entry.credit;
      entry.balance = balance;
    });

    // Calculate stay duration
    const admissionDate = new Date(student.enrollmentDate);
    const today = new Date();
    const stayDurationMs = today - admissionDate;
    const stayDurationDays = Math.floor(stayDurationMs / (1000 * 60 * 60 * 24));
    const stayDurationMonths = Math.floor(stayDurationDays / 30);

    // Calculate deposit (security deposit fees)
    const securityDeposits = fees.filter(f => f.feeType === 'security');
    const totalDeposit = securityDeposits.reduce((sum, fee) => sum + fee.amount, 0);
    const depositPaid = securityDeposits.filter(f => f.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
    
    // Calculate refundable amount (paid security deposits)
    const refundableAmount = depositPaid;

    // Calculate summary with split payments
    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Calculate total paid (including partial payments)
    const totalPaid = fees.reduce((sum, fee) => {
      if (fee.status === 'paid') {
        return sum + fee.amount;
      } else if (fee.status === 'partial' && fee.paidAmount) {
        return sum + fee.paidAmount;
      }
      return sum;
    }, 0);
    
    // Calculate total pending (including remaining balance from partial payments)
    const totalPending = fees.reduce((sum, fee) => {
      if (fee.status === 'pending' || fee.status === 'overdue') {
        return sum + fee.amount;
      } else if (fee.status === 'partial' && fee.remainingBalance) {
        return sum + fee.remainingBalance;
      }
      return sum;
    }, 0);
    
    // Calculate total Youstel and HUF amounts
    const totalYoustel = fees.reduce((sum, fee) => sum + (fee.youstelAmount || 0), 0);
    const totalHUF = fees.reduce((sum, fee) => sum + (fee.hufAmount || 0), 0);
    
    // Total due considering refundable deposit
    const totalDue = balance - refundableAmount;

    const summary = {
      admissionDate: student.enrollmentDate,
      stayDurationDays,
      stayDurationMonths,
      totalFees,
      totalPaid,
      totalPending,
      totalDeposit,
      depositPaid,
      refundableAmount,
      currentBalance: balance,
      totalDue,
      totalTransactions: completeLedger.length,
      paymentSplit: {
        totalYoustel: totalYoustel,
        totalHUF: totalHUF
      }
    };

    // Include manual ledger entries (office)
    const LedgerEntry = require('../models/LedgerEntry');
    const manualEntries = await LedgerEntry.find({ student: req.params.id }).sort('date');
    console.log('📝 Manual ledger entries found:', manualEntries.length);
    manualEntries.forEach((entry, idx) => {
      console.log(`   ${idx + 1}. ${entry.date.toISOString().split('T')[0]} | ${entry.account} | ₹${entry.amount} | ${entry.voucher || 'No voucher'}`);
      completeLedger.push({
        _id: entry._id.toString(),
        date: entry.date,
        type: entry.type || 'Payment',
        description: entry.description || (entry.account === 'Youstel' ? 'GV-Hostel' : 'GV-Mess'),
        debit: 0,
        credit: entry.amount,
        status: 'manual',
        transactionId: null,
        paymentMethod: entry.paymentMethod || 'online',
        account: entry.account,
        voucher: entry.voucher || null,
        feeId: null
      });
    });
    // Resort including manual entries and recalc balance
    completeLedger.sort((a, b) => new Date(a.date) - new Date(b.date));
    let newBalance = 0;
    completeLedger.forEach(entry => {
      newBalance += entry.debit - entry.credit;
      entry.balance = newBalance;
    });

    // Recompute summary fields impacted by manual entries
    const manualYoustel = manualEntries.filter(e => e.account === 'Youstel').reduce((s, e) => s + (e.amount || 0), 0);
    const manualHUF = manualEntries.filter(e => e.account === 'HUF').reduce((s, e) => s + (e.amount || 0), 0);
    const updatedSummary = {
      ...summary,
      currentBalance: newBalance,
      totalDue: newBalance - refundableAmount,
      totalTransactions: completeLedger.length,
      paymentSplit: {
        totalYoustel: (summary.paymentSplit?.totalYoustel || totalYoustel) + manualYoustel,
        totalHUF: (summary.paymentSplit?.totalHUF || totalHUF) + manualHUF
      }
    };

    // Get bed information if room is allocated
    let bedLabel = null;
    if (student.roomNo && student.roomNo.beds) {
      const studentBed = student.roomNo.beds.find(bed => 
        bed.studentId && bed.studentId.toString() === student._id.toString()
      );
      if (studentBed) {
        bedLabel = studentBed.bedLabel;
      }
    }

    // Group fees into sessions for session-wise display
    console.log(`\n📋 ===== CREATING SESSIONS FROM FEES =====`);
    console.log(`📋 Total fees found: ${fees.length}`);
    fees.forEach((fee, idx) => {
      console.log(`   Fee ${idx + 1}: ID=${fee._id}, Package=${fee.packageType}, Status=${fee.status}, Room=${fee.roomNumber || 'N/A'}, Bed=${fee.bedLabel || 'N/A'}, Created=${fee.createdAt.toISOString().split('T')[0]}`);
    });
    
    const sessionMap = {};
    fees.forEach(fee => {
      const sessionKey = fee._id.toString();
      if (!sessionMap[sessionKey]) {
        console.log(`📋 Creating session for Fee ID: ${sessionKey}, Room: ${fee.roomNumber || 'N/A'}, Bed: ${fee.bedLabel || 'N/A'}`);
        // Calculate package end date (Up To Date) - Use enrollmentDate, NOT fee.createdAt
        const packageMonths = parseInt(fee.packageType?.replace('months', '')) || 0;
        
        // Priority 1: Use student.admissionUpToDate if available (most accurate - set during fee creation)
        let upToDate = null;
        if (student.admissionUpToDate) {
          upToDate = new Date(student.admissionUpToDate);
          console.log(`📅 Session ${sessionKey}: Using student.admissionUpToDate = ${upToDate.toISOString().split('T')[0]}`);
        } else {
          // Priority 2: Calculate from enrollmentDate + packageMonths
          // IMPORTANT: Use enrollmentDate (actual admission date), NOT fee.createdAt (when fee was created)
          let admissionDate = null;
          if (student.enrollmentDate) {
            admissionDate = new Date(student.enrollmentDate);
          } else if (fee.dueDate) {
            // Fallback to fee.dueDate if enrollmentDate not set
            admissionDate = new Date(fee.dueDate);
          } else {
            // Last resort: use fee.createdAt (but this is less accurate)
            admissionDate = new Date(fee.createdAt);
          }
          
          // Calculate upToDate: enrollmentDate + packageMonths
          // Use robust date calculator for ledger display
          const { calculateAdmissionUpToDate, getAdmissionDate } = require('../utils/dateCalculator');
          
          // Get admission date with proper fallback
          const ledgerAdmissionDate = getAdmissionDate(student, fee);
          
          // Use student.admissionMonths if available, otherwise use packageMonths from fee
          const monthsToAdd = student.admissionMonths || packageMonths;
          
          // Calculate upToDate using robust calculator
          upToDate = calculateAdmissionUpToDate(ledgerAdmissionDate, monthsToAdd);
          
          if (upToDate) {
            const startYear = ledgerAdmissionDate.getFullYear();
            const startMonth = ledgerAdmissionDate.getMonth();
            const startDay = ledgerAdmissionDate.getDate();
            const targetYear = upToDate.getFullYear();
            const targetMonth = upToDate.getMonth();
            const targetDay = upToDate.getDate();
            
            console.log(`\n📅 ===== SESSION ${sessionKey} - upToDate CALCULATION =====`);
            console.log(`   Fee ID: ${fee._id}`);
            console.log(`   Fee Package: ${fee.packageType} (${packageMonths} months)`);
            console.log(`   Admission Date: ${ledgerAdmissionDate.toISOString().split('T')[0]} (${startDay}/${startMonth + 1}/${startYear})`);
            console.log(`   Package Months: ${monthsToAdd}`);
            console.log(`   ✅ FINAL upToDate: ${upToDate.toISOString().split('T')[0]} (${targetDay}/${targetMonth + 1}/${targetYear})`);
            console.log(`   ✅ Handles: 31/30/28/29 day months automatically`);
            console.log(`📅 ===== END SESSION CALCULATION =====\n`);
          } else {
            console.log(`⚠️ Failed to calculate upToDate for session ${sessionKey}`);
          }
        }
        
        // Calculate amounts - if not in fee, calculate from youstelAmount and hufAmount
        let rentAmount = fee.rentAmount || 0;
        let messAmount = fee.messAmount || 0;
        let depositAmount = fee.depositAmount || 0;
        
        // If amounts are 0, try to calculate from payment splits
        if (rentAmount === 0 && messAmount === 0 && depositAmount === 0) {
          // Try to calculate from youstelAmount and hufAmount
          const youstelTotal = fee.youstelAmount || 0;
          const hufTotal = fee.hufAmount || 0;
          depositAmount = fee.depositAmount || 0;
          rentAmount = Math.max(0, youstelTotal - depositAmount);
          messAmount = hufTotal;
          console.log(`📊 Calculated amounts for fee ${fee._id}: Rent=${rentAmount}, Mess=${messAmount}, Deposit=${depositAmount} from youstel=${youstelTotal}, huf=${hufTotal}`);
        }
        
        // If still 0, try to calculate from fee amount and package type
        if (rentAmount === 0 && messAmount === 0 && fee.amount > 0 && fee.packageType) {
          // Estimate: typically 70% hostel, 30% mess (adjust as needed)
          const estimatedRent = Math.round(fee.amount * 0.7);
          const estimatedMess = fee.amount - estimatedRent;
          rentAmount = estimatedRent;
          messAmount = estimatedMess;
          console.log(`📊 Estimated amounts for fee ${fee._id}: Rent=${rentAmount}, Mess=${messAmount} from total=${fee.amount}`);
        }
        
        sessionMap[sessionKey] = {
          sessionId: sessionKey,
          packageType: fee.packageType,
          dueDate: fee.dueDate,
          createdAt: fee.createdAt,
          upToDate: upToDate, // Package end date
          packageMonths: packageMonths,
          rentAmount: rentAmount,
          messAmount: messAmount,
          depositAmount: depositAmount,
          totalAmount: fee.amount || (rentAmount + messAmount + depositAmount),
          status: fee.status,
          // Room details from fee record (preserved history) - fallback to current student room if not in fee
          roomNumber: fee.roomNumber || student.roomNo?.roomNo || null,
          bedLabel: fee.bedLabel || (() => {
            // Try to find bed from student's current room
            if (student.roomNo && student.roomNo.beds) {
              const studentBed = student.roomNo.beds.find(bed => 
                bed.studentId && bed.studentId.toString() === student._id.toString()
              );
              return studentBed?.bedLabel || null;
            }
            return null;
          })(),
          roomType: fee.roomType || student.roomNo?.type || null,
          payments: [],
          isRoomShifted: false,
          roomShiftHistory: []
        };
        console.log(`   ✅ Session created: ${sessionKey} - Room: ${sessionMap[sessionKey].roomNumber || 'N/A'}, Bed: ${sessionMap[sessionKey].bedLabel || 'N/A'}`);
      }
    });
    
    console.log(`📋 ===== SESSIONS CREATED FROM FEES =====`);
    console.log(`📋 Total sessions from fees: ${Object.keys(sessionMap).length}`);
    console.log(`📋 Student Status: ${student.status}`);
    console.log(`📋 Student has fees: ${fees.length > 0}`);
    Object.values(sessionMap).forEach((s, idx) => {
      console.log(`   Session ${idx + 1}: ${s.sessionId} - ${s.packageType} - Room: ${s.roomNumber || 'N/A'} - Bed: ${s.bedLabel || 'N/A'} - Status: ${s.status}`);
    });
    console.log(`📋 ============================\n`);
    
    // CRITICAL: If no sessions created from fees, ALWAYS create a default session from student data
    // This ensures inactive students (who might have no fees) still have sessions to display
    if (Object.keys(sessionMap).length === 0 && student) {
      console.log('⚠️ No fees found, creating default session from student data');
      console.log(`   Student Status: ${student.status}`);
      console.log(`   Student has room: ${!!student.roomNo}`);
      
      // Try to determine package type from student data
      let packageType = '1month';
      let packageMonths = 1;
      let totalAmount = 0;
      let rentAmount = 0;
      let messAmount = 0;
      let depositAmount = 0;
      
      // Try to get package info from student fields
      if (student.admissionMonths) {
        packageMonths = student.admissionMonths;
        packageType = `${packageMonths}month${packageMonths > 1 ? 's' : ''}`;
      }
      
      // For inactive students, try to get room info from most recent fee (if exists)
      // This preserves room history even after room deallocation
      let defaultRoomNumber = null;
      let defaultBedLabel = null;
      let defaultRoomType = null;
      
      if (student.roomNo) {
        // Student still has room allocated
        defaultRoomNumber = student.roomNo.roomNo;
        defaultRoomType = student.roomNo.type;
        if (student.roomNo.beds) {
          const studentBed = student.roomNo.beds.find(bed => 
            bed.studentId && bed.studentId.toString() === student._id.toString()
          );
          defaultBedLabel = studentBed?.bedLabel || null;
        }
      } else if (fees.length > 0) {
        // Student has no room but has fees - use room from most recent fee (preserve history)
        const mostRecentFee = fees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        defaultRoomNumber = mostRecentFee.roomNumber || null;
        defaultBedLabel = mostRecentFee.bedLabel || null;
        defaultRoomType = mostRecentFee.roomType || null;
        console.log(`   Using room from most recent fee: Room ${defaultRoomNumber}, Bed ${defaultBedLabel}`);
      }
      
      // Create a default session
      const sessionId = `default-${student._id}`;
      const admissionDate = student.enrollmentDate ? new Date(student.enrollmentDate) : new Date();
      const upToDate = student.admissionUpToDate ? new Date(student.admissionUpToDate) : new Date();
      
      sessionMap[sessionId] = {
        sessionId: sessionId,
        packageType: packageType,
        dueDate: upToDate,
        createdAt: admissionDate,
        upToDate: upToDate,
        packageMonths: packageMonths,
        rentAmount: rentAmount,
        messAmount: messAmount,
        depositAmount: depositAmount,
        totalAmount: totalAmount,
        status: student.status || 'active',
        roomNumber: defaultRoomNumber,
        bedLabel: defaultBedLabel,
        roomType: defaultRoomType,
        payments: [],
        isRoomShifted: false,
        roomShiftHistory: []
      };
      
      console.log('✅ Created default session from student data');
      console.log(`   Session ID: ${sessionId}`);
      console.log(`   Room: ${defaultRoomNumber || 'N/A'}, Bed: ${defaultBedLabel || 'N/A'}, Type: ${defaultRoomType || 'N/A'}`);
      console.log(`   Status: ${student.status || 'active'}`);
    }
    
    // CRITICAL: Ensure at least ONE session exists for ALL students (even inactive with no fees)
    // This prevents empty ledger display
    if (Object.keys(sessionMap).length === 0) {
      console.log('⚠️⚠️⚠️ CRITICAL: sessionMap is still empty after default session creation!');
      console.log('   Creating emergency fallback session...');
      const emergencySessionId = `emergency-${student._id}-${Date.now()}`;
      sessionMap[emergencySessionId] = {
        sessionId: emergencySessionId,
        packageType: 'N/A',
        dueDate: new Date(),
        createdAt: student.enrollmentDate ? new Date(student.enrollmentDate) : new Date(),
        upToDate: student.admissionUpToDate ? new Date(student.admissionUpToDate) : new Date(),
        packageMonths: 0,
        rentAmount: 0,
        messAmount: 0,
        depositAmount: 0,
        totalAmount: 0,
        status: student.status || 'inactive',
        roomNumber: null,
        bedLabel: null,
        roomType: null,
        payments: [],
        isRoomShifted: false,
        roomShiftHistory: []
      };
      console.log('✅ Created emergency fallback session');
    }
    // Create separate sessions for each room based on room shifts
    const roomShiftEntries = manualEntries.filter(entry => 
      entry.description && entry.description.includes('🏠 Room Shifted:')
    ).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date

    if (roomShiftEntries.length > 0) {
      console.log(`🏠 Found ${roomShiftEntries.length} room shifts, creating separate sessions`);
      
      // Get the original session (first fee record)
      const originalSession = Object.values(sessionMap)[0];
      if (originalSession) {
        // Clear the original session map to rebuild with room-specific sessions
        const originalSessionData = { ...originalSession };
        Object.keys(sessionMap).forEach(key => delete sessionMap[key]);
        
        // Build room timeline from shifts
        const roomTimeline = [];
        let currentStartDate = new Date(originalSessionData.createdAt);
        
        // Process each room shift to build timeline
        roomShiftEntries.forEach((shiftEntry, shiftIndex) => {
          const shiftDate = new Date(shiftEntry.date);
          const description = shiftEntry.description;
          const roomShiftMatch = description.match(/🏠 Room Shifted: (.+?) \((.+?), Bed (.+?)\) → (.+?) \((.+?), Bed (.+?)\)/);
          
          if (roomShiftMatch) {
            const [, oldRoomNo, oldRoomType, oldBedLabel, newRoomNo, newRoomType, newBedLabel] = roomShiftMatch;
            
            // Add the OLD room period to timeline
            const sessionEndDate = new Date(shiftDate);
            sessionEndDate.setDate(sessionEndDate.getDate() - 1); // End day before shift
            
            roomTimeline.push({
              roomNo: oldRoomNo,
              roomType: oldRoomType,
              bedLabel: oldBedLabel,
              startDate: new Date(currentStartDate),
              endDate: sessionEndDate,
              isFirst: shiftIndex === 0,
              isLast: false,
              shiftDate: shiftDate,
              shiftedTo: { roomNo: newRoomNo, type: newRoomType, bedLabel: newBedLabel }
            });
            
            // Update start date for next room
            currentStartDate = new Date(shiftDate);
            
            // If this is the last shift, add the NEW room period
            if (shiftIndex === roomShiftEntries.length - 1) {
              roomTimeline.push({
                roomNo: newRoomNo,
                roomType: newRoomType,
                bedLabel: newBedLabel,
                startDate: new Date(shiftDate),
                endDate: new Date(originalSessionData.upToDate),
                isFirst: false,
                isLast: true,
                shiftDate: null,
                shiftedFrom: { roomNo: oldRoomNo, type: oldRoomType, bedLabel: oldBedLabel }
              });
            }
          }
        });
        
        console.log('🏠 Room Timeline:', roomTimeline.map(r => `${r.roomNo} (${r.startDate.toLocaleDateString()} - ${r.endDate.toLocaleDateString()})`));
        
        // Create sessions for each room period
        roomTimeline.forEach((roomPeriod, index) => {
          const daysDuration = Math.max(1, Math.ceil((roomPeriod.endDate - roomPeriod.startDate) / (1000 * 60 * 60 * 24)) + 1);
          const monthsDuration = Math.max(1, Math.ceil(daysDuration / 30));
          
          // Calculate proportional amounts based on duration
          const rentAmount = Math.round((originalSessionData.rentAmount / originalSessionData.packageMonths) * monthsDuration);
          const messAmount = Math.round((originalSessionData.messAmount / originalSessionData.packageMonths) * monthsDuration);
          const depositAmount = roomPeriod.isFirst ? originalSessionData.depositAmount : 0; // Deposit only in first room
          
          const sessionKey = `room-${roomPeriod.roomNo}-${index}`;
          sessionMap[sessionKey] = {
            sessionId: sessionKey,
            packageType: `${monthsDuration}month${monthsDuration > 1 ? 's' : ''} (Room ${roomPeriod.roomNo})`,
            dueDate: roomPeriod.isLast ? originalSessionData.dueDate : roomPeriod.endDate,
            createdAt: roomPeriod.startDate,
            upToDate: roomPeriod.endDate,
            packageMonths: monthsDuration,
            rentAmount: rentAmount,
            messAmount: messAmount,
            depositAmount: depositAmount,
            totalAmount: rentAmount + messAmount + depositAmount,
            status: roomPeriod.isLast ? 'active' : 'completed',
            roomNumber: roomPeriod.roomNo,
            bedLabel: roomPeriod.bedLabel,
            roomType: roomPeriod.roomType,
            payments: [],
            isRoomShifted: !roomPeriod.isLast,
            roomShiftInfo: roomPeriod.isLast ? {
              shiftDate: roomPeriod.shiftedFrom ? roomShiftEntries[roomShiftEntries.length - 1].date : null,
              shiftedFrom: roomPeriod.shiftedFrom,
              isActiveSession: true
            } : {
              shiftDate: roomPeriod.shiftDate,
              shiftedTo: roomPeriod.shiftedTo,
              isHistorySession: true
            }
          };
        });
        
        console.log('✅ Created separate sessions:', Object.keys(sessionMap));
      }
    }

    // Match ledger entries to sessions
    // Strategy: Match by payment date - payment belongs to the session that was active when payment was made
    const sortedSessions = Object.values(sessionMap).sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    // Add manual ledger entries (GV entries) to sessions
    console.log(`\n💰 ===== MAPPING GV ENTRIES TO SESSIONS =====`);
    console.log(`💰 Total manual entries (GV): ${manualEntries.length}`);
    console.log(`💰 Total sessions: ${sortedSessions.length}`);
    
    manualEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      console.log(`💰 Processing GV Entry: ${entry.voucher || 'N/A'} - ₹${entry.amount} - ${entry.account} - Date: ${entryDate.toISOString().split('T')[0]}`);
      
      // Special handling for deposit payments - always assign to first room session (old session)
      const isDepositPayment = (entry.account === 'Youstel' && 
                                (entry.description?.toLowerCase().includes('deposit') || 
                                 entry.voucher?.includes('Deposit'))) ||
                               (entry.component?.includes('Deposit'));
      
      let matchedSession = null;
      
      if (isDepositPayment && sortedSessions.length > 0) {
        // For deposit payments, find the session with depositAmount > 0 (first session where deposit was charged)
        // This ensures deposit payments show in the correct session (old session for room shifts, or the only session for normal students)
        matchedSession = sortedSessions.find(s => s.depositAmount > 0);
        // If no session has depositAmount, fall back to oldest session
        if (!matchedSession) {
          matchedSession = sortedSessions[0];
        }
      } else {
        // For other payments (non-deposit), check if this is a room shift scenario
        // If room shift exists, assign based on payment date vs room shift date
        const hasRoomShifts = sortedSessions.some(s => s.isRoomShifted || s.status === 'completed');
        
        if (hasRoomShifts && sortedSessions.length > 1) {
          // Room shift scenario: assign payments based on date
          // Payments BEFORE room shift → old session (completed)
          // Payments AFTER room shift → active session
          
          // Find the room shift date (from the first completed session's shift date)
          const oldSession = sortedSessions.find(s => s.status === 'completed' || s.isRoomShifted);
          const activeSession = sortedSessions.find(s => s.status === 'active' || !s.isRoomShifted);
          
          if (oldSession && activeSession) {
            // Get room shift date from old session's upToDate or active session's createdAt
            const shiftDate = new Date(activeSession.createdAt);
            
            if (entryDate < shiftDate) {
              // Payment before room shift → assign to old session
              matchedSession = oldSession;
            } else {
              // Payment after room shift → assign to active session
              matchedSession = activeSession;
            }
          } else if (activeSession) {
            // Only active session exists, assign to it
            matchedSession = activeSession;
          } else {
            // Fallback: assign to most recent session
            matchedSession = sortedSessions[sortedSessions.length - 1];
          }
        } else {
          // No room shift: assign to active session or match by date
          const activeSession = sortedSessions.find(s => s.status === 'active' || !s.isRoomShifted);
          if (activeSession) {
            matchedSession = activeSession;
          } else {
            // Match by date
            for (let i = sortedSessions.length - 1; i >= 0; i--) {
              const session = sortedSessions[i];
              const sessionDate = new Date(session.createdAt);
              if (entryDate >= sessionDate) {
                matchedSession = session;
                break;
              }
            }
            if (!matchedSession && sortedSessions.length > 0) {
              matchedSession = sortedSessions[sortedSessions.length - 1];
            }
          }
        }
      }
      
      if (matchedSession) {
        matchedSession.payments.push({
          _id: entry._id.toString(), // Add the database ID for delete/shift operations
          date: entry.date,
          account: entry.account,
          amount: entry.amount,
          description: entry.description,
          voucher: entry.voucher,
          paymentMethod: entry.paymentMethod,
          type: entry.type || 'Payment', // Include type to distinguish adjustments from payments
          component: entry.component || null // Include component for deposit detection
        });
        console.log(`   ✅ Assigned to Session: ${matchedSession.sessionId} (${matchedSession.packageType}) - Room: ${matchedSession.roomNumber || 'N/A'}`);
      } else {
        console.log(`   ⚠️  NO SESSION MATCHED for GV Entry: ${entry.voucher || 'N/A'}`);
      }
    });
    
    console.log(`💰 ===== GV ENTRIES MAPPING COMPLETE =====`);
    sortedSessions.forEach(s => {
      console.log(`   Session ${s.sessionId}: ${s.payments.length} payments, Room: ${s.roomNumber || 'N/A'}`);
    });
    console.log(`💰 ======================================\n`);
    
    // Also add payment entries from completeLedger (fee payments) to sessions
    const paymentEntries = completeLedger.filter(e => e.type === 'Payment' && e.credit > 0);
    console.log(`\n💰 ===== MAPPING FEE PAYMENTS TO SESSIONS =====`);
    console.log(`💰 Total fee payment entries: ${paymentEntries.length}`);
    
    paymentEntries.forEach(payment => {
      const paymentDate = new Date(payment.date);
      
      // Special handling for deposit payments
      const isDepositPayment = (payment.account === 'Youstel' && 
                                (payment.description?.toLowerCase().includes('deposit') || 
                                 payment.voucher?.includes('Deposit'))) ||
                               (payment.component?.includes('Deposit'));
      
      let matchedSession = null;
      
      if (isDepositPayment && sortedSessions.length > 0) {
        // For deposit payments: If there's an active session (resume scenario), assign deposit to active session
        // This ensures deposit from history appears in active ledger when student resumes
        const activeSession = sortedSessions.find(s => s.status === 'active');
        
        if (activeSession) {
          // Student has resumed - deposit should appear in active session
          matchedSession = activeSession;
          console.log(`💰 Deposit payment assigned to ACTIVE session (resume scenario): ${payment.voucher || 'N/A'}`);
        } else {
          // No active session - assign to session with depositAmount > 0 (original session)
          matchedSession = sortedSessions.find(s => s.depositAmount > 0);
          // If no session has depositAmount, fall back to oldest session
          if (!matchedSession) {
            matchedSession = sortedSessions[0];
          }
        }
      } else if (payment.feeId) {
        // Try to find session by feeId
        matchedSession = sessionMap[payment.feeId.toString()];
      }
      
      // If not found by feeId or deposit, match by date and room shift
      // For room shifts: payments BEFORE shift → old session, payments AFTER shift → active session
      if (!matchedSession) {
        const hasRoomShifts = sortedSessions.some(s => s.isRoomShifted || s.status === 'completed');
        
        if (hasRoomShifts && sortedSessions.length > 1) {
          // Room shift scenario: assign based on payment date vs room shift date
          const oldSession = sortedSessions.find(s => s.status === 'completed' || s.isRoomShifted);
          const activeSession = sortedSessions.find(s => s.status === 'active' || !s.isRoomShifted);
          
          if (oldSession && activeSession) {
            // Get room shift date from active session's createdAt (when new room started)
            const shiftDate = new Date(activeSession.createdAt);
            
            if (paymentDate < shiftDate) {
              // Payment before room shift → assign to old session
              matchedSession = oldSession;
            } else {
              // Payment after room shift → assign to active session
              matchedSession = activeSession;
            }
          } else if (activeSession) {
            // Only active session exists
            matchedSession = activeSession;
          } else {
            // Fallback: most recent session
            matchedSession = sortedSessions[sortedSessions.length - 1];
          }
        } else {
          // No room shift: assign to active session or match by date
          const activeSession = sortedSessions.find(s => s.status === 'active' || !s.isRoomShifted);
          if (activeSession) {
            matchedSession = activeSession;
          } else {
            // Match by date
            for (let i = sortedSessions.length - 1; i >= 0; i--) {
              const session = sortedSessions[i];
              const sessionDate = new Date(session.createdAt);
              if (paymentDate >= sessionDate) {
                matchedSession = session;
                break;
              }
            }
          }
        }
      }
      
      // If no match found, assign to active session or most recent session
      if (!matchedSession && sortedSessions.length > 0) {
        matchedSession = sortedSessions.find(s => s.status === 'active' || !s.isRoomShifted) || sortedSessions[sortedSessions.length - 1];
      }
      
      if (matchedSession) {
        // Check if this payment is already added (avoid duplicates)
        const alreadyExists = matchedSession.payments.some(p => 
          p.voucher === payment.voucher && 
          p.amount === payment.credit && 
          p.date.getTime() === new Date(payment.date).getTime()
        );
        
        if (!alreadyExists) {
          matchedSession.payments.push({
            _id: payment._id || payment.feeId?.toString() || 'ledger_' + payment.date,
            date: payment.date,
            account: payment.account || (payment.component?.includes('Youstel') ? 'Youstel' : 'HUF'),
            amount: payment.credit,
            description: payment.description,
            voucher: payment.voucher,
            paymentMethod: payment.paymentMethod,
            type: payment.type || 'Payment', // Include type to distinguish adjustments from payments
            component: payment.component || null // Include component for deposit detection
          });
          console.log(`   ✅ Assigned Fee Payment: ${payment.voucher || 'N/A'} - ₹${payment.credit} to Session: ${matchedSession.sessionId}`);
        } else {
          console.log(`   ⚠️  Duplicate payment skipped: ${payment.voucher || 'N/A'}`);
        }
      } else {
        console.log(`   ⚠️  NO SESSION MATCHED for Fee Payment: ${payment.voucher || 'N/A'}`);
      }
    });
    
    console.log(`💰 ===== FEE PAYMENTS MAPPING COMPLETE =====`);
    sortedSessions.forEach(s => {
      console.log(`   Session ${s.sessionId}: ${s.payments.length} total payments`);
    });
    console.log(`💰 =========================================\n`);

    // Calculate paid amounts and balance for each session
    Object.values(sessionMap).forEach(session => {
      // For active session after room shift: only count payments made AFTER room shift
      // EXCEPT for deposits - deposits from history should always appear in active session (resume scenario)
      // Get the room shift date from the session's createdAt (when new room started)
      const isActiveSessionAfterShift = session.status === 'active' && !session.isRoomShifted;
      const shiftDate = isActiveSessionAfterShift ? new Date(session.createdAt) : null;
      
      // Filter payments based on room shift date
      // Special handling: Deposit payments should always be included in active session (resume scenario)
      const filterPaymentsByShiftDate = (payments, isDeposit = false) => {
        if (!isActiveSessionAfterShift || !shiftDate) {
          return payments; // No filtering needed for old sessions or no room shift
        }
        // For active session: 
        // - Deposit payments: include ALL (from history) - resume scenario
        // - Other payments: only include payments made AFTER room shift
        return payments.filter(p => {
          if (isDeposit) {
            // Always include deposit payments in active session (from history)
            return true;
          }
          const paymentDate = new Date(p.date);
          return paymentDate >= shiftDate;
        });
      };
      
      // Separate deposit payments from other Youstel payments for filtering
      const allYoustelPayments = session.payments.filter(p => p.account === 'Youstel');
      const depositPayments = allYoustelPayments.filter(p => 
        p.description?.toLowerCase().includes('deposit') || p.component?.includes('Deposit')
      );
      const nonDepositYoustelPayments = allYoustelPayments.filter(p => 
        !p.description?.toLowerCase().includes('deposit') && !p.component?.includes('Deposit')
      );
      
      // Filter payments: deposits always included in active session (resume), others filtered by shift date
      const youstelPayments = [
        ...filterPaymentsByShiftDate(depositPayments, true), // Deposits: always include (resume scenario)
        ...filterPaymentsByShiftDate(nonDepositYoustelPayments, false) // Others: filter by shift date
      ];
      const hufPayments = filterPaymentsByShiftDate(session.payments.filter(p => p.account === 'HUF'));
      
      let hostelPaid = 0;
      let depositPaid = 0;
      let depositRefunded = 0;
      
      youstelPayments.forEach(p => {
        // Skip room shift adjustment entries (type='Other' with room shift) - they're not payments
        const isRoomShiftAdjustment = p.type === 'Other' && (p.description?.toLowerCase().includes('room shift') || p.voucher?.includes('GV-Shift-Hostel'));
        if (isRoomShiftAdjustment) {
          return; // Skip - this is an adjustment, not a payment
        }
        
        if (p.description?.toLowerCase().includes('deposit') || p.component?.includes('Deposit')) {
          // Separate refunds from payments
          const isRefund = p.description?.toLowerCase().includes('refund') || 
                          p.description?.toLowerCase().includes('mark inactive');
          
          if (isRefund) {
            // This is a refund entry - subtract from deposit paid
            depositRefunded += p.amount;
          } else {
            // This is an original deposit payment (from history or new)
            depositPaid += p.amount;
          }
        } else {
          // Only count actual payments (type='Payment'), not adjustments
          if (p.type === 'Payment') {
            hostelPaid += p.amount;
          }
        }
      });
      
      // Calculate net deposit paid (original payments minus refunds)
      const netDepositPaid = Math.max(0, depositPaid - depositRefunded);
      
      // Calculate mess paid - exclude room shift adjustments
      let messPaid = hufPayments
        .filter(p => {
          // Skip room shift adjustment entries
          const isRoomShiftAdjustment = p.type === 'Other' && (p.description?.toLowerCase().includes('room shift') || p.voucher?.includes('GV-Shift-Mess'));
          return !isRoomShiftAdjustment && p.type === 'Payment';
        })
        .reduce((sum, p) => sum + p.amount, 0);
      
      
      // Debug logging for active session
      if (isActiveSessionAfterShift) {
        console.log(`📊 Active Session Payment Filtering:`, {
          sessionId: session.sessionId,
          shiftDate: shiftDate.toISOString(),
          totalPayments: session.payments.length,
          filteredYoustelPayments: youstelPayments.length,
          filteredHufPayments: hufPayments.length,
          hostelPaid,
          messPaid,
          depositPaid,
          note: 'Only payments made AFTER room shift are counted in active session'
        });
      }
      
      session.paid = {
        hostel: hostelPaid,
        mess: messPaid,
        deposit: netDepositPaid, // Use net deposit (after refunds)
        total: hostelPaid + messPaid + netDepositPaid
      };
      
      // Store refund info for frontend display
      session.depositRefunded = depositRefunded;
      
      // If rentAmount/messAmount are 0, try to get from ledger entries for this session
      if (session.rentAmount === 0 || session.messAmount === 0) {
        // Find fee entries for this session from completeLedger
        const sessionFeeEntries = completeLedger.filter(e => 
          e.feeId && e.feeId.toString() === session.sessionId && e.type === 'Fee'
        );
        
        if (sessionFeeEntries.length > 0) {
          const totalRent = sessionFeeEntries
            .filter(e => e.component?.includes('Hostel') || e.rentAmount > 0)
            .reduce((sum, e) => sum + (e.rentAmount || e.debit || 0), 0);
          const totalMess = sessionFeeEntries
            .filter(e => e.component?.includes('Mess') || e.messAmount > 0)
            .reduce((sum, e) => sum + (e.messAmount || e.debit || 0), 0);
          const totalDeposit = sessionFeeEntries
            .filter(e => e.component?.includes('Deposit') || e.depositAmount > 0)
            .reduce((sum, e) => sum + (e.depositAmount || e.debit || 0), 0);
          
          if (session.rentAmount === 0 && totalRent > 0) session.rentAmount = totalRent;
          if (session.messAmount === 0 && totalMess > 0) session.messAmount = totalMess;
          if (session.depositAmount === 0 && totalDeposit > 0) session.depositAmount = totalDeposit;
          if (session.totalAmount === 0) session.totalAmount = totalRent + totalMess + totalDeposit;
        }
      }
      
      // Calculate room shift adjustment amounts (Additional Charges) - MUST BE BEFORE console.log
      // Upgrade entries (type='Other' with room shift description) should increase due amount
      const youstelShiftAdjustments = youstelPayments
        .filter(p => p.type === 'Other' && (p.description?.toLowerCase().includes('room shift') || p.voucher?.includes('GV-Shift-Hostel')))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const hufShiftAdjustments = hufPayments
        .filter(p => p.type === 'Other' && (p.description?.toLowerCase().includes('room shift') || p.voucher?.includes('GV-Shift-Mess')))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Debug logging for balance calculation (AFTER variables are declared)
      console.log(`📊 Session ${session.sessionId} Balance Calculation:`, {
        rentAmount: session.rentAmount,
        messAmount: session.messAmount,
        depositAmount: session.depositAmount,
        hostelPaid,
        messPaid,
        depositPaid,
        youstelShiftAdjustments,
        hufShiftAdjustments,
        adjustedRentAmount: session.rentAmount + youstelShiftAdjustments,
        adjustedMessAmount: session.messAmount + hufShiftAdjustments
      });
      
      // Room shift refunds (type='Payment' with room shift description) are already counted in paid amounts
      // So we only need to add adjustments (upgrades) to the total amount
      const adjustedRentAmount = session.rentAmount + youstelShiftAdjustments;
      // Only add mess adjustment if there's actually a mess adjustment (not all room shifts have mess changes)
      const adjustedMessAmount = session.messAmount + hufShiftAdjustments;
      const adjustedTotalAmount = adjustedRentAmount + adjustedMessAmount + session.depositAmount;
      
      // Calculate balance (due amount) - include room shift adjustments
      // For active session after room shift: hostel due should ONLY be the room shift adjustment
      // Old room rent was already paid in old session, so don't include new room rent in due
      let hostelDue = 0;
      
      if (session.status === 'active' && !session.isRoomShifted && youstelShiftAdjustments > 0) {
        // Active session after room shift: due is ONLY the room shift adjustment
        // Don't include the new room rent - it's already covered by old payment
        hostelDue = Math.max(0, youstelShiftAdjustments - hostelPaid);
        
        console.log(`📊 Active Session Hostel Due Calculation:`, {
          sessionId: session.sessionId,
          sessionRentAmount: session.rentAmount,
          youstelShiftAdjustments,
          hostelPaid,
          hostelDue,
          note: 'Active session hostel due = only room shift adjustment (not including new room rent)'
        });
      } else {
        // Normal session or old session: use standard calculation
        hostelDue = Math.max(0, adjustedRentAmount - hostelPaid);
      }
      
      // Mess due calculation: For room shifts, mess is typically already paid in old session
      // Active session should show mess due = 0 if mess was already paid in old session
      // Only show mess due if there's a mess adjustment from room shift AND it's not paid
      let messDue = 0;
      
      // Check if this is an active session after room shift
      const isActiveAfterShift = session.status === 'active' && !session.isRoomShifted;
      
      if (isActiveAfterShift) {
        // Active session after room shift
        // Mess should already be paid in old session, so due should be 0 unless there's an adjustment
        if (hufShiftAdjustments > 0) {
          // Room shift with mess adjustment - calculate due for the adjustment only
          messDue = Math.max(0, hufShiftAdjustments - messPaid);
        } else {
          // No mess adjustment - mess is already paid in old session, so due is 0
          messDue = 0;
        }
      } else {
        // Old session or no room shift - normal calculation
        if (hufShiftAdjustments > 0) {
          // Room shift with mess adjustment - calculate due for the adjustment only
          messDue = Math.max(0, adjustedMessAmount - messPaid);
        } else {
          // No mess adjustment - normal calculation
          // If mess is already paid (paid >= package amount), due should be 0
          messDue = Math.max(0, session.messAmount - messPaid);
        }
      }
      
      // Ensure mess due is 0 if already fully paid (this handles cases where paid amount exceeds package)
      if (messPaid >= session.messAmount) {
        // If there's a mess adjustment, only show due if adjustment itself is not paid
        if (hufShiftAdjustments > 0) {
          // Check if the adjustment amount is paid
          if (messPaid >= adjustedMessAmount) {
            messDue = 0;
          }
        } else {
          // No adjustment, if paid >= package, due is 0
          messDue = 0;
        }
      }
      
      // For active session after room shift: if mess was paid in old session, ensure due is 0
      if (isActiveAfterShift && hufShiftAdjustments === 0) {
        // No mess adjustment, and mess was already paid in old session
        messDue = 0;
      }
      const depositDue = Math.max(0, session.depositAmount - netDepositPaid); // Use net deposit (after refunds)
      
      // For active session after room shift: total due should ONLY be the room shift adjustment
      // Old room rent was already paid in old session, so active session should only show the adjustment
      let totalDue = 0;
      
      if (session.status === 'active' && !session.isRoomShifted && (youstelShiftAdjustments > 0 || hufShiftAdjustments > 0)) {
        // Active session after room shift: due is ONLY the room shift adjustment
        // Don't include the new room rent in due calculation - it's already covered by the adjustment
        // Total due = room shift adjustments - payments made AFTER room shift
        const totalAdjustments = youstelShiftAdjustments + hufShiftAdjustments;
        totalDue = Math.max(0, totalAdjustments - (hostelPaid + messPaid + netDepositPaid)); // Use net deposit
        
        console.log(`📊 Active Session After Room Shift - Due Calculation:`, {
          sessionId: session.sessionId,
          youstelShiftAdjustments,
          hufShiftAdjustments,
          totalAdjustments,
          hostelPaid,
          messPaid,
          depositPaid,
          totalPaid: hostelPaid + messPaid + depositPaid,
          totalDue,
          note: 'Active session due = only room shift adjustments (not including new room rent)'
        });
      } else {
        // Normal session or old session: use standard calculation
        totalDue = Math.max(0, adjustedTotalAmount - (hostelPaid + messPaid + netDepositPaid)); // Use net deposit
      }
      
      // Debug logging for active session
      if (session.status === 'active' && !session.isRoomShifted) {
        console.log(`📊 Active Session Total Due Calculation:`, {
          sessionId: session.sessionId,
          adjustedTotalAmount,
          sessionRentAmount: session.rentAmount,
          sessionMessAmount: session.messAmount,
          hostelPaid,
          messPaid,
          depositPaid,
          totalPaid: hostelPaid + messPaid + depositPaid,
          totalDue,
          youstelShiftAdjustments,
          hufShiftAdjustments,
          isRoomShifted: session.isRoomShifted
        });
      }
      
      session.balance = {
        hostel: hostelDue,
        mess: messDue,
        deposit: depositDue,
        total: totalDue
      };
      
      // Store adjusted amounts for display
      session.adjustedRentAmount = adjustedRentAmount;
      session.adjustedMessAmount = adjustedMessAmount;
      session.adjustedTotalAmount = adjustedTotalAmount;
      
      // Store room shift adjustments for display
      session.roomShiftAdjustments = {
        hostel: youstelShiftAdjustments,
        mess: hufShiftAdjustments,
        total: youstelShiftAdjustments + hufShiftAdjustments
      };
      
      // Add due status
      session.dueStatus = totalDue > 0 ? 'pending' : 'paid';
      session.isPaid = totalDue === 0;
      
      // CRITICAL: Update session status based on actual balance
      // If balance is ₹0, status should be 'paid' (not 'overdue' or 'pending')
      if (totalDue === 0) {
        // Fully paid - status should be 'paid'
        if (session.status !== 'paid' && session.status !== 'checked_out') {
          console.log(`✅ Updating session ${session.sessionId} status from '${session.status}' to 'paid' (balance is ₹0)`);
          session.status = 'paid';
        }
      } else if (totalDue > 0 && totalDue < session.totalAmount) {
        // Partially paid
        if (session.status !== 'partial' && session.status !== 'checked_out') {
          console.log(`✅ Updating session ${session.sessionId} status from '${session.status}' to 'partial' (balance: ₹${totalDue})`);
          session.status = 'partial';
        }
      } else if (totalDue >= session.totalAmount && session.status === 'paid') {
        // Status says paid but balance > 0 - this is an error, set to pending
        console.log(`⚠️ Session ${session.sessionId} has status 'paid' but balance is ₹${totalDue} - updating to 'pending'`);
        session.status = 'pending';
      }
      
      console.log(`📊 Session ${session.sessionId}: Rent=${session.rentAmount}, Mess=${session.messAmount}, Deposit=${session.depositAmount}, Payments=${session.payments.length}, Balance=₹${totalDue}, Status=${session.status}, Room=${session.roomNumber || 'N/A'}, Bed=${session.bedLabel || 'N/A'}`);
      
      // Debug: Log payments in this session
      if (session.payments.length > 0) {
        console.log(`   💰 Payments in this session:`);
        session.payments.forEach((p, idx) => {
          console.log(`      ${idx + 1}. ₹${p.amount} - ${p.account} - ${p.voucher || 'N/A'} - ${new Date(p.date).toISOString().split('T')[0]}`);
        });
      } else {
        console.log(`   ⚠️  NO PAYMENTS in this session!`);
      }
    });

    // Second pass: For active session after room shift, if mess was paid in old session, show it as paid
    // This is for display purposes - to show that mess is fully paid even though payment was in old session
    Object.values(sessionMap).forEach(session => {
      const isActiveSessionAfterShift = session.status === 'active' && !session.isRoomShifted;
      const hufShiftAdjustments = session.roomShiftAdjustments?.mess || 0;
      
      if (isActiveSessionAfterShift && hufShiftAdjustments === 0) {
        // No mess adjustment - check if mess was paid in old session
        const oldSession = sortedSessions.find(s => (s.status === 'completed' || s.isRoomShifted) && s.sessionId !== session.sessionId);
        if (oldSession && oldSession.paid && oldSession.paid.mess >= oldSession.messAmount) {
          // Mess was fully paid in old session - show as paid in active session too
          session.paid.mess = session.messAmount; // Set to package amount to show it's fully paid
          session.paid.total = session.paid.hostel + session.paid.mess + session.paid.deposit;
          
          // Also copy mess payment entries from old session to active session for display
          // This shows the actual payment entries (with date and GV number) in active ledger
          const oldMessPayments = oldSession.payments.filter(p => 
            p.account === 'HUF' && 
            p.type === 'Payment' && 
            p.amount > 0 && 
            !p.description?.toLowerCase().includes('room shift') && 
            !p.voucher?.includes('GV-Shift-Mess')
          );
          
          // Add old session's mess payments to active session (for display only)
          oldMessPayments.forEach(oldPayment => {
            // Check if this payment is already in active session (avoid duplicates)
            const alreadyExists = session.payments.some(p => 
              p.voucher === oldPayment.voucher && 
              p.amount === oldPayment.amount && 
              new Date(p.date).getTime() === new Date(oldPayment.date).getTime()
            );
            
            if (!alreadyExists) {
              session.payments.push({
                ...oldPayment,
                _id: oldPayment._id || 'old_' + oldPayment.voucher,
                // Mark as from old session for reference
                fromOldSession: true
              });
            }
          });
          
          console.log(`📊 Active Session Mess Paid - Inherited from Old Session:`, {
            sessionId: session.sessionId,
            oldSessionMessPaid: oldSession.paid.mess,
            oldSessionMessAmount: oldSession.messAmount,
            activeSessionMessAmount: session.messAmount,
            activeSessionMessPaid: session.paid.mess,
            copiedPayments: oldMessPayments.length,
            note: 'Mess was paid in old session, showing payment entries in active session'
          });
        }
      }
    });

    // Convert to array and sort by date (latest first)
    let sessions = Object.values(sessionMap).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Mark old sessions as 'completed' if there's a newer active session
    // This ensures history sessions are properly displayed
    // IMPORTANT: If student is inactive, ALL sessions should be marked as 'completed' (no active package)
    const isStudentInactive = student.status === 'inactive';
    
    console.log(`\n📋 ===== SESSION STATUS ASSIGNMENT =====`);
    console.log(`📋 Student Status: ${student.status}`);
    console.log(`📋 Total Sessions: ${sessions.length}`);
    console.log(`📋 Is Student Inactive: ${isStudentInactive}\n`);
    
    if (isStudentInactive) {
      // For inactive students: mark ALL sessions as completed (no active package)
      console.log(`📋 ⚠️  INACTIVE STUDENT - marking all ${sessions.length} sessions as 'completed' (Package History)`);
      sessions.forEach((session, idx) => {
        if (session.status !== 'completed' && session.status !== 'checked_out') {
          session.status = 'completed';
          console.log(`   ✅ Session ${idx + 1} (${session.sessionId}): 'completed' - Package History`);
        } else {
          console.log(`   ✅ Session ${idx + 1} (${session.sessionId}): already '${session.status}' - Package History`);
        }
      });
      console.log(`📋 Result: All ${sessions.length} sessions are Package History (no Active Package)\n`);
    } else {
      // For active students: ensure proper session status assignment
      // ROBUST LOGIC: Only mark session as "Active Package" if it's a VALID active session
      // A session is "Active Package" ONLY if:
      // 1. Student has room allocated (resume + room allocation done), AND
      // 2. Session fee status is pending/partial/paid (NOT completed/checked_out/refunded), AND
      // 3. Session fee exists (not a default/fallback session)
      // Otherwise, ALL sessions are "Package History" (resume but no new package yet)
      
      if (sessions.length > 0) {
        const mostRecentSession = sessions[0];
        
        // Find the fee for this session
        const sessionFee = fees.find(f => f._id.toString() === mostRecentSession.sessionId);
        
        // Check if student has room allocated (indicates resume + room allocation done)
        const hasRoomAllocated = !!student.roomNo;
        
        // Check if session fee exists and is valid (not a default/fallback session)
        const hasValidFee = sessionFee && sessionFee._id;
        
        // Check if fee status indicates it's an active session (not completed/checked_out/refunded)
        const isActiveFeeStatus = sessionFee && (
          sessionFee.status === 'pending' || 
          sessionFee.status === 'partial' || 
          sessionFee.status === 'paid'
        );
        
        // Check if fee status indicates it's an old/completed session
        const isCompletedFeeStatus = sessionFee && (
          sessionFee.status === 'completed' || 
          sessionFee.status === 'checked_out' || 
          sessionFee.status === 'refunded'
        );
        
        // ROBUST DECISION: Only mark as active if ALL conditions are met:
        // 1. Student has room (resume + room done)
        // 2. Fee exists (not default session)
        // 3. Fee status is active (pending/partial/paid)
        const shouldBeActive = hasRoomAllocated && hasValidFee && isActiveFeeStatus;
        
        console.log(`📋 ===== SESSION STATUS DECISION (ROBUST) =====`);
        console.log(`📋 Session ID: ${mostRecentSession.sessionId}`);
        console.log(`📋 Student Status: ${student.status}`);
        console.log(`📋 Has Room: ${hasRoomAllocated}`);
        console.log(`📋 Has Valid Fee: ${hasValidFee}`);
        console.log(`📋 Fee Status: ${sessionFee?.status || 'no fee'}`);
        console.log(`📋 Is Active Fee Status: ${isActiveFeeStatus}`);
        console.log(`📋 Is Completed Fee Status: ${isCompletedFeeStatus}`);
        console.log(`📋 Should Be Active: ${shouldBeActive}`);
        console.log(`📋 ===========================================`);
        
        if (shouldBeActive) {
          // This is a VALID active session (new package after resume + room allocation)
          if (sessionFee.status === 'pending') {
            mostRecentSession.status = 'pending';
          } else if (sessionFee.status === 'partial') {
            mostRecentSession.status = 'partial';
          } else if (sessionFee.status === 'paid') {
            mostRecentSession.status = 'active'; // Paid fees are still active sessions
          } else {
            mostRecentSession.status = 'active';
          }
          console.log(`✅ Marking as ACTIVE PACKAGE: status='${mostRecentSession.status}' (has room + valid fee + active status)`);
        } else {
          // This is either:
          // 1. Old session from before resume (completed/checked_out), OR
          // 2. Resume but no room allocated yet, OR
          // 3. Resume + room but no fee created yet, OR
          // 4. Default/fallback session
          // In ALL cases, mark as completed (Package History)
          mostRecentSession.status = 'completed';
          
          if (!hasRoomAllocated) {
            console.log(`📋 Marking as PACKAGE HISTORY: Resume but no room allocated yet`);
          } else if (!hasValidFee) {
            console.log(`📋 Marking as PACKAGE HISTORY: Resume + room but no fee created yet`);
          } else if (isCompletedFeeStatus) {
            console.log(`📋 Marking as PACKAGE HISTORY: Old session from before resume (fee status: ${sessionFee.status})`);
          } else {
            console.log(`📋 Marking as PACKAGE HISTORY: Default/fallback session`);
          }
        }
      }
      
      // Mark all older sessions (index 1 onwards) as 'completed' (Package History)
      if (sessions.length > 1) {
        const firstSessionStatus = sessions[0].status;
        const isFirstSessionActive = firstSessionStatus !== 'completed' && firstSessionStatus !== 'checked_out';
        const activePackageCount = isFirstSessionActive ? 1 : 0;
        const historyCount = sessions.length - activePackageCount;
        
        console.log(`📋 ✅ ACTIVE STUDENT - ${sessions.length} sessions found:`);
        console.log(`   📋 Session 1 (${sessions[0].sessionId}): '${firstSessionStatus}' - ${isFirstSessionActive ? 'ACTIVE PACKAGE' : 'PACKAGE HISTORY 1'}`);
        for (let i = 1; i < sessions.length; i++) {
          if (sessions[i].status !== 'completed' && sessions[i].status !== 'checked_out') {
            sessions[i].status = 'completed';
            console.log(`   📋 Session ${i + 1} (${sessions[i].sessionId}): 'completed' - Package History ${i}`);
          } else {
            console.log(`   📋 Session ${i + 1} (${sessions[i].sessionId}): already '${sessions[i].status}' - Package History ${i}`);
          }
        }
        console.log(`📋 Result: ${activePackageCount} Active Package + ${historyCount} Package History\n`);
      } else {
        const firstSessionStatus = sessions[0].status;
        const isFirstSessionActive = firstSessionStatus !== 'completed' && firstSessionStatus !== 'checked_out';
        console.log(`📋 ✅ ACTIVE STUDENT - 1 session found:`);
        console.log(`   📋 Session 1 (${sessions[0].sessionId}): '${firstSessionStatus}' - ${isFirstSessionActive ? 'ACTIVE PACKAGE' : 'PACKAGE HISTORY 1'}\n`);
      }
    }

    // Hide room data in ledger if student status is 'registered' (not active yet)
    // Only show registration form data (deposit entry) until post approval
    const shouldHideRoomData = student.status === 'registered';
    
    // CRITICAL: Ensure sessions is always an array before sending response
    let finalSessions = Array.isArray(sessions) ? sessions : [];
    
    // CRITICAL FALLBACK: If sessions array is empty, try to get from sessionMap directly
    if (finalSessions.length === 0 && sessionMap && Object.keys(sessionMap).length > 0) {
      console.log('⚠️⚠️⚠️ CRITICAL: sessions array is empty but sessionMap has data!');
      console.log(`   sessionMap keys:`, Object.keys(sessionMap));
      finalSessions = Object.values(sessionMap).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      console.log(`   ✅ Recovered ${finalSessions.length} sessions from sessionMap`);
    }
    
    // CRITICAL FALLBACK: If still empty, create emergency session
    if (finalSessions.length === 0) {
      console.log('⚠️⚠️⚠️ CRITICAL: No sessions found at all! Creating emergency session...');
      const emergencySessionId = `emergency-${student._id}-${Date.now()}`;
      const emergencySession = {
        sessionId: emergencySessionId,
        packageType: 'History',
        dueDate: student.admissionUpToDate ? new Date(student.admissionUpToDate) : new Date(),
        createdAt: student.enrollmentDate ? new Date(student.enrollmentDate) : new Date(),
        upToDate: student.admissionUpToDate ? new Date(student.admissionUpToDate) : new Date(),
        packageMonths: student.admissionMonths || 0,
        rentAmount: 0,
        messAmount: 0,
        depositAmount: 0,
        totalAmount: 0,
        status: student.status === 'inactive' ? 'completed' : 'active',
        roomNumber: null,
        bedLabel: null,
        roomType: null,
        payments: [],
        isRoomShifted: false,
        roomShiftHistory: [],
        paid: { hostel: 0, mess: 0, deposit: 0, total: 0 },
        balance: { hostel: 0, mess: 0, deposit: 0, total: 0 }
      };
      finalSessions = [emergencySession];
      console.log(`   ✅ Created emergency session: ${emergencySessionId}`);
    }
    
    console.log(`\n📤 ===== SENDING LEDGER RESPONSE =====`);
    console.log(`📤 Student: ${student.firstName} ${student.lastName} (${student.studentId})`);
    console.log(`📤 Student Status: ${student.status}`);
    console.log(`📤 Sessions count: ${finalSessions.length}`);
    console.log(`📤 Sessions is array: ${Array.isArray(finalSessions)}`);
    if (finalSessions.length > 0) {
      finalSessions.forEach((s, idx) => {
        console.log(`   Session ${idx + 1}: ${s.sessionId} - ${s.packageType} - ${s.status} - Room: ${s.roomNumber || 'N/A'} - Bed: ${s.bedLabel || 'N/A'}`);
      });
    } else {
      console.log(`   ⚠️⚠️⚠️ CRITICAL ERROR: NO SESSIONS FOUND AFTER ALL FALLBACKS!`);
      console.log(`   sessionMap keys:`, Object.keys(sessionMap || {}));
      console.log(`   sessions array length:`, sessions?.length || 0);
    }
    console.log(`📤 Ledger entries count: ${completeLedger.length}`);
    console.log(`📤 ====================================\n`);
    
    res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          department: student.department,
          course: student.course,
          year: student.year,
          semester: student.semester,
          status: student.status,
          // Hide room data if student is registered (not active yet)
          roomNo: shouldHideRoomData ? null : student.roomNo,
          bedLabel: shouldHideRoomData ? null : bedLabel,
          enrollmentDate: student.enrollmentDate,
          admissionUpToDate: student.admissionUpToDate,
          admissionMonths: student.admissionMonths
        },
        ledger: completeLedger,
        summary: updatedSummary,
        sessions: finalSessions // CRITICAL: Always send as array
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add manual ledger entry (office) for a student
// @route   POST /api/students/:id/ledger/entries
// @access  Private (Admin/Accountant/Warden)
exports.addManualLedgerEntry = async (req, res) => {
  try {
    const LedgerEntry = require('../models/LedgerEntry');
    const { date, amount, account, description, voucher, paymentMethod, component } = req.body;
    
    // Validation
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }
    if (!['Youstel', 'HUF'].includes(account)) {
      return res.status(400).json({ success: false, message: 'Account must be Youstel or HUF' });
    }
    if (paymentMethod && !['online', 'cash'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Payment method must be online or cash' });
    }
    
    // Generate proper description based on account and component
    let finalDescription = description || '';
    
    // If description is empty or generic, create a proper one
    if (!finalDescription || finalDescription.toLowerCase() === 'payment received' || finalDescription.trim() === '') {
      if (account === 'Youstel') {
        // For Youstel, check if component is specified
        if (component === 'Deposit' || (finalDescription && finalDescription.toLowerCase().includes('deposit'))) {
          finalDescription = `Deposit (Youstel) Payment - ${paymentMethod === 'cash' ? 'Cash' : 'Online'}`;
        } else {
          // Default to Hostel for Youstel
          finalDescription = `Hostel (Youstel) Payment - ${paymentMethod === 'cash' ? 'Cash' : 'Online'}`;
        }
      } else if (account === 'HUF') {
        finalDescription = `Mess (HUF) Payment - ${paymentMethod === 'cash' ? 'Cash' : 'Online'}`;
      }
    } else {
      // If description is provided, ensure it has proper format
      // Add account context if not present
      if (account === 'Youstel' && !finalDescription.toLowerCase().includes('youstel')) {
        if (finalDescription.toLowerCase().includes('deposit')) {
          finalDescription = `Deposit (Youstel) - ${finalDescription}`;
        } else if (finalDescription.toLowerCase().includes('hostel') || finalDescription.toLowerCase().includes('rent')) {
          finalDescription = `Hostel (Youstel) - ${finalDescription}`;
        } else {
          // Default to Hostel if unclear
          finalDescription = `Hostel (Youstel) - ${finalDescription}`;
        }
      } else if (account === 'HUF' && !finalDescription.toLowerCase().includes('huf') && !finalDescription.toLowerCase().includes('mess')) {
        finalDescription = `Mess (HUF) - ${finalDescription}`;
      }
    }
    
    // Log for debugging
    console.log('📝 Creating manual ledger entry:', {
      student: req.params.id,
      account,
      amount: Number(amount),
      component,
      originalDescription: description,
      finalDescription,
      voucher: voucher || null,
      paymentMethod: paymentMethod || 'online'
    });
    
    const entry = await LedgerEntry.create({
      student: req.params.id,
      date: date ? new Date(date) : new Date(),
      type: 'Payment',
      description: finalDescription,
      account,
      amount: Number(amount),
      voucher: voucher || null,
      paymentMethod: paymentMethod || 'online',
      createdBy: req.user?.id
    });
    
    console.log('✅ Manual ledger entry created:', entry._id);
    
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('❌ Error creating manual ledger entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete ALL manual ledger entries (office) for a student
// @route   DELETE /api/students/:id/ledger/entries
// @access  Private (Admin/Accountant/Warden)
exports.deleteManualLedgerEntries = async (req, res) => {
  try {
    const LedgerEntry = require('../models/LedgerEntry');
    const result = await LedgerEntry.deleteMany({ student: req.params.id });
    res.status(200).json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Auto create/update checklist fee for a student
// @route   POST /api/students/:id/checklist/fees
// @access  Private (Admin/Warden/Accountant)
// In-memory request tracking to prevent concurrent duplicate requests
const feeCreationLocks = new Map();

exports.autoCreateChecklistFee = async (req, res) => {
    const studentId = req.params.id;
  
  // LAYER 1: Check if request already in progress for this student
  if (feeCreationLocks.has(studentId)) {
    const lockTime = feeCreationLocks.get(studentId);
    const timeSinceLock = Date.now() - lockTime;
    
    // If lock is less than 10 seconds old, reject as duplicate
    if (timeSinceLock < 10000) {
      console.log(`⚠️ Duplicate request blocked for student ${studentId} (${timeSinceLock}ms since last request)`);
      return res.status(429).json({ 
        success: false, 
        message: 'Fee creation already in progress. Please wait...' 
      });
    } else {
      // Lock expired (stale), remove it
      feeCreationLocks.delete(studentId);
    }
  }
  
  // Set lock for this student
  feeCreationLocks.set(studentId, Date.now());
  
  try {
    const {
      packageType = '5months',
      dueDate,
      messProvider = 'yustel',
      semester = 1,
      year = 1,
      remarks = ''
    } = req.body || {};

    // LAYER 2: Validate student exists and has room
    const student = await Student.findById(studentId).populate('roomNo');
    if (!student) {
      feeCreationLocks.delete(studentId);
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!student.roomNo) {
      feeCreationLocks.delete(studentId);
      return res.status(400).json({
        success: false,
        message: 'Assign a room to the student before generating fees.'
      });
    }

    const months = PACKAGE_MONTHS[packageType] || 1;
    const rentPerMonth = getRentPerPackage(student.roomNo, packageType);
    const messPerMonth = student.roomNo.messChargePerMonth || 3000;
    
    // Check if student already has a paid deposit from previous session (resume scenario)
    // Deposit should only be charged ONCE per student, not on every resume
    let depositAmount = 0;
    const existingFeesForDepositCheck = await Fee.find({ 
      student: studentId,
      source: 'checklist_auto'
    });
    
    // Check if any previous fee has deposit that was paid
    const hasPaidDeposit = existingFeesForDepositCheck.some(fee => {
      const depositPaid = fee.depositAmount > 0 && 
        ((fee.status === 'paid' || fee.status === 'partial') && 
         (fee.youstelAmount >= fee.depositAmount || fee.depositAmount > 0));
      return depositPaid;
    });
    
    // Also check manual ledger entries for deposit payments
    const LedgerEntry = require('../models/LedgerEntry');
    const depositPayments = await LedgerEntry.find({
      student: studentId,
      account: 'Youstel',
      type: 'Payment', // Only count actual payments, not refunds
      $or: [
        { description: { $regex: /deposit/i } },
        { component: { $regex: /deposit/i } }
      ]
    });
    
    // Calculate net deposit paid (payments minus refunds)
    let totalDepositPaid = 0;
    let totalDepositRefunded = 0;
    
    depositPayments.forEach(entry => {
      const isRefund = entry.description?.toLowerCase().includes('refund') || 
                      entry.description?.toLowerCase().includes('mark inactive');
      if (isRefund) {
        totalDepositRefunded += entry.amount || 0;
      } else {
        totalDepositPaid += entry.amount || 0;
      }
    });
    
    const netDepositPaid = Math.max(0, totalDepositPaid - totalDepositRefunded);
    const hasDepositPayment = netDepositPaid >= SECURITY_DEPOSIT_AMOUNT * 0.5; // At least 50% of deposit paid
    
    // Only charge deposit if student has NOT paid deposit before (first time or fully refunded)
    if (!hasPaidDeposit && !hasDepositPayment) {
      depositAmount = SECURITY_DEPOSIT_AMOUNT;
      console.log(`💰 Charging deposit (₹${depositAmount}) - Student has no previous deposit`);
    } else {
      depositAmount = 0;
      console.log(`✅ Skipping deposit - Student already has paid deposit from previous session`);
      console.log(`   Previous deposit found: ${hasPaidDeposit ? 'In fees' : ''} ${hasDepositPayment ? 'In ledger entries' : ''}`);
      console.log(`   Net deposit paid: ₹${netDepositPaid} (Payments: ₹${totalDepositPaid}, Refunds: ₹${totalDepositRefunded})`);
      console.log(`   💡 Deposit will appear in active session ledger from history`);
    }

    if (rentPerMonth <= 0 || messPerMonth <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Calculated fee amount is zero. Please verify room pricing.'
      });
    }

    // Use enrollmentDate as dueDate if not provided (enrollmentDate is the actual admission date)
    // Priority: provided dueDate > student.enrollmentDate > current date
    let dueDateValue = null;
    if (dueDate) {
      dueDateValue = new Date(dueDate);
      if (isNaN(dueDateValue.getTime())) {
        feeCreationLocks.delete(studentId);
        return res.status(400).json({ success: false, message: 'Invalid due date provided.' });
      }
    } else {
      // For resumed students (inactive -> active), always use today's date
      // Check if student was previously inactive (resume scenario)
      const existingFees = await Fee.find({ student: studentId, source: 'checklist_auto' });
      const hasOldFees = existingFees.length > 0;
      const allOldFeesCompleted = existingFees.every(fee => 
        fee.status === 'paid' || 
        fee.status === 'partial' || 
        fee.status === 'checked_out' ||
        fee.status === 'refunded'
      );
      const isResumeScenario = hasOldFees && allOldFeesCompleted;
      
      if (isResumeScenario) {
        // Resume scenario: Use today's date for new fees
        dueDateValue = new Date();
        console.log(`📅 Resume scenario detected - Using today's date as dueDate: ${dueDateValue.toISOString().split('T')[0]}`);
      } else if (student.enrollmentDate) {
        // Use enrollmentDate as dueDate (actual admission date) for new students
        dueDateValue = new Date(student.enrollmentDate);
        console.log(`📅 Using enrollmentDate as dueDate: ${dueDateValue.toISOString().split('T')[0]}`);
      } else {
        // Last resort: use current date
        dueDateValue = new Date();
        console.log(`⚠️ No enrollmentDate or dueDate, using current date: ${dueDateValue.toISOString().split('T')[0]}`);
      }
    }
    
    // Ensure enrollmentDate is set if not already set (use dueDateValue as enrollmentDate)
    if (!student.enrollmentDate && dueDateValue) {
      await Student.findByIdAndUpdate(studentId, {
        enrollmentDate: dueDateValue
      });
      console.log(`📅 Set enrollmentDate from dueDateValue: ${dueDateValue.toISOString().split('T')[0]}`);
      // Refresh student object to get updated enrollmentDate
      const updatedStudent = await Student.findById(studentId);
      if (updatedStudent) {
        student.enrollmentDate = updatedStudent.enrollmentDate;
      }
    }

    // LAYER 3: Check for existing checklist_auto fees created TODAY (prevent duplicate clicks)
    // BUT allow if it's a resume scenario (old fees are completed/paid)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todayFees = await Fee.find({ 
      student: studentId, 
      source: 'checklist_auto',
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    if (todayFees.length > 0) {
      // Check if all today's fees are completed/paid (resume scenario - multiple fees in one day)
      const allTodayFeesCompleted = todayFees.every(fee => 
        fee.status === 'paid' || 
        fee.status === 'partial' || 
        fee.status === 'checked_out' ||
        fee.status === 'refunded'
      );
      
      // Also check if there are OLD fees (from before today) that are completed (resume scenario)
      const oldFees = await Fee.find({ 
        student: studentId, 
        source: 'checklist_auto',
        createdAt: { $lt: todayStart }
      });
      
      const allOldFeesCompleted = oldFees.length === 0 || oldFees.every(fee => 
        fee.status === 'paid' || 
        fee.status === 'partial' || 
        fee.status === 'checked_out' ||
        fee.status === 'refunded'
      );
      
      // Check if student has no room (new student scenario)
      // Also get student data for resume scenario detection
      const studentForCheck = await Student.findById(studentId);
      const isNewStudentScenario = !studentForCheck?.roomNo && (studentForCheck?.status === 'active' || studentForCheck?.status === 'registered');
      
      // Check if student was previously inactive (resume scenario)
      // If student is now active but has old fees, it's a resume scenario
      const isStudentActive = studentForCheck?.status === 'active';
      const hasOldCompletedFees = oldFees.length > 0 && allOldFeesCompleted;
      const hasOldFees = oldFees.length > 0; // Any old fees (regardless of status)
      
      // CRITICAL: Resume scenario detection
      // Student is active AND has old completed fees (was inactive, now resumed) - STRONGEST indicator
      // OR: Student is active AND has old fees (from before today) - likely resume scenario
      // OR: All old fees are completed
      // OR: Student is active but has NO old fees AND has today's fees that are pending (resume scenario - old fees might be deleted/cleared)
      // Check if old fees are from more than 1 day ago (definite resume scenario)
      const oldestFee = oldFees.length > 0 ? oldFees.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] : null;
      const oldestFeeAge = oldestFee ? Date.now() - new Date(oldestFee.createdAt).getTime() : 0;
      const isOldFeeFromPast = oldestFeeAge > 24 * 60 * 60 * 1000; // More than 24 hours old
      
      // Check if today's fees are all pending (might be from a previous attempt that failed or was cleared)
      const allTodayFeesPending = todayFees.every(fee => fee.status === 'pending');
      
      // Resume scenario indicators:
      // 1. Student active + old completed fees (strongest)
      // 2. Student active + old fees from past (likely resume)
      // 3. All old fees completed
      // 4. Student active + no old fees + today's fees are all pending (resume scenario - old fees cleared/deleted)
      const isResumeFromInactive = isStudentActive && hasOldCompletedFees;
      const isResumeWithOldFees = isStudentActive && hasOldFees && isOldFeeFromPast; // Student active + old fees from past = resume
      const isResumeNoOldFees = isStudentActive && oldFees.length === 0 && allTodayFeesPending; // Active student with no old fees but pending today fees = likely resume
      const isResumeScenario = isResumeFromInactive || isResumeWithOldFees || (allOldFeesCompleted && oldFees.length > 0) || isResumeNoOldFees;
      
      // Allow if: (1) all today's fees are completed, OR (2) it's a resume scenario (old fees completed OR no old fees), OR (3) new student (no room)
      // IMPORTANT: For resume scenario, allow even if today's fees exist (student was inactive -> active, needs new fee)
      // DISABLED: Date restriction removed - user wants to allow multiple fee creation per day
      if (false && !allTodayFeesCompleted && !isResumeScenario && !isNewStudentScenario) {
        console.log('⚠️ Fee already created today for this student (and not all completed, not resume scenario, not new student)');
        console.log('   Today fees count:', todayFees.length);
        console.log('   All today fees completed:', allTodayFeesCompleted);
        console.log('   All today fees pending:', allTodayFeesPending);
        console.log('   Old fees count:', oldFees.length);
        console.log('   Has old completed fees:', hasOldCompletedFees);
        console.log('   Is resume from inactive:', isResumeFromInactive);
        console.log('   Is resume no old fees:', isResumeNoOldFees);
        console.log('   Is resume scenario:', isResumeScenario);
        console.log('   Old fees count:', oldFees.length);
        console.log('   All old fees completed:', allOldFeesCompleted);
        console.log('   Student status:', studentForCheck?.status);
        console.log('   Student has room:', !!studentForCheck?.roomNo);
        console.log('   Is resume scenario:', isResumeScenario);
        feeCreationLocks.delete(studentId);
        return res.status(400).json({
          success: false,
          message: 'Fee has already been created today for this student. Please refresh the page or check the ledger.'
        });
        } else {
          if (isResumeFromInactive) {
            console.log('✅ RESUME FROM INACTIVE detected (student active + old fees completed) - allowing new fee creation even with pending today fees');
            console.log('   Student status:', studentForCheck?.status);
            console.log('   Old fees completed:', allOldFeesCompleted);
            console.log('   Old fees count:', oldFees.length);
            console.log('   Today fees count:', todayFees.length);
          } else if (isResumeNoOldFees) {
            console.log('✅ RESUME NO OLD FEES detected (student active + no old fees + pending today fees) - allowing new fee creation');
            console.log('   Student status:', studentForCheck?.status);
            console.log('   Today fees count:', todayFees.length);
            console.log('   Old fees count:', oldFees.length);
          } else if (isResumeScenario) {
            console.log('✅ Resume scenario detected (old fees completed) - allowing new fee creation even with pending today fees');
            console.log('   Student status:', studentForCheck?.status);
            console.log('   Old fees completed:', allOldFeesCompleted);
            console.log('   Old fees count:', oldFees.length);
          } else if (isNewStudentScenario) {
            console.log('✅ New student scenario detected (no room) - allowing new fee creation even with pending today fees');
          } else {
            console.log('✅ Today fees are all completed - allowing new fee creation (resume scenario)');
          }
        }
    }
    
    // LAYER 4: Check for fees created in last 5 minutes (extra safety)
    // DISABLED: Date restriction removed - user wants to allow multiple fee creation per day
    // 5-minute check also disabled as per user request
    /*
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentFees = await Fee.find({ 
      student: studentId, 
      source: 'checklist_auto',
      createdAt: { $gte: fiveMinutesAgo }
    });
    
    if (recentFees.length > 0) {
      // Check if all recent fees are completed/paid (resume scenario)
      const allRecentFeesCompleted = recentFees.every(fee => 
        fee.status === 'paid' || 
        fee.status === 'partial' || 
        fee.status === 'checked_out' ||
        fee.status === 'refunded'
      );
      
      // If all recent fees are completed, allow new fee (resume scenario)
      if (!allRecentFeesCompleted) {
        console.log('⚠️ Fee created in last 5 minutes for this student (and not all completed)');
        feeCreationLocks.delete(studentId);
        return res.status(400).json({
          success: false,
          message: 'Fee was recently created for this student. Please wait a few minutes before creating another package.'
        });
      } else {
        console.log('✅ Recent fees are all completed - allowing new fee creation (resume scenario)');
      }
    }
    */
    console.log('✅ Date restrictions disabled - allowing fee creation regardless of date');
    
    // LAYER 5: Check for ANY existing checklist_auto fees - prevent duplicate creation
    // DISABLED: User wants to allow multiple fee creation - no restrictions
    // Date restriction removed - fees can be created multiple times regardless of existing fees
    /*
    const existingFees = await Fee.find({ student: studentId, source: 'checklist_auto' });
    
    if (existingFees.length > 0) {
      // Check if all existing fees are completed/paid (resume scenario)
      // If student was inactive and is resuming, old fees will be paid/completed
      const allFeesCompleted = existingFees.every(fee => 
        fee.status === 'paid' || 
        fee.status === 'partial' || 
        fee.status === 'checked_out' ||
        fee.status === 'refunded'
      );
      
      // Also check if the most recent fee is old (more than 1 day old) - indicates resume scenario
      const mostRecentFee = existingFees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const feeAge = Date.now() - new Date(mostRecentFee.createdAt).getTime();
      const isOldFee = feeAge > 24 * 60 * 60 * 1000; // More than 24 hours old
      
      // Check if student was previously inactive (resume scenario)
      // If student has old completed fees and is now active, it's a resume scenario
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const oldFees = existingFees.filter(fee => new Date(fee.createdAt) < todayStart);
      const allOldFeesCompleted = oldFees.length === 0 || oldFees.every(fee => 
        fee.status === 'paid' || 
        fee.status === 'partial' || 
        fee.status === 'checked_out' ||
        fee.status === 'refunded'
      );
      const hasOldCompletedFees = oldFees.length > 0 && allOldFeesCompleted;
      
      // Get student data for better decision making
      const student = await Student.findById(studentId);
      
      // Check if existing fees are all PENDING (not completed/paid)
      // If all fees are pending, it might be a duplicate creation attempt OR a new student
      const allFeesPending = existingFees.every(fee => fee.status === 'pending');
      const hasPendingFees = existingFees.some(fee => fee.status === 'pending');
      
      // CRITICAL: Check if student is ACTIVE and has OLD completed fees (resume scenario)
      // This is the key scenario: Student was inactive -> now active -> needs new fee
      const isStudentActive = student?.status === 'active';
      const isResumeFromInactive = isStudentActive && hasOldCompletedFees;
      
      // Allow new fee creation if:
      // 1. All existing fees are completed/paid (resume scenario), OR
      // 2. Most recent fee is old (more than 1 day), OR
      // 3. Student status is active but has no active room (resume scenario - room not allocated yet), OR
      // 4. Student is active AND has old completed fees (CRITICAL: resume from inactive), OR
      // 5. All existing fees are pending AND student has no room (new student scenario - allow override)
      const isResumeScenario = allFeesCompleted || isOldFee || (student?.status === 'active' && !student?.roomNo) || isResumeFromInactive || hasOldCompletedFees;
      const isNewStudentScenario = allFeesPending && !student?.roomNo && (student?.status === 'active' || student?.status === 'registered');
      
      if (!isResumeScenario && !isNewStudentScenario) {
        console.log('⚠️ Fee already exists for this student');
        console.log('   Existing fees count:', existingFees.length);
        console.log('   Most recent fee created:', mostRecentFee?.createdAt);
        console.log('   Most recent fee status:', mostRecentFee?.status);
        console.log('   All fees completed:', allFeesCompleted);
        console.log('   All fees pending:', allFeesPending);
        console.log('   Has pending fees:', hasPendingFees);
        console.log('   Is old fee:', isOldFee);
        console.log('   Student status:', student?.status);
        console.log('   Student has room:', !!student?.roomNo);
        console.log('   Has old completed fees:', hasOldCompletedFees);
        console.log('   Is resume from inactive:', isResumeFromInactive);
        
        feeCreationLocks.delete(studentId);
        return res.status(400).json({
          success: false,
          message: 'Fee has already been created for this student. Please check the ledger. Opening Post Approval again will not create a new fee.',
          existingFee: {
            id: existingFees[0]._id,
            createdAt: existingFees[0].createdAt,
            packageType: existingFees[0].packageType,
            status: existingFees[0].status
          }
        });
      } else {
        if (isResumeFromInactive) {
          console.log('✅ RESUME FROM INACTIVE detected - allowing fee creation (student active + old fees completed)');
        } else if (isNewStudentScenario) {
          console.log('✅ New student scenario detected - allowing fee creation (all fees pending, no room)');
        } else {
          console.log('✅ Resume scenario detected - allowing new fee creation');
        }
        console.log('   Existing fees count:', existingFees.length);
        console.log('   All fees completed:', allFeesCompleted);
        console.log('   All fees pending:', allFeesPending);
        console.log('   Is old fee:', isOldFee);
        console.log('   Student status:', student?.status);
        console.log('   Student has room:', !!student?.roomNo);
        console.log('   Has old completed fees:', hasOldCompletedFees);
        console.log('   Is resume from inactive:', isResumeFromInactive);
      }
    }
    */
    console.log('✅ LAYER 5 restriction disabled - allowing fee creation regardless of existing fees');
    
    // Still need to get existingFees for ledger cleanup logic below
    const existingFees = await Fee.find({ student: studentId, source: 'checklist_auto' });
    
    // Only proceed if no existing fees found
    // This ensures fee is created only once per student
    // Note: LedgerEntry already required above for deposit check
    let deletedLedgerCount = 0;
    
    // Only delete ledger entries if there are orphaned entries (no fees but ledger entries exist)
    // This handles edge cases where ledger entries exist but fees were deleted
    const existingLedgerEntries = await LedgerEntry.find({ student: studentId });
    if (existingLedgerEntries.length > 0 && existingFees.length === 0) {
      console.log('⚠️ Found orphaned ledger entries (no fees), cleaning up:', existingLedgerEntries.length);
      const deletedLedger = await LedgerEntry.deleteMany({ student: studentId });
      deletedLedgerCount = deletedLedger.deletedCount;
      console.log('🗑️ Deleted orphaned ledger entries:', deletedLedgerCount);
    }

    // Calculate total amounts for the package
    const totalRentAmount = rentPerMonth * months;
    const totalMessAmount = messPerMonth * months;
    const totalAmount = totalRentAmount + totalMessAmount + depositAmount;

    // Get bed information
    let bedLabel = null;
    if (student.roomNo && student.roomNo.beds) {
      const studentBed = student.roomNo.beds.find(bed => 
        bed.studentId && bed.studentId.toString() === student._id.toString()
      );
      if (studentBed) {
        bedLabel = studentBed.bedLabel;
      }
    }

    // Create ONE fee entry with total package amount
    // This will be displayed month-wise in the ledger
    const packageFee = await Fee.create({
      student: studentId,
      feeType: 'hostel',
      amount: totalAmount,
      dueDate: dueDateValue,
      semester,
      year,
      status: 'pending',
      messProvider,
      packageType,
      rentAmount: totalRentAmount,
      messAmount: totalMessAmount,
      depositAmount: depositAmount,
      // Save room details for history
      roomNumber: student.roomNo.roomNo,
      bedLabel: bedLabel,
      roomType: student.roomNo.type, // single, double, triple, quadruple
      remarks: remarks || `Package Fee (${packageType}) - ${months} Month${months > 1 ? 's' : ''} - Auto-generated from Post Approval Checklist`,
      youstelAmount: totalRentAmount + depositAmount, // Rent + Deposit goes to Youstel
      hufAmount: totalMessAmount, // Mess goes to HUF
      source: 'checklist_auto',
      createdBy: req.user?.id
    });

    const createdFees = [packageFee];

    // Create ledger entries for COLLECTED amounts (payments made) with GV vouchers
    // LedgerEntry already required above for duplicate check
    const collectionPlan = req.body.collectionPlan || {};
    
    // Get collected amounts (payments made)
    const collectHostelAmt = collectionPlan.collectHostel ? Number(collectionPlan.hostelAmount || 0) : 0;
    const collectMessAmt = collectionPlan.collectMess ? Number(collectionPlan.messAmount || 0) : 0;
    const collectDepositAmt = collectionPlan.collectDeposit ? Number(collectionPlan.depositAmount || 0) : 0;
    const totalCollected = collectHostelAmt + collectMessAmt + collectDepositAmt;
    
    console.log('💰 Collection Plan:', {
      hostelCollected: collectHostelAmt,
      messCollected: collectMessAmt,
      depositCollected: collectDepositAmt,
      totalCollected
    });
    
    // Create ledger entries for COLLECTED amounts (these are payments made, not dues)
    const ledgerEntries = [];
    
    // Hostel (Youstel) Payment Entry - for amount COLLECTED
    if (collectHostelAmt > 0) {
      const hostelVoucher = collectionPlan.hostelVoucher || `GV-Hostel-${packageFee._id.toString().slice(-6)}`;
      ledgerEntries.push({
        student: studentId,
        date: collectionPlan.hostelDate ? new Date(collectionPlan.hostelDate) : dueDateValue,
        type: 'Payment',
        description: `Hostel (Youstel) Payment - ${packageType.replace('months', ' Months').replace('month', ' Month')} Package - GV: ${hostelVoucher}`,
        account: 'Youstel',
        amount: collectHostelAmt,
        voucher: hostelVoucher,
        paymentMethod: collectionPlan.hostelMode || 'online',
        createdBy: req.user?.id
      });
    }
    
    // Mess (HUF) Payment Entry - for amount COLLECTED
    if (collectMessAmt > 0) {
      const messVoucher = collectionPlan.messVoucher || `GV-Mess-${packageFee._id.toString().slice(-6)}`;
      ledgerEntries.push({
        student: studentId,
        date: collectionPlan.messDate ? new Date(collectionPlan.messDate) : dueDateValue,
        type: 'Payment',
        description: `Mess (HUF) Payment - ${packageType.replace('months', ' Months').replace('month', ' Month')} Package - GV: ${messVoucher}`,
        account: 'HUF',
        amount: collectMessAmt,
        voucher: messVoucher,
        paymentMethod: collectionPlan.messMode || 'online',
        createdBy: req.user?.id
      });
    }
    
    // Deposit (Youstel) Payment Entry - for amount COLLECTED
    if (collectDepositAmt > 0) {
      const depositVoucher = collectionPlan.depositVoucher || `GV-Deposit-${packageFee._id.toString().slice(-6)}`;
      ledgerEntries.push({
        student: studentId,
        date: collectionPlan.depositDate ? new Date(collectionPlan.depositDate) : dueDateValue,
        type: 'Payment',
        description: `Deposit (Youstel) Payment - ${packageType.replace('months', ' Months').replace('month', ' Month')} Package - GV: ${depositVoucher}`,
        account: 'Youstel',
        amount: collectDepositAmt,
        voucher: depositVoucher,
        paymentMethod: collectionPlan.depositMode || 'cash',
        createdBy: req.user?.id
      });
    }
    
    // Create all ledger entries
    if (ledgerEntries.length > 0) {
      try {
        console.log('📝 Creating ledger entries:', ledgerEntries.length);
        console.log('📝 Ledger entries:', JSON.stringify(ledgerEntries, null, 2));
        const createdEntries = await LedgerEntry.insertMany(ledgerEntries);
        console.log('✅ Ledger entries created:', createdEntries.length);
        console.log('✅ Created entry IDs:', createdEntries.map(e => e._id.toString()));
        
        // Verify entries were saved
        const verifyCount = await LedgerEntry.countDocuments({ student: studentId });
        console.log('✅ Total ledger entries for student:', verifyCount);
      } catch (ledgerError) {
        console.error('❌ Error creating ledger entries:', ledgerError);
        console.error('❌ Error details:', ledgerError.message);
        console.error('❌ Error stack:', ledgerError.stack);
        // Don't fail fee creation if ledger entry creation fails
      }
    } else {
      console.log('⚠️ No ledger entries to create (all amounts collected or zero due)');
    }
    
    // Update student's pending fees information AND admissionUpToDate
    try {
      const feeController = require('./feeController');
      // updateStudentPendingFees is a local function, so we'll update manually
      const allFees = await Fee.find({ student: studentId });
      const pendingFees = allFees.filter(f => f.status === 'pending' || f.status === 'overdue');
      const totalPendingAmount = pendingFees.reduce((sum, f) => sum + f.amount, 0);
      
      // Calculate admissionUpToDate: enrollmentDate + packageMonths (last day of target month)
      // CRITICAL: Use enrollmentDate (actual admission date), NOT dueDate or fee.createdAt
      let admissionUpToDate = null;
      
      // Use robust date calculator
      const { calculateAdmissionUpToDate, getAdmissionDate } = require('../utils/dateCalculator');
      
      // Get admission date with proper fallback logic
      const actualEnrollmentDate = getAdmissionDate(student, null);
      
      if (actualEnrollmentDate && !isNaN(actualEnrollmentDate.getTime())) {
        // Calculate admissionUpToDate using robust calculator
        admissionUpToDate = calculateAdmissionUpToDate(actualEnrollmentDate, months);
        
        if (admissionUpToDate) {
          const startYear = actualEnrollmentDate.getFullYear();
          const startMonth = actualEnrollmentDate.getMonth();
          const startDay = actualEnrollmentDate.getDate();
          const targetYear = admissionUpToDate.getFullYear();
          const targetMonth = admissionUpToDate.getMonth();
          const targetDay = admissionUpToDate.getDate();
          
          console.log(`\n📅 ===== CALCULATING admissionUpToDate DURING FEE CREATION =====`);
          console.log(`   Student enrollmentDate: ${actualEnrollmentDate.toISOString().split('T')[0]} (${startDay}/${startMonth + 1}/${startYear})`);
          console.log(`   Package months: ${months} (from packageType: ${packageType})`);
          console.log(`   Old student.admissionMonths: ${student.admissionMonths || 'not set'}`);
          console.log(`   Calculation: ${startMonth + 1}/${startYear} + ${months} months`);
          console.log(`   ✅ NEW admissionUpToDate: ${admissionUpToDate.toISOString().split('T')[0]} (${targetDay}/${targetMonth + 1}/${targetYear})`);
          console.log(`   ✅ Handles: 31/30/28/29 day months automatically`);
          console.log(`📅 ===== END FEE CREATION CALCULATION =====\n`);
        } else {
          console.log(`⚠️ Failed to calculate admissionUpToDate`);
        }
      } else {
        console.log(`⚠️ No valid enrollmentDate available, cannot calculate admissionUpToDate`);
      }
      
      // Update enrollmentDate if not set (use dueDateValue as enrollment date)
      // But DON'T overwrite if it's already set (preserve original admission date)
      const updateData = {
        hasPendingFees: pendingFees.length > 0,
        totalPendingAmount,
        pendingFeesFrom: pendingFees.length > 0 ? pendingFees[0].dueDate : null,
        pendingFeesUntil: pendingFees.length > 0 ? pendingFees[pendingFees.length - 1].dueDate : null,
        admissionMonths: months // Store package months for reference
      };
      
      // Only update enrollmentDate if not already set
      if (!student.enrollmentDate && dueDateValue) {
        updateData.enrollmentDate = dueDateValue;
        console.log(`📅 Setting enrollmentDate from dueDateValue: ${dueDateValue.toISOString().split('T')[0]}`);
      }
      
      // ALWAYS update admissionUpToDate (recalculate based on enrollmentDate + months)
      // This ensures it's always correct, even if student.enrollmentDate was updated
      // CRITICAL: Always recalculate to fix any previous wrong values
      if (admissionUpToDate) {
        updateData.admissionUpToDate = admissionUpToDate;
        updateData.admissionMonths = months; // Always update to current package months
        console.log(`📅 Setting admissionUpToDate: ${admissionUpToDate.toISOString().split('T')[0]}`);
        console.log(`📅 Setting admissionMonths: ${months} (from packageType: ${packageType})`);
      } else {
        console.log(`⚠️ admissionUpToDate not calculated - enrollmentDate might be missing`);
      }
      
      await Student.findByIdAndUpdate(studentId, updateData);
      
      console.log(`✅ Updated student fields for ${studentId}:`);
      console.log(`   enrollmentDate: ${updateData.enrollmentDate ? updateData.enrollmentDate.toISOString().split('T')[0] : (student.enrollmentDate ? new Date(student.enrollmentDate).toISOString().split('T')[0] : 'not set')}`);
      console.log(`   admissionUpToDate: ${admissionUpToDate ? admissionUpToDate.toISOString().split('T')[0] : 'not calculated'}`);
      console.log(`   admissionMonths: ${months}`);
      
      console.log(`✅ Updated student admissionUpToDate: ${admissionUpToDate ? admissionUpToDate.toISOString().split('T')[0] : 'not set'}`);
    } catch (updateError) {
      console.error('Error updating student pending fees:', updateError);
      // Don't fail the request if this update fails
    }

    res.status(200).json({ 
      success: true, 
      data: packageFee,
      ledgerEntriesCreated: ledgerEntries.length,
      deletedEntries: {
        fees: 0, // No fees deleted - fee creation prevented if exists
        ledger: deletedLedgerCount // Only orphaned ledger entries deleted (if any)
      },
      collectionSummary: {
        hostelCollected: collectHostelAmt,
        messCollected: collectMessAmt,
        depositCollected: collectDepositAmt,
        totalCollected
      }
    });
  } catch (error) {
    console.error('Checklist fee auto-create error:', error);
    // Clean up lock on error
    feeCreationLocks.delete(studentId);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to auto-create checklist fee.'
    });
  } finally {
    // Clean up lock after successful completion (with delay to prevent rapid re-submission)
    setTimeout(() => {
      feeCreationLocks.delete(studentId);
      console.log(`✅ Lock released for student ${studentId}`);
    }, 2000); // 2 second delay before allowing next request
  }
};
// @desc    Delete a specific ledger entry (GV entry)
// @route   DELETE /api/students/:id/ledger/entries/:entryId
// @access  Private (Admin/Accountant/Warden)
exports.deleteLedgerEntry = async (req, res) => {
  try {
    const LedgerEntry = require('../models/LedgerEntry');
    const { id: studentId, entryId } = req.params;

    console.log(`🗑️ Delete GV Entry Request - Student: ${studentId}, Entry: ${entryId}`);

    // Find the entry
    const entry = await LedgerEntry.findOne({
      _id: entryId,
      student: studentId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Ledger entry not found'
      });
    }

    console.log(`📋 Entry to delete:`, {
      id: entry._id,
      amount: entry.amount,
      account: entry.account,
      voucher: entry.voucher,
      date: entry.date
    });

    // Delete the entry
    await LedgerEntry.findByIdAndDelete(entryId);

    console.log(`✅ GV Entry deleted successfully`);

    res.status(200).json({
      success: true,
      message: 'GV entry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete GV Entry Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete GV entry'
    });
  }
};

// @desc    Shift a ledger entry between accounts (HUF ↔ Youstel)
// @route   PUT /api/students/:id/ledger/entries/:entryId/shift
// @access  Private (Admin/Accountant/Warden)
exports.shiftLedgerEntry = async (req, res) => {
  try {
    const LedgerEntry = require('../models/LedgerEntry');
    const { id: studentId, entryId } = req.params;
    const { targetAccount } = req.body;

    console.log(`🔄 Shift GV Entry Request - Student: ${studentId}, Entry: ${entryId}, Target: ${targetAccount}`);

    // Validate target account
    if (!['HUF', 'Youstel'].includes(targetAccount)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target account. Must be HUF or Youstel'
      });
    }

    // Find the entry
    const entry = await LedgerEntry.findOne({
      _id: entryId,
      student: studentId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Ledger entry not found'
      });
    }

    const originalAccount = entry.account;
    
    // Don't shift if already in target account
    if (originalAccount === targetAccount) {
      return res.status(400).json({
        success: false,
        message: `Entry is already in ${targetAccount} account`
      });
    }

    console.log(`📋 Entry to shift:`, {
      id: entry._id,
      amount: entry.amount,
      from: originalAccount,
      to: targetAccount,
      voucher: entry.voucher
    });

    // Update the entry
    const updatedEntry = await LedgerEntry.findByIdAndUpdate(
      entryId,
      {
        account: targetAccount,
        description: `${entry.description} (Shifted from ${originalAccount} to ${targetAccount})`,
        voucher: entry.voucher ? `${entry.voucher}-Shift` : `GV-Shift-${Date.now()}`
      },
      { new: true }
    );

    console.log(`✅ GV Entry shifted successfully from ${originalAccount} to ${targetAccount}`);

    res.status(200).json({
      success: true,
      message: `GV entry shifted from ${originalAccount} to ${targetAccount}`,
      data: updatedEntry
    });

  } catch (error) {
    console.error('❌ Shift GV Entry Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to shift GV entry'
    });
  }
};