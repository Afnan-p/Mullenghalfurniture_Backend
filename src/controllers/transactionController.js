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

        const { period = 'weekly' } = req.query;

        // Date ranges for trends
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Helper for growth calculation
        const calculateGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        // Current & Previous Month Counts for Trends
        const [currUsers, prevUsers, currProducts, prevProducts, currEnquiries, prevEnquiries, allTransactions] = await Promise.all([
            User.countDocuments({ role: 'user', createdAt: { $gte: startOfCurrentMonth } }),
            User.countDocuments({ role: 'user', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            Product.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }),
            Product.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            Enquiry.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }),
            Enquiry.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            Transaction.find({})
        ]);

        const currRevenue = allTransactions
            .filter(t => t.type === 'debit' && t.date >= startOfCurrentMonth)
            .reduce((sum, t) => sum + t.amount, 0);
        const prevRevenue = allTransactions
            .filter(t => t.type === 'debit' && t.date >= startOfLastMonth && t.date <= endOfLastMonth)
            .reduce((sum, t) => sum + t.amount, 0);

        const trends = {
            users: calculateGrowth(currUsers, prevUsers),
            products: calculateGrowth(currProducts, prevProducts),
            enquiries: calculateGrowth(currEnquiries, prevEnquiries),
            revenue: calculateGrowth(currRevenue, prevRevenue)
        };

        // Main Stats
        const users = await User.find({ role: 'user' });
        const totalUsers = users.length;
        let totalPreviousBalance = 0;
        users.forEach(u => totalPreviousBalance += (u.previousBalance || 0));

        const totalProducts = await Product.countDocuments({});
        const totalEnquiries = await Enquiry.countDocuments({});
        const pendingEnquiries = await Enquiry.countDocuments({ status: 'pending' });
        const completedEnquiries = await Enquiry.countDocuments({ status: 'completed' });

        let totalDebit = 0;
        let totalCredit = 0;
        
        // Revenue Stats
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayRevenue = allTransactions
            .filter(t => t.type === 'debit' && t.date >= startOfToday)
            .reduce((sum, t) => sum + t.amount, 0);
        const monthlyRevenue = currRevenue;

        // Recent Enquiries
        const recentEnquiries = await Enquiry.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'name shopName avatar');

        // Recent Activities (Aggregated)
        const [latestUsers, latestProducts, latestEnquiries, latestTransactions] = await Promise.all([
            User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(3),
            Product.find({}).sort({ updatedAt: -1 }).limit(3),
            Enquiry.find({}).sort({ updatedAt: -1 }).limit(3).populate('userId', 'name'),
            Transaction.find({}).sort({ createdAt: -1 }).limit(3).populate('userId', 'name')
        ]);

        const activities = [
            ...latestUsers.map(u => ({ type: 'user', action: 'New user registered', target: u.name, date: u.createdAt })),
            ...latestProducts.map(p => ({ type: 'product', action: 'Product updated', target: p.name, date: p.updatedAt })),
            ...latestEnquiries.map(e => ({ type: 'enquiry', action: 'Enquiry status: ' + e.status, target: e.userId?.name || 'Customer', date: e.updatedAt })),
            ...latestTransactions.map(t => ({ type: 'transaction', action: 'New transaction', target: `$${t.amount.toLocaleString()}`, date: t.createdAt }))
        ].sort((a, b) => b.date - a.date).slice(0, 10);

        // Chart Data (Dynamic based on period)
        const daysToFetch = period === 'monthly' ? 30 : 7;
        const lastNDays = [...Array(daysToFetch)].map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        const chartData = lastNDays.map(dateStr => {
            const dayTxs = allTransactions.filter(t => t.date.toISOString().split('T')[0] === dateStr);
            const debit = dayTxs.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
            const credit = dayTxs.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
            
            return {
                name: period === 'monthly' 
                    ? new Date(dateStr).getDate() 
                    : new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
                debit,
                credit
            };
        });

        allTransactions.forEach(t => {
            if (t.type === 'debit') totalDebit += t.amount;
            if (t.type === 'credit') totalCredit += t.amount;
        });

        res.json({
            totalUsers,
            totalProducts,
            totalEnquiries,
            pendingEnquiries,
            completedEnquiries,
            totalDebit,
            totalCredit,
            totalPreviousBalance,
            todayRevenue,
            monthlyRevenue,
            trends,
            recentEnquiries,
            activities,
            chartData
        });
    } catch (error) {
        next(error);
    }
};
