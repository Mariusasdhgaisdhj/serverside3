const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const SubCategory = require('../models/subCategory');
const Product = require('../models/product');
const { uploadCategory } = require('../uploadFile');
const multer = require('multer');
const asyncHandler = require('express-async-handler');

// Get all categories
router.get('/', asyncHandler(async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch categories. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// Get a category by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;
        const category = await Category.findById(categoryID);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        res.json({ success: true, message: "Category retrieved successfully.", data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new category with image upload
router.post('/', asyncHandler(async (req, res) => {
    try {
        uploadCategory.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    err.message = 'File size is too large. Maximum filesize is 5MB.';
                }
                console.log(`Add category: ${err}`);
                return res.json({ success: false, message: err });
            } else if (err) {
                console.log(`Add category: ${err}`);
                return res.json({ success: false, message: err });
            }
            const { name } = req.body;
            let imageUrl = 'no_url';
            if (req.file) {
                imageUrl = `http://localhost:3000/image/category/${req.file.filename}`;
            }
            console.log('url ', req.file)

            if (!name) {
                return res.status(400).json({ success: false, message: "Name is required." });
            }

            try {
                const newCategory = await Category.create({
                    name: name,
                    image: imageUrl
                });
                res.json({ success: true, message: "Category created successfully.", data: newCategory });
            } catch (error) {
                console.error("Error creating category:", error);
                res.status(500).json({ success: false, message: error.message });
            }

        });

    } catch (err) {
        console.log(`Error creating category: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Update a category
router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;
        uploadCategory.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    err.message = 'File size is too large. Maximum filesize is 5MB.';
                }
                console.log(`Update category: ${err.message}`);
                return res.json({ success: false, message: err.message });
            } else if (err) {
                console.log(`Update category: ${err.message}`);
                return res.json({ success: false, message: err.message });
            }

            const { name } = req.body;
            let image = req.body.image;

            if (req.file) {
                image = `http://localhost:3000/image/category/${req.file.filename}`;
            }

            if (!name || !image) {
                return res.status(400).json({ success: false, message: "Name and image are required." });
            }

            try {
                const updatedCategory = await Category.update(categoryID, { name: name, image: image });
                if (!updatedCategory) {
                    return res.status(404).json({ success: false, message: "Category not found." });
                }
                res.json({ success: true, message: "Category updated successfully.", data: updatedCategory });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }

        });

    } catch (err) {
        console.log(`Error updating category: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Delete a category
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;

        // Check if any subcategories reference this category
        const subcategories = await SubCategory.findByCategoryId(categoryID);
        if (subcategories.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });
        }

        // Check if any products reference this category
        const products = await Product.findAll({ categoryId: categoryID });
        if (products.data && products.data.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });
        }

        // If no subcategories or products are referencing the category, proceed with deletion
        const deleted = await Category.delete(categoryID);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));






module.exports = router;
