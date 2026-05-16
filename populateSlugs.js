const mongoose = require('mongoose');
const dotenv = require('dotenv');
const slugify = require('slugify');
const Product = require('./src/models/Product');

dotenv.config();

const populateSlugs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const products = await Product.find({ slug: { $exists: false } });
        console.log(`Found ${products.length} products without slugs`);

        for (const product of products) {
            product.slug = slugify(product.name, { lower: true, strict: true });
            await product.save();
            console.log(`Updated: ${product.name} -> ${product.slug}`);
        }

        console.log('Slugs populated successfully');
        process.exit();
    } catch (error) {
        console.error('Error populating slugs:', error);
        process.exit(1);
    }
};

populateSlugs();
