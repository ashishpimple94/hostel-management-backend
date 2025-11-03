const { AppError } = require('./errorHandler');

// Validate student data
exports.validateStudent = (req, res, next) => {
  const { name, email, phone } = req.body;
  
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!phone || !/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) {
    errors.push('Please provide a valid 10-digit phone number');
  }
  
  if (errors.length > 0) {
    return next(new AppError(errors.join(', '), 400));
  }
  
  next();
};

// Validate room data
exports.validateRoom = (req, res, next) => {
  const { roomNo, capacity, rent, rentFor5Months } = req.body;
  
  const errors = [];
  
  if (!roomNo || roomNo.trim().length === 0) {
    errors.push('Room number is required');
  }
  
  if (!capacity || capacity < 1 || capacity > 6) {
    errors.push('Capacity must be between 1 and 6');
  }
  
  if (!rent || rent < 0) {
    errors.push('Rent must be a positive number');
  }
  
  if (!rentFor5Months || rentFor5Months < 0) {
    errors.push('5-month rent must be a positive number');
  }
  
  if (errors.length > 0) {
    return next(new AppError(errors.join(', '), 400));
  }
  
  next();
};

// Validate fee data
exports.validateFee = (req, res, next) => {
  const { student, amount, dueDate, feeType } = req.body;
  
  const errors = [];
  
  if (!student) {
    errors.push('Student is required');
  }
  
  if (!amount || amount <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  if (!dueDate) {
    errors.push('Due date is required');
  }
  
  if (!feeType || !['hostel', 'mess', 'maintenance', 'security', 'admission', 'other'].includes(feeType)) {
    errors.push('Invalid fee type');
  }
  
  if (errors.length > 0) {
    return next(new AppError(errors.join(', '), 400));
  }
  
  next();
};

// Validate complaint data
exports.validateComplaint = (req, res, next) => {
  const { category, description } = req.body;
  
  const errors = [];
  
  if (!category || !['maintenance', 'cleanliness', 'food', 'security', 'other'].includes(category)) {
    errors.push('Invalid complaint category');
  }
  
  if (!description || description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  
  if (errors.length > 0) {
    return next(new AppError(errors.join(', '), 400));
  }
  
  next();
};

// Validate ObjectId
exports.validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return next(new AppError('Invalid ID format', 400));
    }
    next();
  };
};
