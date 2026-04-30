const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, default: 1 }
    }],
    note: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'rejected', 'completed'], 
        default: 'pending' 
    },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
