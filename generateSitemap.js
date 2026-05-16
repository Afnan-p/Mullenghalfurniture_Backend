const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Product = require('./src/models/Product');

dotenv.config();

const BASE_URL = 'https://mullenghalfurniture.com';

const generateSitemap = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Sitemap Generation');

        const products = await Product.find({ slug: { $exists: true } });
        
        const staticRoutes = [
            '',
            '/home',
            '/about',
            '/contact',
            '/products',
            '/enquiries'
        ];

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Add static routes
        staticRoutes.forEach(route => {
            xml += '  <url>\n';
            xml += `    <loc>${BASE_URL}${route}</loc>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += '    <priority>0.8</priority>\n';
            xml += '  </url>\n';
        });

        // Add dynamic product routes
        products.forEach(product => {
            xml += '  <url>\n';
            xml += `    <loc>${BASE_URL}/products/${product.slug}</loc>\n`;
            xml += `    <lastmod>${new Date(product.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
            xml += '    <changefreq>monthly</changefreq>\n';
            xml += '    <priority>0.6</priority>\n';
            xml += '  </url>\n';
        });

        xml += '</urlset>';

        const outputPath = path.join(__dirname, '../frontend/public/sitemap.xml');
        fs.writeFileSync(outputPath, xml);
        
        console.log(`Sitemap generated successfully at ${outputPath}`);
        process.exit();
    } catch (error) {
        console.error('Error generating sitemap:', error);
        process.exit(1);
    }
};

generateSitemap();
