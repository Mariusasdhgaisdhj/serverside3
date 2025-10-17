const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const multer = require('multer');
const { uploadProduct } = require('../uploadFile');
const asyncHandler = require('express-async-handler');
const { supabase } = require('../config/supabase');
const OneSignal = require('onesignal-node');
const dotenv = require('dotenv');
dotenv.config();

// Get all products (pagination, filtering, sorting)
router.get('/', asyncHandler(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'desc';

        const filters = {
            sellerId: req.query.sellerId,
            categoryId: req.query.categoryId,
            subCategoryId: req.query.subCategoryId,
            brandId: req.query.brandId,
            minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
            maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
            search: req.query.search,
        };

        const result = await Product.findAll(filters, page, limit, sortBy, sortOrder);
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
        
        // Lightweight caching headers (30s) for list responses
        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        res.json({ 
            success: true, 
            message: "Products retrieved successfully.", 
            data: transformedProducts,
            total: result.total || 0,
            page,
            limit
        });
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
});
const memoryUploadFields = memoryUpload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
    { name: 'image5', maxCount: 1 }
]);
const memoryUploadAny = memoryUpload.any();

// create new product
router.post('/', (req, res, next) => {
    const handler = isServerless ? memoryUploadAny : uploadProduct.fields([
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
        console.log('Request headers content-type:', req.headers['content-type']);
        console.log('Request body keys:', Object.keys(req.body || {}));
        console.log('Request files:', Array.isArray(req.files) ? req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size })) : req.files);

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
            // Support both named fields and any()
            if (Array.isArray(req.files)) {
                req.files.forEach((file, idx) => {
                    uploadedFiles.push({ order: idx + 1, file });
                });
            } else {
                fields.forEach((field, idx) => {
                    if (req.files[field] && req.files[field].length > 0) {
                        const file = req.files[field][0];
                        uploadedFiles.push({ order: idx + 1, file });
                    }
                });
            }
        }
        console.log('Uploaded files detected:', uploadedFiles.map(u => ({ order: u.order, name: u.file?.originalname, size: u.file?.size })));

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
                        const { data: publicData, error: pubErr } = supabase.storage
                            .from('product-images')
                            .getPublicUrl(storagePath);
                        if (pubErr) {
                            console.error('Supabase getPublicUrl error:', pubErr);
                        }
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
                // No file reached the server; return 400 to surface the issue instead of silently falling back
                console.warn('No uploaded images detected; rejecting request to avoid silent fallback');
                return res.status(400).json({ success: false, message: 'No image file received by server. Ensure field name image1 and file < 4MB.', data: null });
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

