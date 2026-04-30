const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password');
        
        // Calculate current balance for each user
        const usersWithBalance = await Promise.all(users.map(async (user) => {
            const transactions = await Transaction.find({ userId: user._id });
            let totalDebit = 0;
            let totalCredit = 0;
            
            transactions.forEach(t => {
                if (t.type === 'debit') totalDebit += t.amount;
                if (t.type === 'credit') totalCredit += t.amount;
            });

            return {
                ...user._doc,
                currentBalance: user.previousBalance + totalDebit - totalCredit
            };
        }));

        res.json(usersWithBalance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            const transactions = await Transaction.find({ userId: user._id }).sort({ date: -1 });
            
            let totalDebit = 0;
            let totalCredit = 0;
            
            transactions.forEach(t => {
                if (t.type === 'debit') totalDebit += t.amount;
                if (t.type === 'credit') totalCredit += t.amount;
            });

            const currentBalance = user.previousBalance + totalDebit - totalCredit;

            res.json({
                user,
                transactions,
                summary: {
                    previousBalance: user.previousBalance,
                    totalDebit,
                    totalCredit,
                    currentBalance
                }
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updatePreviousBalance = async (req, res) => {
    const { previousBalance } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.previousBalance = previousBalance;
            await user.save();
            res.json({ message: 'Previous balance updated', previousBalance: user.previousBalance });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.toggleBlockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.isBlocked = !user.isBlocked;
            await user.save();
            res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, isBlocked: user.isBlocked });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await user.deleteOne();
            res.json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
