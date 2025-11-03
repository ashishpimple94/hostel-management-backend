const Student = require('../models/Student');
const Room = require('../models/Room');
const Fee = require('../models/Fee');
const Complaint = require('../models/Complaint');
const Attendance = require('../models/Attendance');

exports.getDashboardStats = async (req, res) => {
  try {
    const role = req.user.role;
    let stats = {};

    if (role === 'admin' || role === 'warden') {
      // Admin/Warden Dashboard
      const totalStudents = await Student.countDocuments({ status: 'active' });
      const totalRooms = await Room.countDocuments();
      
      // Count fully occupied rooms (where occupied >= capacity)
      const fullyOccupiedRooms = await Room.countDocuments({ 
        $expr: { $gte: ['$occupied', '$capacity'] } 
      });
      
      // Count rooms with at least one occupant (partially or fully occupied)
      const roomsWithOccupants = await Room.countDocuments({ 
        occupied: { $gt: 0 } 
      });
      
      // Available rooms (rooms with vacant beds)
      const availableRooms = await Room.countDocuments({ 
        $expr: { $lt: ['$occupied', '$capacity'] } 
      });
      
      // AC/Non-AC breakdown for available rooms
      const availableACRooms = await Room.countDocuments({ 
        isAC: true,
        $expr: { $lt: ['$occupied', '$capacity'] } 
      });
      
      const availableNonACRooms = await Room.countDocuments({ 
        isAC: false,
        $expr: { $lt: ['$occupied', '$capacity'] } 
      });
      
      // AC/Non-AC breakdown for occupied rooms
      const occupiedACRooms = await Room.countDocuments({ 
        isAC: true,
        occupied: { $gt: 0 } 
      });
      
      const occupiedNonACRooms = await Room.countDocuments({ 
        isAC: false,
        occupied: { $gt: 0 } 
      });

      const pendingComplaints = await Complaint.countDocuments({
        status: { $in: ['pending', 'assigned'] } 
      });

      const pendingFees = await Fee.countDocuments({ status: 'pending' });
      const overdueFees = await Fee.countDocuments({ status: 'overdue' });

      // Fee collection summary
      const totalFeeAmount = await Fee.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const pendingFeeAmount = await Fee.aggregate([
        { $match: { status: { $in: ['pending', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      stats = {
        students: {
          total: totalStudents,
          active: totalStudents
        },
        rooms: {
          total: totalRooms,
          occupied: roomsWithOccupants,
          available: availableRooms,
          ac: {
            available: availableACRooms,
            occupied: occupiedACRooms
          },
          nonAC: {
            available: availableNonACRooms,
            occupied: occupiedNonACRooms
          }
        },
        complaints: {
          pending: pendingComplaints
        },
        fees: {
          pending: pendingFees,
          overdue: overdueFees,
          collected: totalFeeAmount[0]?.total || 0,
          pendingAmount: pendingFeeAmount[0]?.total || 0
        }
      };
    } else if (role === 'student') {
      // Student Dashboard
      const student = await Student.findById(req.user.studentId).populate('roomNo');
      
      const studentFees = await Fee.find({ student: req.user.studentId });
      const pendingFees = studentFees.filter(f => f.status === 'pending' || f.status === 'overdue');
      
      const myComplaints = await Complaint.find({ student: req.user.studentId });
      const pendingComplaints = myComplaints.filter(c => 
        c.status === 'pending' || c.status === 'assigned' || c.status === 'in-progress'
      );

      const recentNotices = 3;

      stats = {
        student: student,
        fees: {
          total: studentFees.length,
          pending: pendingFees.length,
          amount: pendingFees.reduce((sum, f) => sum + f.amount, 0)
        },
        complaints: {
          total: myComplaints.length,
          pending: pendingComplaints.length
        },
        recentNotices
      };
    } else if (role === 'accountant') {
      // Accountant Dashboard
      const totalFees = await Fee.countDocuments();
      const paidFees = await Fee.countDocuments({ status: 'paid' });
      const pendingFees = await Fee.countDocuments({ status: 'pending' });
      const overdueFees = await Fee.countDocuments({ status: 'overdue' });

      const totalCollected = await Fee.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalPending = await Fee.aggregate([
        { $match: { status: { $in: ['pending', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      stats = {
        fees: {
          total: totalFees,
          paid: paidFees,
          pending: pendingFees,
          overdue: overdueFees,
          collected: totalCollected[0]?.total || 0,
          pendingAmount: totalPending[0]?.total || 0
        }
      };
    } else if (role === 'maintenance') {
      // Maintenance Staff Dashboard
      const assignedComplaints = await Complaint.find({ 
        assignedTo: req.user.id 
      });

      const pendingComplaints = assignedComplaints.filter(c => 
        c.status === 'assigned' || c.status === 'in-progress'
      );

      const resolvedComplaints = assignedComplaints.filter(c => 
        c.status === 'resolved' || c.status === 'closed'
      );

      stats = {
        complaints: {
          total: assignedComplaints.length,
          pending: pendingComplaints.length,
          resolved: resolvedComplaints.length
        }
      };
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getRoomOccupancyReport = async (req, res) => {
  try {
    const rooms = await Room.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          occupied: {
            $sum: {
              $cond: [{ $gte: ['$occupied', '$capacity'] }, 1, 0]
            }
          },
          available: {
            $sum: {
              $cond: [{ $lt: ['$occupied', '$capacity'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeeCollectionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let match = {};

    if (startDate || endDate) {
      match.paidDate = {};
      if (startDate) match.paidDate.$gte = new Date(startDate);
      if (endDate) match.paidDate.$lte = new Date(endDate);
    }

    const report = await Fee.aggregate([
      { $match: { ...match, status: 'paid' } },
      {
        $group: {
          _id: '$feeType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
