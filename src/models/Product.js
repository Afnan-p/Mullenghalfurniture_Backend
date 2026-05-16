const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true, lowercase: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    images: [
        {
            url: { type: String, required: true },
            public_id: { type: String, required: true }
        }
    ],
    image: { type: String }, // Main thumbnail URL string
    description: { type: String },
    stock: { type: Number, default: 0 },
}, { timestamps: true });

// Generate slug from name before saving
productSchema.pre('save', async function () {
    if (this.isModified('name') || !this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
});

module.exports = mongoose.model('Product', productSchema);
