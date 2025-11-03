const Student = require('../models/Student');
const User = require('../models/User');

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
    await User.create({
      email: req.body.email.trim().toLowerCase(),
      password: req.body.password || 'student123',
      role: 'student',
      studentId: student._id
    });

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
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

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

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Also delete user account
    await User.findOneAndDelete({ studentId: student._id });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
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
    const fees = await Fee.find({ student: req.params.id }).sort('dueDate');

    // Create complete ledger with payment entries
    const completeLedger = [];
    fees.forEach(fee => {
      // Add fee entry (but skip if it's already a refund entry with status 'refunded')
      if (!(fee.status === 'refunded' && fee.feeType === 'other')) {
        const semesterInfo = fee.semester ? ` - Semester ${fee.semester}` : '';
        const yearInfo = fee.year ? `, Year ${fee.year}` : '';
        completeLedger.push({
          _id: fee._id + '_fee',
          date: fee.dueDate,
          type: 'Fee',
          description: `${fee.feeType.charAt(0).toUpperCase() + fee.feeType.slice(1)} Fee${semesterInfo}${yearInfo}`,
          debit: fee.amount,
          credit: 0,
          status: fee.status,
          paidDate: fee.paidDate || null,
          transactionId: fee.transactionId || null,
          paymentMethod: fee.paymentMethod || null,
          semester: fee.semester || null,
          year: fee.year || null,
          feeId: fee._id
        });
      }

      // Add payment entry if paid
      if (fee.status === 'paid' && fee.paidDate) {
        completeLedger.push({
          _id: fee._id + '_payment',
          date: fee.paidDate,
          type: 'Payment',
          description: `Payment for ${fee.feeType} fee via ${fee.paymentMethod || 'N/A'}`,
          debit: 0,
          credit: fee.amount,
          status: 'paid',
          transactionId: fee.transactionId,
          paymentMethod: fee.paymentMethod,
          feeId: fee._id
        });
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

    // Calculate summary
    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
    const totalPending = fees.filter(f => f.status !== 'paid').reduce((sum, fee) => sum + fee.amount, 0);
    
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
      totalTransactions: completeLedger.length
    };

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
          roomNo: student.roomNo,
          enrollmentDate: student.enrollmentDate
        },
        ledger: completeLedger,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
