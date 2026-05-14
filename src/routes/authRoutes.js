const express = require('express');
const { registerUser, loginUser, getMe, forgotPassword, verifyOtp, resetPassword } = require('../controllers/authController');
const { sendEmail } = require('../utils/emailService');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
