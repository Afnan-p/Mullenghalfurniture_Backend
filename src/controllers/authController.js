const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res, next) => {
    let { name, email, password, shopName, phone, role } = req.body;
    
    // Trim inputs
    name = name?.trim();
    email = email?.trim()?.toLowerCase();
    shopName = shopName?.trim();
    phone = phone?.trim();
    
    try {
        // Basic validation
        if (!name || name.trim().length < 3) {
            return res.status(400).json({ message: 'Name must be at least 3 characters long' });
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        if (!shopName) {
            return res.status(400).json({ message: 'Shop name is required' });
        }

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Password complexity: min 6 chars, one upper, one lower, one number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters and contain at least one uppercase letter, one lowercase letter, and one number' 
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            shopName,
            phone,
            role: role || 'user',
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                shopName: user.shopName,
                phone: user.phone,
                avatar: user.avatar,
                provider: user.provider,
                token: generateToken(user._id),
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.loginUser = async (req, res) => {
    let { email, password } = req.body;
    email = email?.trim()?.toLowerCase();
    try {
        const user = await User.findOne({ email });
        if (user && user.provider === 'local' && (await user.comparePassword(password))) {
            if (user.isBlocked) {
                return res.status(403).json({ message: 'Your account has been blocked. Please contact admin.' });
            }
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                shopName: user.shopName,
                phone: user.phone,
                avatar: user.avatar,
                provider: user.provider,
                token: generateToken(user._id),
            });
        } else if (user && user.provider !== 'local') {
            res.status(400).json({ message: `This account is registered via ${user.provider}. Please use that method.` });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const { sendOTPEmail } = require('../utils/emailService');

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email?.trim()?.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }

        if (user.provider !== 'local') {
            return res.status(400).json({ message: `This account is registered via ${user.provider}. Please use that method.` });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash OTP (optional but more secure, I'll store it plain for simplicity as it expires fast, or hash it with crypto)
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        
        user.resetOtp = hashedOtp;
        user.resetOtpExpire = Date.now() + 5 * 60 * 1000; // 5 mins

        await user.save();

        try {
            await sendOTPEmail(user.email, otp);
            res.json({ message: 'OTP sent to your email' });
        } catch (emailError) {
            user.resetOtp = undefined;
            user.resetOtpExpire = undefined;
            await user.save();
            console.error('Email Delivery Error:', emailError);
            return res.status(500).json({ 
                message: `Email delivery failed: ${emailError.message}`,
                error: process.env.NODE_ENV === 'development' ? emailError.stack : undefined
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email: email?.trim()?.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.resetOtp || !user.resetOtpExpire || user.resetOtpExpire < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        if (hashedOtp !== user.resetOtp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Generate a temporary reset token to allow password reset on the next step
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
        
        // Clear OTP
        user.resetOtp = undefined;
        user.resetOtpExpire = undefined;

        await user.save();

        res.json({ 
            message: 'OTP verified successfully',
            resetToken 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
    }

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired session. Please start again.' });
        }

        // Password complexity check
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters and contain at least one uppercase letter, one lowercase letter, and one number' 
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


