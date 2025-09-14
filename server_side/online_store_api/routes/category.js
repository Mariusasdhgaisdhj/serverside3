const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const SubCategory = require('../models/subCategory');
const Product = require('../models/product');
const { uploadCategory } = require('../uploadFile');
const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { supabase } = require('../config/supabase');

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






// Seed categories and subcategories
router.post('/seed', asyncHandler(async (req, res) => {
    try {
        // Food crops related categories with appropriate images
        const categories = [
            {
                name: 'Fruits & Vegetables',
                image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=300&fit=crop'
            },
            {
                name: 'Grains & Cereals',
                image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
            },
            {
                name: 'Legumes & Pulses',
                image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop'
            },
            {
                name: 'Nuts & Seeds',
                image: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400&h=300&fit=crop'
            },
            {
                name: 'Herbs & Spices',
                image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop'
            },
            {
                name: 'Organic Products',
                image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
            },
            {
                name: 'Dairy & Eggs',
                image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop'
            },
            {
                name: 'Meat & Poultry',
                image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop'
            }
        ];

        // Subcategories for each category
        const subcategories = [
            // Fruits & Vegetables
            { name: 'Fresh Fruits', categoryName: 'Fruits & Vegetables' },
            { name: 'Fresh Vegetables', categoryName: 'Fruits & Vegetables' },
            { name: 'Leafy Greens', categoryName: 'Fruits & Vegetables' },
            { name: 'Root Vegetables', categoryName: 'Fruits & Vegetables' },
            { name: 'Tropical Fruits', categoryName: 'Fruits & Vegetables' },
            { name: 'Citrus Fruits', categoryName: 'Fruits & Vegetables' },
            { name: 'Berries', categoryName: 'Fruits & Vegetables' },
            
            // Grains & Cereals
            { name: 'Rice', categoryName: 'Grains & Cereals' },
            { name: 'Wheat', categoryName: 'Grains & Cereals' },
            { name: 'Corn', categoryName: 'Grains & Cereals' },
            { name: 'Oats', categoryName: 'Grains & Cereals' },
            { name: 'Barley', categoryName: 'Grains & Cereals' },
            { name: 'Quinoa', categoryName: 'Grains & Cereals' },
            { name: 'Millet', categoryName: 'Grains & Cereals' },
            
            // Legumes & Pulses
            { name: 'Beans', categoryName: 'Legumes & Pulses' },
            { name: 'Lentils', categoryName: 'Legumes & Pulses' },
            { name: 'Chickpeas', categoryName: 'Legumes & Pulses' },
            { name: 'Peas', categoryName: 'Legumes & Pulses' },
            { name: 'Soybeans', categoryName: 'Legumes & Pulses' },
            { name: 'Black Beans', categoryName: 'Legumes & Pulses' },
            { name: 'Kidney Beans', categoryName: 'Legumes & Pulses' },
            
            // Nuts & Seeds
            { name: 'Almonds', categoryName: 'Nuts & Seeds' },
            { name: 'Walnuts', categoryName: 'Nuts & Seeds' },
            { name: 'Cashews', categoryName: 'Nuts & Seeds' },
            { name: 'Pistachios', categoryName: 'Nuts & Seeds' },
            { name: 'Pumpkin Seeds', categoryName: 'Nuts & Seeds' },
            { name: 'Sunflower Seeds', categoryName: 'Nuts & Seeds' },
            { name: 'Chia Seeds', categoryName: 'Nuts & Seeds' },
            
            // Herbs & Spices
            { name: 'Fresh Herbs', categoryName: 'Herbs & Spices' },
            { name: 'Dried Herbs', categoryName: 'Herbs & Spices' },
            { name: 'Spices', categoryName: 'Herbs & Spices' },
            { name: 'Seasoning Blends', categoryName: 'Herbs & Spices' },
            { name: 'Medicinal Herbs', categoryName: 'Herbs & Spices' },
            
            // Organic Products
            { name: 'Organic Fruits', categoryName: 'Organic Products' },
            { name: 'Organic Vegetables', categoryName: 'Organic Products' },
            { name: 'Organic Grains', categoryName: 'Organic Products' },
            { name: 'Organic Dairy', categoryName: 'Organic Products' },
            { name: 'Organic Meat', categoryName: 'Organic Products' },
            
            // Dairy & Eggs
            { name: 'Milk', categoryName: 'Dairy & Eggs' },
            { name: 'Cheese', categoryName: 'Dairy & Eggs' },
            { name: 'Yogurt', categoryName: 'Dairy & Eggs' },
            { name: 'Butter', categoryName: 'Dairy & Eggs' },
            { name: 'Eggs', categoryName: 'Dairy & Eggs' },
            { name: 'Cream', categoryName: 'Dairy & Eggs' },
            
            // Meat & Poultry
            { name: 'Beef', categoryName: 'Meat & Poultry' },
            { name: 'Pork', categoryName: 'Meat & Poultry' },
            { name: 'Chicken', categoryName: 'Meat & Poultry' },
            { name: 'Turkey', categoryName: 'Meat & Poultry' },
            { name: 'Lamb', categoryName: 'Meat & Poultry' },
            { name: 'Fish', categoryName: 'Meat & Poultry' }
        ];

        console.log('🌱 Starting to seed categories and subcategories...');
        
        // Clear existing data
        console.log('🗑️ Clearing existing categories and subcategories...');
        await supabase.from('subcategories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert categories
        console.log('📦 Inserting categories...');
        const { data: createdCategories, error: categoryError } = await supabase
            .from('categories')
            .insert(categories)
            .select();
        
        if (categoryError) {
            throw new Error(`Error creating categories: ${categoryError.message}`);
        }
        
        console.log(`✅ Created ${createdCategories.length} categories`);
        
        // Create a map of category names to IDs
        const categoryMap = {};
        createdCategories.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });
        
        // Insert subcategories with proper category references
        console.log('📦 Inserting subcategories...');
        const subCategoriesToInsert = subcategories.map(sub => ({
            name: sub.name,
            category_id: categoryMap[sub.categoryName]
        }));
        
        const { data: createdSubCategories, error: subCategoryError } = await supabase
            .from('subcategories')
            .insert(subCategoriesToInsert)
            .select();
        
        if (subCategoryError) {
            throw new Error(`Error creating subcategories: ${subCategoryError.message}`);
        }
        
        console.log(`✅ Created ${createdSubCategories.length} subcategories`);
        
        res.json({ 
            success: true, 
            message: "Categories and subcategories seeded successfully!",
            data: {
                categories: createdCategories.length,
                subcategories: createdSubCategories.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to seed categories and subcategories.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

module.exports = router;
