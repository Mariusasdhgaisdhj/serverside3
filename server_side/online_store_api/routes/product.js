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
        const filters = {};
        if (req.query.sellerId) {
            filters.sellerId = req.query.sellerId;
        }
        
        const result = await Product.findAll(filters);
        const products = result.data || [];
        
        // Transform the data to match frontend expectations
        const transformedProducts = products.map(product => ({
            _id: product.id,
            name: product.name,
            description: product.description,
            quantity: product.quantity,
            price: product.price,
            offerPrice: product.offer_price,
            sellerId: product.users ? {
                _id: product.users.id || product.seller_id,
                name: product.users.name,
                email: product.users.email,
                businessName: product.users.business_name,
                verified: product.users.verified || false
            } : null,
            proCategoryId: product.categories ? {
                _id: product.categories.id || product.pro_category_id,
                name: product.categories.name
            } : null,
            proSubCategoryId: product.subcategories ? {
                _id: product.subcategories.id || product.pro_sub_category_id,
                name: product.subcategories.name
            } : null,
            proBrandId: product.brands ? {
                _id: product.brands.id || product.pro_brand_id,
                name: product.brands.name
            } : null,
            proVariantTypeId: product.variant_types ? {
                _id: product.variant_types.id || product.pro_variant_type_id,
                type: product.variant_types.type
            } : null,
            proVariantId: product.pro_variant_id || [],
            images: product.product_images ? product.product_images.map(img => ({
                _id: img.id,
                image: img.image_order,
                url: img.url
            })) : [],
            createdAt: product.created_at,
            updatedAt: product.updated_at
        }));
        
        res.json({ success: true, message: "Products retrieved successfully.", data: transformedProducts });
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
        
        // Transform the data to match frontend expectations
        const transformedProduct = {
            _id: product.id,
            name: product.name,
            description: product.description,
            quantity: product.quantity,
            price: product.price,
            offerPrice: product.offer_price,
            sellerId: product.users ? {
                _id: product.users.id || product.seller_id,
                name: product.users.name,
                email: product.users.email,
                businessName: product.users.business_name,
                verified: product.users.verified || false
            } : null,
            proCategoryId: product.categories ? {
                _id: product.categories.id || product.pro_category_id,
                name: product.categories.name
            } : null,
            proSubCategoryId: product.subcategories ? {
                _id: product.subcategories.id || product.pro_sub_category_id,
                name: product.subcategories.name
            } : null,
            proBrandId: product.brands ? {
                _id: product.brands.id || product.pro_brand_id,
                name: product.brands.name
            } : null,
            proVariantTypeId: product.variant_types ? {
                _id: product.variant_types.id || product.pro_variant_type_id,
                type: product.variant_types.type
            } : null,
            proVariantId: product.pro_variant_id || [],
            images: product.product_images ? product.product_images.map(img => ({
                _id: img.id,
                image: img.image_order,
                url: img.url
            })) : [],
            createdAt: product.created_at,
            updatedAt: product.updated_at
        };
        
        res.json({ success: true, message: "Product retrieved successfully.", data: transformedProduct });
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
router.post('/', (req, res, next) => {
    uploadProduct.fields([
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 },
        { name: 'image3', maxCount: 1 },
        { name: 'image4', maxCount: 1 },
        { name: 'image5', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        next();
    });
}, asyncHandler(async (req, res) => {
    try {
        console.log('=== Product creation request received ===');
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);
        console.log('Multer processing completed, starting product creation...');

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

        // Process uploaded images
        const imageUrls = [];
        const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
        
        fields.forEach((field, index) => {
            if (req.files && req.files[field] && req.files[field].length > 0) {
                const file = req.files[field][0];
                try {
                    // Create URL for the uploaded file
                    const imageUrl = `${req.protocol}://${req.get('host')}/image/products/${file.filename}`;
                    imageUrls.push({ image: index + 1, url: imageUrl });
                    console.log(`Added image ${index + 1}: ${imageUrl}`);
                } catch (imageError) {
                    console.error(`Error processing image ${index + 1}:`, imageError);
                    // Continue with other images even if one fails
                }
            }
        });

        console.log('Image URLs:', imageUrls);

        // Add a default image if no images were uploaded
        if (imageUrls.length === 0) {
            imageUrls.push({ 
                image: 1, 
                url: `${req.protocol}://${req.get('host')}/image/products/default-product.jpg` 
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
        console.log('About to create product in database...');

        // Create a new product in the database
        const savedProduct = await Product.create(productData);
        console.log('Product saved successfully:', savedProduct.id);

        // Insert images into product_images table
        if (imageUrls.length > 0) {
            console.log('About to insert images into database...');
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
        } else {
            console.log('No images to insert');
        }

        // Send a success response back to the client
        console.log('About to send success response...');
        res.json({ success: true, message: "Product created successfully.", data: savedProduct });
        console.log('Success response sent');
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
