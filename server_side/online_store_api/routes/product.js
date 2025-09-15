const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const multer = require('multer');
const { uploadProduct } = require('../uploadFile');
const asyncHandler = require('express-async-handler');
const { supabase } = require('../config/supabase');

// Get all products (optionally filter by sellerId)
router.get('/', asyncHandler(async (req, res) => {
    try {
        const products = await Product.findAll(req.query.sellerId);
        res.json({ success: true, message: "Products retrieved successfully.", data: products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch products. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// Get a product by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const productID = req.params.id;
        const product = await Product.findById(productID);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        res.json({ success: true, message: "Product retrieved successfully.", data: product });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch product. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));



// create new product
router.post('/', asyncHandler(async (req, res) => {
    try {
        console.log('=== Product creation request received ===');
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);

        // Create a memory storage for Vercel deployment
        const memoryStorage = multer.memoryStorage();
        const uploadToMemory = multer({ 
            storage: memoryStorage,
            limits: {
                fileSize: 1024 * 1024 * 5 // limit filesize to 5MB
            }
        });

        // Execute the Multer middleware to handle multiple file fields
        uploadToMemory.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            { name: 'image4', maxCount: 1 },
            { name: 'image5', maxCount: 1 }
        ])(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                // Handle Multer errors, if any
                if (err.code === 'LIMIT_FILE_SIZE') {
                    err.message = 'File size is too large. Maximum filesize is 5MB per image.';
                }
                console.log(`Add product: ${err}`);
                return res.json({ success: false, message: err.message });
            } else if (err) {
                // Handle other errors, if any
                console.log(`Add product: ${err}`);
                return res.json({ success: false, message: err });
            }

            // Extract product data from the request body
            const { sellerId, name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;

            console.log('Extracted data:', {
                sellerId, name, description, quantity, price, 
                proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId
            });

            // Check if any required fields are missing
            if (!name || !quantity || !price || !proCategoryId || !proSubCategoryId) {
                console.log('Missing required fields');
                return res.status(400).json({ success: false, message: "Required fields are missing." });
            }

            // Initialize an array to store image URLs
            const imageUrls = [];

            // Iterate over the file fields
            const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
            fields.forEach((field, index) => {
                if (req.files && req.files[field] && req.files[field].length > 0) {
                    const file = req.files[field][0];
                    // Use a more reliable placeholder URL
                    const imageUrl = `https://picsum.photos/400/400?random=${index + 1}`;
                    imageUrls.push({ image: index + 1, url: imageUrl });
                    console.log(`Added image ${index + 1}: ${imageUrl}`);
                }
            });

            console.log('Image URLs:', imageUrls);

            // Add a default image if no images were uploaded
            if (imageUrls.length === 0) {
                imageUrls.push({ 
                    image: 1, 
                    url: 'https://picsum.photos/400/400?random=999' 
                });
                console.log('Added default image for product without images');
            }

            // Convert data types to ensure they match the schema
            const productData = {
                seller_id: sellerId,
                name: String(name).trim(),
                description: description ? String(description).trim() : '',
                quantity: parseInt(quantity) || 0,
                price: parseFloat(price) || 0,
                offer_price: offerPrice ? parseFloat(offerPrice) : undefined,
                pro_category_id: proCategoryId,
                pro_sub_category_id: proSubCategoryId,
                pro_brand_id: proBrandId || undefined,
                pro_variant_type_id: proVariantTypeId || undefined,
                pro_variant_id: proVariantId || undefined
            };

            console.log('Processed product data:', productData);

            // Create a new product in the database
            const savedProduct = await Product.create(productData);
            console.log('Product saved successfully:', savedProduct.id);

            // Insert images into product_images table
            if (imageUrls.length > 0) {
                const imageData = imageUrls.map(img => ({
                    product_id: savedProduct.id,
                    image_order: img.image,
                    url: img.url
                }));

                const { error: imageError } = await supabase
                    .from('product_images')
                    .insert(imageData);

                if (imageError) {
                    console.error('Error inserting product images:', imageError);
                    // Don't fail the entire request if images fail
                } else {
                    console.log('Product images saved successfully');
                }
            }

            // Send a success response back to the client
            res.json({ success: true, message: "Product created successfully.", data: savedProduct });
        });
    } catch (error) {
        // Handle any errors that occur during the process
        console.error("Error creating product:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a product
router.put('/:id', asyncHandler(async (req, res) => {
    const productId = req.params.id;
    try {
        // Execute the Multer middleware to handle file fields
        uploadProduct.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            { name: 'image4', maxCount: 1 },
            { name: 'image5', maxCount: 1 }
        ])(req, res, async function (err) {
            if (err) {
                console.log(`Update product: ${err}`);
                return res.status(500).json({ success: false, message: err.message });
            }

            const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;

            // Prepare update data
            const updateData = {};
            if (name) updateData.name = name;
            if (description) updateData.description = description;
            if (quantity) updateData.quantity = quantity;
            if (price) updateData.price = price;
            if (offerPrice) updateData.offerPrice = offerPrice;
            if (proCategoryId) updateData.proCategoryId = proCategoryId;
            if (proSubCategoryId) updateData.proSubCategoryId = proSubCategoryId;
            if (proBrandId) updateData.proBrandId = proBrandId;
            if (proVariantTypeId) updateData.proVariantTypeId = proVariantTypeId;
            if (proVariantId) updateData.proVariantId = proVariantId;

            // Handle image updates
            const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
            const imageUpdates = [];
            fields.forEach((field, index) => {
                if (req.files[field] && req.files[field].length > 0) {
                    const file = req.files[field][0];
                    const imageUrl = `http://localhost:3000/image/products/${file.filename}`;
                    imageUpdates.push({ image: index + 1, url: imageUrl });
                }
            });

            if (imageUpdates.length > 0) {
                updateData.images = imageUpdates;
            }

            // Update the product
            const updatedProduct = await Product.update(productId, updateData);
            if (!updatedProduct) {
                return res.status(404).json({ success: false, message: "Product not found." });
            }
            res.json({ success: true, message: "Product updated successfully." });
        });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a product
router.delete('/:id', asyncHandler(async (req, res) => {
    const productID = req.params.id;
    try {
        const product = await Product.delete(productID);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        res.json({ success: true, message: "Product deleted successfully." });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to delete product. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

module.exports = router;
