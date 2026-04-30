const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    amount: { type: Number, required: true }, // Total: quantity * price
    type: { type: String, enum: ['debit', 'credit'], required: true },
    note: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
