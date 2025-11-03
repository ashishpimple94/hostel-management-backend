const jwt = require('jsonwebtoken');

// Generate JWT token
exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send token response
exports.sendTokenResponse = (user, statusCode, res) => {
  const token = exports.generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      studentId: user.studentId
    }
  });
};
