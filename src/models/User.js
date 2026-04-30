const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { 
        type: String, 
        required: function() { return this.provider === 'local'; } 
    },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    shopName: { type: String },
    phone: { type: String },
    avatar: { type: String },
    provider: { type: String, default: 'local' },
    previousBalance: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function() {
    if (!this.isModified('password') || !this.password) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
