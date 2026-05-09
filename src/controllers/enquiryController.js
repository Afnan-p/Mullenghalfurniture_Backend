const Enquiry = require('../models/Enquiry');

exports.createEnquiry = async (req, res, next) => {
    const { products, note } = req.body;
    try {
        if (!products || !Array.isArray(products) || products.length === 0) {
            res.status(400);
            throw new Error('Please add at least one product to your enquiry');
        }

        const hasInvalidQty = products.some(p => !p.quantity || p.quantity < 1);
        if (hasInvalidQty) {
            res.status(400);
            throw new Error('All products must have a quantity of at least 1');
        }

        const enquiry = new Enquiry({
            userId: req.user._id,
            products,
            note
        });
        const createdEnquiry = await enquiry.save();
        res.status(201).json(createdEnquiry);
    } catch (error) {
        next(error);
    }
};

exports.getUserEnquiries = async (req, res, next) => {
    try {
        const enquiries = await Enquiry.find({ userId: req.user._id }).populate('products.productId');
        res.json(enquiries);
    } catch (error) {
        next(error);
    }
};

exports.getAllEnquiries = async (req, res, next) => {
    try {
        const enquiries = await Enquiry.find({}).populate('userId', 'name email shopName').populate('products.productId');
        res.json(enquiries);
    } catch (error) {
        next(error);
    }
};

exports.updateEnquiryStatus = async (req, res, next) => {
    const { status } = req.body;
    try {
        const enquiry = await Enquiry.findById(req.params.id);
        if (enquiry) {
            enquiry.status = status;
            const updatedEnquiry = await enquiry.save();
            res.json(updatedEnquiry);
        } else {
            res.status(404);
            throw new Error('Enquiry not found');
        }
    } catch (error) {
        next(error);
    }
};

exports.deleteEnquiry = async (req, res, next) => {
    try {
        const enquiry = await Enquiry.findById(req.params.id);
        if (enquiry) {
            await enquiry.deleteOne();
            res.json({ message: 'Enquiry removed' });
        } else {
            res.status(404);
            throw new Error('Enquiry not found');
        }
    } catch (error) {
        next(error);
    }
};
