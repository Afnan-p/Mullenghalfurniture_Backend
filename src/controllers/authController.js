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

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email?.trim()?.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'No user found with that email' });
        }

        if (user.provider !== 'local') {
            return res.status(400).json({ message: `This account is registered via ${user.provider}. Please use that method.` });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

        await user.save();

        // In production, send email. For now, log and return (as mock)
        console.log(`Reset Token for ${email}: ${resetToken}`);
        
        res.json({ 
            message: 'Password reset link sent (Check server logs in dev)',
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