// Update a product (JSON fields + optional image uploads)
router.put('/:id', (req, res, next) => {
    const handler = isServerless ? memoryUploadAny : uploadProduct.fields([
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 },
        { name: 'image3', maxCount: 1 },
        { name: 'image4', maxCount: 1 },
        { name: 'image5', maxCount: 1 }
    ]);
    handler(req, res, (err) => {
        if (err) {
            console.error('Update upload error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        next();
    });
}, asyncHandler(async (req, res) => {
    const productId = req.params.id;
    try {
        // Prepare update data (snake_case for DB)
        const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (description !== undefined) updateData.description = String(description).trim();
        if (quantity !== undefined) updateData.quantity = parseInt(quantity);
        if (price !== undefined) updateData.price = parseFloat(price);
        if (offerPrice !== undefined) updateData.offer_price = parseFloat(offerPrice);
        if (proCategoryId !== undefined) updateData.pro_category_id = proCategoryId;
        if (proSubCategoryId !== undefined) updateData.pro_sub_category_id = proSubCategoryId;
        if (proBrandId !== undefined) updateData.pro_brand_id = proBrandId;
        if (proVariantTypeId !== undefined) updateData.pro_variant_type_id = proVariantTypeId;
        if (proVariantId !== undefined) updateData.pro_variant_id = Array.isArray(proVariantId) ? proVariantId : [proVariantId];

        // Update product fields first (if any provided)
        let updatedProduct = null;
        if (Object.keys(updateData).length > 0) {
            updatedProduct = await Product.update(productId, updateData);
            if (!updatedProduct) {
                return res.status(404).json({ success: false, message: "Product not found." });
            }
        }

        // Handle optional image uploads
        const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
        const uploadedFiles = [];
        if (req.files) {
            if (Array.isArray(req.files)) {
                req.files.forEach((file, idx) => uploadedFiles.push({ order: idx + 1, file }));
            } else {
                fields.forEach((field, idx) => {
                    if (req.files[field] && req.files[field].length > 0) {
                        uploadedFiles.push({ order: idx + 1, file: req.files[field][0] });
                    }
                });
            }
        }

        if (uploadedFiles.length > 0) {
            const imageRows = [];

            if (isServerless) {
                for (const item of uploadedFiles) {
                    const file = item.file;
                    const safeName = `${Date.now()}_${Math.floor(Math.random()*1000)}_${file.originalname}`.replace(/\s+/g, '_');
                    const storagePath = `products/${productId}/${safeName}`;
                    const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
                    if (uploadError) {
                        console.error('Supabase upload error (update):', uploadError);
                        continue;
                    }
                    const { data: publicData, error: pubErr } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(storagePath);
                    if (pubErr) {
                        console.error('Supabase public URL error (update):', pubErr);
                        continue;
                    }
                    const publicUrl = publicData?.publicUrl;
                    if (publicUrl) {
                        imageRows.push({ product_id: productId, image_order: item.order, url: publicUrl });
                    }
                }
            } else {
                uploadedFiles.forEach((item) => {
                    const file = item.file;
                    const imageUrl = `${req.protocol}://${req.get('host')}/image/products/${file.filename}`;
                    imageRows.push({ product_id: productId, image_order: item.order, url: imageUrl });
                });
            }

            if (imageRows.length > 0) {
                // Replace existing rows for provided image_order(s)
                const ordersToReplace = imageRows.map(r => r.image_order);
                const { error: delErr } = await supabase
                    .from('product_images')
                    .delete()
                    .eq('product_id', productId)
                    .in('image_order', ordersToReplace);
                if (delErr) {
                    console.error('Error deleting old product images on update:', delErr);
                }

                const { error: insErr } = await supabase
                    .from('product_images')
                    .insert(imageRows);
                if (insErr) {
                    console.error('Error inserting updated product images:', insErr);
                }
            }
        }

        return res.json({ success: true, message: "Product updated successfully." });
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

// ============ BULK ENDPOINTS ============
// Accept CSV rows and optional zipped images is overkill here; instead support URL-based images per row
// POST /products/bulk { items: [{ sellerId,name,description,price,quantity,proCategoryId,proSubCategoryId,imageUrls:[] }, ...] }
router.post('/bulk', asyncHandler(async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items[] required' });
    }
    const results = [];
    for (const row of items) {
      try {
        const { sellerId, name, description, price, quantity, proCategoryId, proSubCategoryId, imageUrls } = row || {};
        if (!sellerId || !name || !price || !quantity || !proCategoryId || !proSubCategoryId) {
          results.push({ ok: false, message: 'missing required field(s)', name });
          continue;
        }
        const saved = await Product.create({
          seller_id: sellerId,
          name: String(name).trim(),
          description: description ? String(description).trim() : '',
          price: parseFloat(price) || 0,
          quantity: parseInt(quantity) || 0,
          pro_category_id: proCategoryId,
          pro_sub_category_id: proSubCategoryId,
        });
        // Handle image URLs (public)
        const images = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
        if (images.length > 0) {
          const rows = images.slice(0, 5).map((url, idx) => ({ product_id: saved.id, image_order: idx + 1, url }));
          const { error: imgErr } = await supabase.from('product_images').insert(rows);
          if (imgErr) console.error('bulk image insert error:', imgErr);
        }
        results.push({ ok: true, id: saved.id, name: saved.name });
      } catch (e) {
        console.error('bulk row error:', e);
        results.push({ ok: false, message: e.message });
      }
    }
    res.json({ success: true, message: 'Bulk processed', results });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}));

// ============ NOTIFICATIONS ============
// POST /products/:productId/notify  { type: 'stock_out', sellerId, productName }
router.post('/:productId/notify', asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const { type, sellerId, productName } = req.body || {};
    if (type !== 'stock_out' || !sellerId || !productId) {
      return res.status(400).json({ success: false, message: 'type stock_out, sellerId, productId required' });
    }

    const appId = process.env.ONE_SIGNAL_APP_ID;
    const apiKey = process.env.ONE_SIGNAL_REST_API_KEY;
    if (!appId || !apiKey) {
      return res.status(500).json({ success: false, message: 'OneSignal not configured' });
    }

    const client = new OneSignal.Client(appId, apiKey);
    const resp = await client.createNotification({
      app_id: appId,
      include_external_user_ids: [String(sellerId)],
      headings: { en: 'Product out of stock' },
      contents: { en: `'${productName || 'A product'}' is now out of stock. Please restock.` },
      // Ensure notification makes sound on both platforms
      android_sound: 'default',
      ios_sound: 'default',
      android_channel_id: process.env.ONE_SIGNAL_ANDROID_CHANNEL_ID || undefined,
      data: {
        type: 'stock_out',
        product_id: String(productId),
      },
    });
    return res.json({ success: true, message: 'Notification sent', data: { id: resp?.body?.id } });
  } catch (e) {
    console.error('product notify error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}));