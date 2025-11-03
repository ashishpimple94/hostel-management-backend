const Complaint = require('../models/Complaint');

exports.getComplaints = async (req, res) => {
  try {
    const { status, category, student } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (student) query.student = student;

    // If user is student, only show their complaints
    if (req.user.role === 'student' && req.user.studentId) {
      query.student = req.user.studentId;
    }

    // If maintenance staff, show only assigned complaints
    if (req.user.role === 'maintenance') {
      query.assignedTo = req.user.id;
    }

    const complaints = await Complaint.find(query)
      .populate('student')
      .populate('room')
      .populate('assignedTo')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student')
      .populate('room')
      .populate('assignedTo');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createComplaint = async (req, res) => {
  try {
    // If student, use their studentId
    if (req.user.role === 'student') {
      req.body.student = req.user.studentId;
    }

    // Validate required fields
    const { category, description, priority } = req.body;
    
    const missingFields = [];
    if (!category || (typeof category === 'string' && category.trim() === '')) {
      missingFields.push('category');
    }
    if (!description || (typeof description === 'string' && description.trim() === '')) {
      missingFields.push('description');
    }
    if (!priority || (typeof priority === 'string' && priority.trim() === '')) {
      missingFields.push('priority');
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}. Please fill all required fields.`
      });
    }

    // Validate category is valid
    const validCategories = ['maintenance', 'cleanliness', 'food', 'security', 'other'];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // Validate priority is valid
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Validate description length
    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters long. Please provide more details.'
      });
    }

    const complaint = await Complaint.create(req.body);
    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while creating complaint. Please try again.' 
    });
  }
};

exports.updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignComplaint = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.assignedTo = assignedTo;
    complaint.assignedBy = req.user.id;
    complaint.assignedDate = new Date();
    complaint.status = 'assigned';
    await complaint.save();

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolution } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.status = status;
    if (resolution) complaint.resolution = resolution;
    if (status === 'resolved' || status === 'closed') {
      complaint.resolvedDate = new Date();
    }
    await complaint.save();

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
