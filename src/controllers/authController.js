const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res, next) => {
    const { name, email, password, shopName, phone, role } = req.body;
    
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
    const { email, password } = req.body;
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

