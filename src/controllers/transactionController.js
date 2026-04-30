const Transaction = require('../models/Transaction');

exports.addTransaction = async (req, res, next) => {
    const { userId, productName, quantity, price, type, note, date } = req.body;
    try {
        if (!userId || !productName || !quantity || !price || !type || !note) {
            res.status(400);
            throw new Error('Please fill all required fields: User, Product, Qty, Price, Type, and Note');
        }

        if (Number(quantity) <= 0 || Number(price) <= 0) {
            res.status(400);
            throw new Error('Quantity and Price must be greater than 0');
        }

        const amount = Number(quantity) * Number(price);
        const transaction = new Transaction({
            userId,
            productName,
            quantity,
            price,
            amount,
            type,
            note,
            date: date || Date.now()
        });
        const createdTransaction = await transaction.save();
        res.status(201).json(createdTransaction);
    } catch (error) {
        next(error);
    }
};

exports.updateTransaction = async (req, res, next) => {
    const { productName, quantity, price, type, note, date } = req.body;
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (transaction) {
            transaction.productName = productName || transaction.productName;
            transaction.quantity = quantity !== undefined ? Number(quantity) : transaction.quantity;
            transaction.price = price !== undefined ? Number(price) : transaction.price;
            
            if (transaction.quantity <= 0 || transaction.price <= 0) {
                res.status(400);
                throw new Error('Quantity and Price must be greater than 0');
            }

            transaction.amount = transaction.quantity * transaction.price;
            transaction.type = type || transaction.type;
            transaction.note = note || transaction.note;
            transaction.date = date || transaction.date;

            const updatedTransaction = await transaction.save();
            res.json(updatedTransaction);
        } else {
            res.status(404);
            throw new Error('Transaction not found');
        }
    } catch (error) {
        next(error);
    }
};

exports.deleteTransaction = async (req, res, next) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (transaction) {
            await transaction.deleteOne();
            res.json({ message: 'Transaction removed' });
        } else {
            res.status(404);
            throw new Error('Transaction not found');
        }
    } catch (error) {
        next(error);
    }
};

exports.getGlobalStats = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const Product = require('../models/Product');
        const Enquiry = require('../models/Enquiry');

        const users = await User.find({ role: 'user' });
        const totalUsers = users.length;
        let totalPreviousBalance = 0;
        users.forEach(u => totalPreviousBalance += (u.previousBalance || 0));

        const totalProducts = await Product.countDocuments({});
        const totalEnquiries = await Enquiry.countDocuments({});
        const completedEnquiries = await Enquiry.countDocuments({ status: 'completed' });

        const transactions = await Transaction.find({});
        let totalDebit = 0;
        let totalCredit = 0;
        
        // Calculate daily stats for the last 7 days
        const last7Days = [...Array(7)].map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        const chartData = last7Days.map(dateStr => {
            const dayTxs = transactions.filter(t => t.date.toISOString().split('T')[0] === dateStr);
            const debit = dayTxs.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
            const credit = dayTxs.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
            
            return {
                name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
                debit,
                credit
            };
        });

        transactions.forEach(t => {
            if (t.type === 'debit') totalDebit += t.amount;
            if (t.type === 'credit') totalCredit += t.amount;
        });

        res.json({
            totalUsers,
            totalProducts,
            totalEnquiries,
            completedEnquiries,
            totalDebit,
            totalCredit,
            totalPreviousBalance,
            chartData
        });
    } catch (error) {
        next(error);
    }
};
