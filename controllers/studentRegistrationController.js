const StudentRegistration = require('../models/StudentRegistration');
const Student = require('../models/Student');
const User = require('../models/User');
const QRCode = require('qrcode');
const Room = require('../models/Room');
const LedgerEntry = require('../models/LedgerEntry');

const getRoomPreferenceFilters = (preferredRoomType = '') => {
  const map = {
    '2-sharing-ac': { type: 'double', isAC: true },
    '2-sharing-non-ac': { type: 'double', isAC: false },
    '4-sharing': { type: 'quadruple' },
    'single-sharing': { type: 'single' }
  };
  return map[preferredRoomType] || {};
};

// @desc    Submit student registration (Public)
// @route   POST /api/student-registration
// @access  Public
exports.submitRegistration = async (req, res) => {
  try {
    // Validate required fields
    const { firstName, lastName, email, phone, dateOfBirth, guardianName, guardianPhone, guardianRelation } = req.body;
    
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
    if (!phone || (typeof phone === 'string' && phone.trim() === '')) {
      missingFields.push('phone');
    }
    if (!guardianName || (typeof guardianName === 'string' && guardianName.trim() === '')) {
      missingFields.push('guardianName');
    }
    if (!guardianPhone || (typeof guardianPhone === 'string' && guardianPhone.trim() === '')) {
      missingFields.push('guardianPhone');
    }
    if (!guardianRelation || (typeof guardianRelation === 'string' && guardianRelation.trim() === '')) {
      missingFields.push('guardianRelation');
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

    // Validate phone format
    const phoneRegex = /^[0-9]{10,}$/;
    if (!phoneRegex.test(phone.trim().replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please enter a valid phone number (minimum 10 digits).'
      });
    }

    // Check if email already exists in pending registrations
    const existingPending = await StudentRegistration.findOne({ 
      email: email.trim().toLowerCase(),
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a registration request. Please wait for admin approval.'
      });
    }

    // Check if email already exists in students
    const existingStudent = await Student.findOne({ email: email.trim().toLowerCase() });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'A student with this email already exists in the system.'
      });
    }

    // Generate Student ID immediately at registration
    const studentIdPrefix = 'STU';
    const year = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    let generatedStudentId = `${studentIdPrefix}${year}${randomNum}`;

    // Check if studentId already exists (in Student or StudentRegistration)
    let exists = await Student.findOne({ studentId: generatedStudentId }) || 
                 await StudentRegistration.findOne({ studentId: generatedStudentId });
    while (exists) {
      const newRandomNum = Math.floor(1000 + Math.random() * 9000);
      generatedStudentId = `${studentIdPrefix}${year}${newRandomNum}`;
      exists = await Student.findOne({ studentId: generatedStudentId }) || 
               await StudentRegistration.findOne({ studentId: generatedStudentId });
    }

    // Generate QR Code with Student ID
    const registrationData = {
      studentId: generatedStudentId,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email.trim().toLowerCase(),
      phone: req.body.phone,
      submittedAt: new Date()
    };
    
    let qrCodeDataURL = '';
    try {
      qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(registrationData));
    } catch (qrError) {
      console.error('QR Code generation error:', qrError);
    }

    // Set default values and ensure all fields are properly set
    const registrationPayload = {
      ...req.body,
      studentId: generatedStudentId, // Auto-generated Student ID
      email: req.body.email.trim().toLowerCase(),
      gender: req.body.gender || 'female',
      preferredRoomType: req.body.preferredRoomType || '2-sharing-ac',
      advanceAmount: req.body.advanceAmount || (req.body.payAdvance ? 10000 : 0),
      admissionDate: req.body.admissionDate ? new Date(req.body.admissionDate) : new Date(),
      admissionUpToDate: req.body.admissionUpToDate ? new Date(req.body.admissionUpToDate) : undefined,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : new Date(), // Default to today if not provided
      qrCode: qrCodeDataURL,
      profilePhoto: req.body.profilePhoto || undefined,
      previousEducationDetails: req.body.previousEducationDetails || undefined,
      status: 'pending'
    };

    // Create registration
    console.log('📝 Creating registration with payload:', {
      studentId: registrationPayload.studentId,
      email: registrationPayload.email,
      status: registrationPayload.status,
      firstName: registrationPayload.firstName,
      lastName: registrationPayload.lastName,
      advanceAmount: registrationPayload.advanceAmount
    });
    
    const registration = await StudentRegistration.create(registrationPayload);
    
    console.log('✅ Registration created successfully:', {
      _id: registration._id,
      studentId: registration.studentId,
      email: registration.email,
      status: registration.status
    });

    // If advance deposit (₹10,000) is paid, create student immediately and add deposit ledger entry
    let createdStudent = null;
    if (registration.advanceAmount && registration.advanceAmount > 0) {
      try {
        console.log('💰 Advance deposit paid - Creating student and deposit ledger entry...');
        
        // Create student immediately with status 'registered' (not active yet)
        const studentData = {
          studentId: registration.studentId,
          firstName: registration.firstName,
          middleName: registration.middleName || undefined,
          lastName: registration.lastName,
          email: registration.email,
          phone: registration.phone,
          dateOfBirth: registration.dateOfBirth,
          gender: registration.gender || 'female',
          bloodGroup: registration.bloodGroup || undefined,
          religion: registration.religion || undefined,
          caste: registration.caste || undefined,
          aadharNumber: registration.aadharNumber || undefined,
          address: registration.address || undefined,
          institute: registration.institute || undefined,
          department: registration.department || undefined,
          previousEducationDetails: registration.previousEducationDetails || undefined,
          course: registration.course || undefined,
          year: registration.year || 1,
          semester: registration.semester || 1,
          guardianName: registration.guardianName,
          guardianLocalName: registration.guardianLocalName || undefined,
          guardianPhone: registration.guardianPhone,
          guardianRelation: registration.guardianRelation,
          guardianEmail: registration.guardianEmail || undefined,
          motherName: registration.motherName || undefined,
          fatherName: registration.fatherName || undefined,
          motherMobileNumber: registration.motherMobileNumber || undefined,
          fatherMobileNumber: registration.fatherMobileNumber || undefined,
          guardianLocalArea: registration.guardianLocalArea || undefined,
          enrollmentDate: registration.admissionDate || new Date(), // CRITICAL: Use admissionDate from registration
          admissionUpToDate: registration.admissionUpToDate || undefined,
          admissionMonths: registration.admissionMonths || undefined,
          profilePhoto: registration.profilePhoto || undefined,
          status: 'registered' // Status: registered (not active yet, waiting for admission date)
        };

        createdStudent = await Student.create(studentData);
        console.log(`✅ Student created immediately: ${registration.studentId} | Status: registered | Admission Date: ${registration.admissionDate}`);

        // Create deposit ledger entry immediately
        await LedgerEntry.create({
          student: createdStudent._id,
          date: new Date(), // Date when registration form was submitted
          amount: registration.advanceAmount,
          account: 'Youstel', // Deposit goes to Youstel account
          description: `Advance Deposit - Registration Payment (₹${registration.advanceAmount.toLocaleString('en-IN')})`,
          voucher: `DEP-${registration.studentId}-${Date.now()}`,
          paymentMethod: 'online', // Assuming online payment during registration
          type: 'Payment'
        });
        console.log(`✅ Deposit ledger entry created: ₹${registration.advanceAmount} for student ${registration.studentId}`);

        // Create user account for student
        try {
          await User.create({
            email: registration.email,
            password: 'student123', // Default password
            role: 'student',
            studentId: createdStudent._id
          });
          console.log(`✅ User account created for ${registration.email}`);
        } catch (userError) {
          console.error('⚠️ Error creating user account (non-critical):', userError);
          // Continue even if user creation fails
        }

      } catch (studentError) {
        console.error('❌ Error creating student/deposit entry:', studentError);
        // If student creation fails, registration still succeeds
        // Admin can approve later and create student manually
      }
    }

    res.status(201).json({
      success: true,
      message: registration.advanceAmount > 0 
        ? 'Registration submitted successfully! Student created and deposit recorded in ledger.'
        : 'Registration submitted successfully! Your request is pending admin approval.',
      data: {
        ...registration.toObject(),
        studentCreated: createdStudent ? true : false,
        studentId: createdStudent ? createdStudent._id : null
      }
    });
  } catch (error) {
    console.error('Submit registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while submitting registration. Please try again.' 
    });
  }
};

