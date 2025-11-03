const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('./models/Student');
const Fee = require('./models/Fee');

const syncPendingFees = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected');

    // Get all students
    const students = await Student.find();
    console.log(`📊 Found ${students.length} students`);

    for (const student of students) {
      
      const pendingFees = await Fee.find({
        student: student._id,
        status: { $in: ['pending', 'overdue'] }
      }).sort('dueDate');

      const totalPendingAmount = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);

      const hasPendingFees = pendingFees.length > 0;
      const pendingFeesFrom = hasPendingFees ? pendingFees[0].dueDate : null;
      const pendingFeesUntil = hasPendingFees ? pendingFees[pendingFees.length - 1].dueDate : null;

      // Update student record
      await Student.findByIdAndUpdate(student._id, {
        hasPendingFees,
        totalPendingAmount,
        pendingFeesFrom,
        pendingFeesUntil
      });

      console.log(`✅ Updated ${student.firstName} ${student.lastName} - Pending: ₹${totalPendingAmount}`);
    }

    console.log('\n🎉 All students updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

syncPendingFees();
