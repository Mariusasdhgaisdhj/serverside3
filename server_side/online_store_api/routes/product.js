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



// Dynamically choose upload strategy: memory (Vercel) vs disk (local)
const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 5 }
}).fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
    { name: 'image5', maxCount: 1 }
]);

// create new product
router.post('/', (req, res, next) => {
    const handler = isServerless ? memoryUpload : uploadProduct.fields([
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 },
        { name: 'image3', maxCount: 1 },
        { name: 'image4', maxCount: 1 },
        { name: 'image5', maxCount: 1 }
    ]);
    handler(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        next();
    });
}, asyncHandler(async (req, res) => {
    try {
        console.log('=== Product creation request received ===');
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);

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

        // Gather uploaded files by field for later processing
        const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
        const uploadedFiles = [];
        if (req.files) {
            fields.forEach((field, idx) => {
                if (req.files[field] && req.files[field].length > 0) {
                    const file = req.files[field][0];
                    uploadedFiles.push({ order: idx + 1, file });
                }
            });
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

            // Resolve image URLs depending on environment
            let imageRows = [];
            if (uploadedFiles.length > 0) {
                if (isServerless) {
                    // Upload buffers to Supabase Storage
                    console.log('Uploading images to Supabase Storage...');
                    for (const item of uploadedFiles) {
                        const file = item.file;
                        const fileNameSafe = `${Date.now()}_${Math.floor(Math.random()*1000)}_${file.originalname}`.replace(/\s+/g, '_');
                        const storagePath = `products/${savedProduct.id}/${fileNameSafe}`;
                        const { error: uploadError } = await supabase.storage
                            .from('product-images')
                            .upload(storagePath, file.buffer, {
                                contentType: file.mimetype,
                                upsert: false,
                            });
                        if (uploadError) {
                            console.error('Supabase upload error:', uploadError);
                            continue;
                        }
                        const { data: publicData } = supabase.storage
                            .from('product-images')
                            .getPublicUrl(storagePath);
                        const publicUrl = publicData?.publicUrl;
                        if (publicUrl) {
                            imageRows.push({
                                product_id: savedProduct.id,
                                image_order: item.order,
                                url: publicUrl,
                            });
                            console.log(`Image uploaded: ${publicUrl}`);
                        }
                    }
                } else {
                    // Local dev: files saved to disk by uploadProduct
                    uploadedFiles.forEach((item) => {
                        const file = item.file;
                        const imageUrl = `${req.protocol}://${req.get('host')}/image/products/${file.filename}`;
                        imageRows.push({
                            product_id: savedProduct.id,
                            image_order: item.order,
                            url: imageUrl,
                        });
                    });
                }
            }

            // Fallback default image if none
            if (imageRows.length === 0) {
                const fallbackUrl = isServerless
                    ? 'https://picsum.photos/400/400?random=999'
                    : `${req.protocol}://${req.get('host')}/image/products/default-product.jpg`;
                imageRows.push({ product_id: savedProduct.id, image_order: 1, url: fallbackUrl });
            }

            // Insert image rows
            if (imageRows.length > 0) {
                const { error: imageError } = await supabase
                    .from('product_images')
                    .insert(imageRows);
                if (imageError) {
                    console.error('Error inserting product images:', imageError);
                } else {
                    console.log('Product images saved successfully');
                }
            }

        // Send a success response back to the client
        res.json({ success: true, message: "Product created successfully.", data: savedProduct });
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