// @desc    Get all pending registrations
// @route   GET /api/student-registration/pending
// @access  Private (Admin/Warden)
exports.getPendingRegistrations = async (req, res) => {
  try {
    console.log('📋 getPendingRegistrations called');
    console.log('   User:', req.user?.email || 'Unknown');
    console.log('   URL:', req.originalUrl);
    console.log('   Method:', req.method);
    
    // First, check total registrations in database
    const totalRegistrations = await StudentRegistration.countDocuments();
    console.log(`📊 Total registrations in database: ${totalRegistrations}`);
    
    // Check registrations by status
    const pendingCount = await StudentRegistration.countDocuments({ status: 'pending' });
    const approvedCount = await StudentRegistration.countDocuments({ status: 'approved' });
    const rejectedCount = await StudentRegistration.countDocuments({ status: 'rejected' });
    console.log(`📊 Status breakdown - Pending: ${pendingCount}, Approved: ${approvedCount}, Rejected: ${rejectedCount}`);
    
    const registrations = await StudentRegistration.find({ status: 'pending' })
      .sort({ submittedAt: -1 })
      .populate('reviewedBy', 'email firstName lastName');

    console.log(`✅ Found ${registrations.length} pending registrations`);
    if (registrations.length > 0) {
      console.log('📋 Pending registrations:', registrations.map(r => ({
        _id: r._id,
        studentId: r.studentId,
        email: r.email,
        name: `${r.firstName} ${r.lastName}`,
        status: r.status,
        submittedAt: r.submittedAt
      })));
    }
    
    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('❌ Error in getPendingRegistrations:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch pending registrations',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get all registrations (pending, approved, rejected)
// @route   GET /api/student-registration
// @access  Private (Admin/Warden)
exports.getAllRegistrations = async (req, res) => {
  try {
    console.log('📋 getAllRegistrations called with query:', req.query);
    const { status } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }

    // Debug: Check total registrations
    const totalCount = await StudentRegistration.countDocuments();
    console.log(`📊 Total registrations in database: ${totalCount}`);
    
    // Debug: Check by status
    const pendingCount = await StudentRegistration.countDocuments({ status: 'pending' });
    const approvedCount = await StudentRegistration.countDocuments({ status: 'approved' });
    const rejectedCount = await StudentRegistration.countDocuments({ status: 'rejected' });
    console.log(`📊 Status breakdown - Pending: ${pendingCount}, Approved: ${approvedCount}, Rejected: ${rejectedCount}`);

    const registrations = await StudentRegistration.find(query)
      .sort({ submittedAt: -1 })
      .populate('reviewedBy', 'email firstName lastName');

    console.log(`✅ Found ${registrations.length} registrations matching query`);
    if (registrations.length > 0) {
      console.log('📋 Sample registrations:', registrations.slice(0, 3).map(r => ({
        _id: r._id,
        studentId: r.studentId,
        email: r.email,
        name: `${r.firstName} ${r.lastName}`,
        status: r.status,
        submittedAt: r.submittedAt
      })));
    }

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('❌ Error in getAllRegistrations:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch registrations',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get single registration
// @route   GET /api/student-registration/:id
// @access  Private (Admin/Warden)
exports.getRegistration = async (req, res) => {
  try {
    const registration = await StudentRegistration.findById(req.params.id)
      .populate('reviewedBy', 'email firstName lastName');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve student registration
// @route   POST /api/student-registration/:id/approve
// @access  Private (Admin/Warden)
exports.approveRegistration = async (req, res) => {
  try {
    const registration = await StudentRegistration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Registration is already ${registration.status}. Cannot approve.`
      });
    }

    // Use the Student ID that was generated during registration
    let finalStudentId = registration.studentId;
    
    if (!finalStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Registration does not have a Student ID. Please contact admin.'
      });
    }

    // Check if student already exists (created during registration submit with deposit)
    let student = await Student.findOne({ 
      $or: [
        { email: registration.email },
        { studentId: finalStudentId }
      ]
    });

    if (student) {
      // Student already exists (created during registration with deposit)
      console.log(`✅ Student already exists: ${finalStudentId} | Status: ${student.status}`);
      
      // Update student status from 'registered' to 'active'
      if (student.status === 'registered') {
        student.status = 'active';
      }
      
      // CRITICAL: Update enrollmentDate from registration if not set or if registration has admissionDate
      if (registration.admissionDate) {
        const regAdmissionDate = new Date(registration.admissionDate);
        if (!student.enrollmentDate || 
            (student.enrollmentDate && new Date(student.enrollmentDate).getTime() !== regAdmissionDate.getTime())) {
          student.enrollmentDate = regAdmissionDate;
          console.log(`📅 Updated enrollmentDate from registration: ${regAdmissionDate.toISOString().split('T')[0]}`);
        }
      }
      
      // Update admissionMonths if provided in registration
      if (registration.admissionMonths) {
        student.admissionMonths = registration.admissionMonths;
      }
      
      await student.save();
      console.log(`✅ Student updated: registered → active | Enrollment Date: ${student.enrollmentDate}`);
      
      // Don't create duplicate deposit entry (already created during registration submit)
      console.log(`ℹ️ Deposit entry already exists (created during registration), skipping duplicate creation.`);
    } else {
      // Student doesn't exist, create new student
      // Check if studentId already exists in Student collection
      const existingStudentId = await Student.findOne({ studentId: finalStudentId });
      if (existingStudentId) {
        // Generate a new one if somehow it exists
        const studentIdPrefix = 'STU';
        const year = new Date().getFullYear().toString().slice(-2);
        let exists = true;
        while (exists) {
          const newRandomNum = Math.floor(1000 + Math.random() * 9000);
          finalStudentId = `${studentIdPrefix}${year}${newRandomNum}`;
          exists = await Student.findOne({ studentId: finalStudentId });
        }
      }

      // Create student from registration data - Include ALL fields
      const studentData = {
        studentId: finalStudentId,
        firstName: registration.firstName,
        middleName: registration.middleName || undefined,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        dateOfBirth: registration.dateOfBirth,
        gender: registration.gender || 'female',
        bloodGroup: registration.bloodGroup || undefined,
        religion: registration.religion || undefined,
        caste: registration.caste || undefined,
        aadharNumber: registration.aadharNumber || undefined,
        address: registration.address || undefined,
        institute: registration.institute || undefined,
        department: registration.department || undefined,
        previousEducationDetails: registration.previousEducationDetails || undefined,
        course: registration.course || undefined,
        year: registration.year || 1,
        semester: registration.semester || 1,
        guardianName: registration.guardianName,
        guardianLocalName: registration.guardianLocalName || undefined,
        guardianPhone: registration.guardianPhone,
        guardianRelation: registration.guardianRelation,
        guardianEmail: registration.guardianEmail || undefined,
        motherName: registration.motherName || undefined,
        fatherName: registration.fatherName || undefined,
        motherMobileNumber: registration.motherMobileNumber || undefined,
        fatherMobileNumber: registration.fatherMobileNumber || undefined,
        guardianLocalArea: registration.guardianLocalArea || undefined,
        enrollmentDate: registration.admissionDate || new Date(),
        admissionUpToDate: registration.admissionUpToDate || undefined,
        admissionMonths: registration.admissionMonths || undefined,
        profilePhoto: registration.profilePhoto || undefined,
        status: 'active'
      };

      student = await Student.create(studentData);
      console.log(`✅ Student created: ${finalStudentId} | Admission Date: ${registration.admissionDate}`);

      // Create ledger entry for advance amount paid during registration (only if not already created)
      // Check if deposit entry already exists
      const existingDeposit = await LedgerEntry.findOne({
        student: student._id,
        description: { $regex: /Advance Deposit|Deposit|Registration Payment/i },
        amount: registration.advanceAmount || 10000
      });

      if (!existingDeposit && registration.advanceAmount && registration.advanceAmount > 0) {
        await LedgerEntry.create({
          student: student._id,
          date: registration.admissionDate || new Date(),
          amount: registration.advanceAmount,
          account: 'Youstel', // Deposit goes to Youstel account
          description: `Advance/Booking Amount - Deposit (Paid during registration)`,
          voucher: `ADV-${finalStudentId}`,
          paymentMethod: 'online', // Assuming online payment during registration
          type: 'Payment'
        });
        console.log(`✅ Created advance deposit ledger entry: ₹${registration.advanceAmount} for student ${finalStudentId}`);
      } else if (existingDeposit) {
        console.log(`ℹ️ Deposit entry already exists, skipping duplicate creation.`);
      }
    }

    // Note: Monthly fees (hostel/mess) will be created later from Post Approval Checklist
    // when admin clicks "Create Fee" button after room allocation
    const createdFees = [];

    // Create user account for student
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: registration.email });
      if (existingUser) {
        // If user exists but doesn't have studentId, update it
        if (!existingUser.studentId) {
          existingUser.studentId = student._id;
          await existingUser.save();
        }
      } else {
        // Create new user with default password
        await User.create({
          email: registration.email,
          password: 'student123', // Default password
          role: 'student',
          studentId: student._id
        });
      }
    } catch (userError) {
      console.error('Error creating user account:', userError);
      // Continue even if user creation fails
    }

    // Update registration status
    registration.status = 'approved';
    registration.reviewedBy = req.user.id;
    registration.reviewedAt = new Date();
    await registration.save();

    const preferenceFilters = getRoomPreferenceFilters(registration.preferredRoomType);
    const availabilityQuery = {
      status: { $ne: 'maintenance' },
      $expr: { $lt: ['$occupied', '$capacity'] }
    };
    if (preferenceFilters.type) {
      availabilityQuery.type = preferenceFilters.type;
    }
    if (typeof preferenceFilters.isAC === 'boolean') {
      availabilityQuery.isAC = preferenceFilters.isAC;
    }

    let roomSuggestions = await Room.find(availabilityQuery)
      .select('roomNo type isAC capacity occupied beds floor building rent rentFor5Months messChargePerMonth messChargeFor5Months status')
      .sort({ roomNo: 1 })
      .limit(10)
      .lean();

    if (roomSuggestions.length === 0) {
      roomSuggestions = await Room.find({
        status: { $ne: 'maintenance' },
        $expr: { $lt: ['$occupied', '$capacity'] }
      })
        .select('roomNo type isAC capacity occupied beds floor building rent rentFor5Months messChargePerMonth messChargeFor5Months status')
        .sort({ roomNo: 1 })
        .limit(10)
        .lean();
    }

    // Populate student with roomNo before sending response
    const populatedStudent = await Student.findById(student._id)
      .populate('roomNo', 'roomNo type isAC capacity occupied beds floor building rent rentFor5Months messChargePerMonth messChargeFor5Months status')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Registration approved and student created successfully!',
      data: {
        registration,
        student: populatedStudent || student,
        fees: createdFees,
        roomSuggestions
      }
    });
  } catch (error) {
    console.error('Approve registration error:', error);
    
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
      message: error.message || 'An error occurred while approving registration. Please try again.' 
    });
  }
};

// @desc    Reject student registration
// @route   POST /api/student-registration/:id/reject
// @access  Private (Admin/Warden)
exports.rejectRegistration = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const registration = await StudentRegistration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Registration is already ${registration.status}. Cannot reject.`
      });
    }

    // Update registration status
    registration.status = 'rejected';
    registration.reviewedBy = req.user.id;
    registration.reviewedAt = new Date();
    registration.rejectionReason = rejectionReason || 'No reason provided';
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Registration rejected successfully.',
      data: registration
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while rejecting registration. Please try again.' 
    });
  }
};

// @desc    Delete registration
// @route   DELETE /api/student-registration/:id
// @access  Private (Admin)
exports.deleteRegistration = async (req, res) => {
  try {
    const registration = await StudentRegistration.findByIdAndDelete(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Registration deleted successfully.',
      data: {}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

