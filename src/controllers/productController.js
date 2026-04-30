const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');

exports.getProducts = async (req, res, next) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        next(error);
    }
};

exports.getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
    } catch (error) {
        next(error);
    }
};

exports.createProduct = async (req, res, next) => {
    try {
        const { name, price, category, description, stock } = req.body;
        
        // Validation
        if (!name || !price || !category || !description) {
            res.status(400);
            throw new Error('Please provide all required fields (name, price, category, description)');
        }

        if (Number(price) <= 0) {
            res.status(400);
            throw new Error('Price must be a number greater than 0');
        }

        if (!req.files || req.files.length === 0) {
            res.status(400);
            throw new Error('At least one product image is required');
        }

        // Map files to objects with url and public_id
        const imageObjects = req.files.map(file => ({
            url: file.path,
            public_id: file.filename
        }));

        const product = await Product.create({
            name,
            price,
            category,
            images: imageObjects,
            image: imageObjects[0].url,
            description,
            stock: stock || 0
        });

        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
};

exports.updateProduct = async (req, res, next) => {
    try {
        const { name, price, category, stock, description } = req.body;
        
        if (price && Number(price) <= 0) {
            res.status(400);
            throw new Error('Price must be greater than 0');
        }

        const product = await Product.findById(req.params.id);
        
        if (product) {
            product.name = name || product.name;
            product.price = price || product.price;
            product.category = category || product.category;
            product.stock = stock !== undefined ? stock : product.stock;
            product.description = description || product.description;

            // Handle new image uploads
            if (req.files && req.files.length > 0) {
                // DELETE OLD IMAGES FROM CLOUDINARY
                for (const img of product.images) {
                    try {
                        if (img.public_id) {
                            await cloudinary.uploader.destroy(img.public_id);
                        }
                    } catch (err) {
                        console.error('Failed to delete old image from Cloudinary:', img.public_id, err);
                    }
                }

                // Set new images
                const imageObjects = req.files.map(file => ({
                    url: file.path,
                    public_id: file.filename
                }));
                product.images = imageObjects;
                product.image = imageObjects[0].url;
            }

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
    } catch (error) {
        next(error);
    }
};

exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            // Delete associated images from Cloudinary
            if (product.images && product.images.length > 0) {
                for (const img of product.images) {
                    try {
                        if (img.public_id) {
                            await cloudinary.uploader.destroy(img.public_id);
                        }
                    } catch (error) {
                        console.error('Error deleting image from Cloudinary:', img.public_id, error);
                    }
                }
            }

            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
    } catch (error) {
        next(error);
    }
};
