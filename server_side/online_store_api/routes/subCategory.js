const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase'); // Assuming this is exported correctly
const asyncHandler = require('express-async-handler');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: "Sub-categories API is running",
        timestamp: new Date().toISOString()
    });
});

// Seed subcategories endpoint (for development)
router.post('/seed', asyncHandler(async (req, res) => {
    try {
        // Get all categories
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('id, name')
            .order('name');
        
        if (catError) {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to fetch categories",
                error: catError.message 
            });
        }
        
        if (categories.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "No categories found. Please add categories first." 
            });
        }
        
        // Add sample subcategories for each category
        const subcategoriesToAdd = [];
        
        categories.forEach(category => {
            let subcategoryNames = [];
            
            if (category.name.toLowerCase().includes('grain') || category.name.toLowerCase().includes('cereal')) {
                subcategoryNames = ['Rice', 'Wheat', 'Corn', 'Barley', 'Oats', 'Quinoa'];
            } else if (category.name.toLowerCase().includes('vegetable')) {
                subcategoryNames = ['Leafy Greens', 'Root Vegetables', 'Tomatoes', 'Peppers', 'Cucumbers'];
            } else if (category.name.toLowerCase().includes('fruit')) {
                subcategoryNames = ['Citrus Fruits', 'Tropical Fruits', 'Berries', 'Stone Fruits', 'Apples'];
            } else if (category.name.toLowerCase().includes('dairy')) {
                subcategoryNames = ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream'];
            } else {
                subcategoryNames = ['Type A', 'Type B', 'Type C', 'Type D', 'Type E'];
            }
            
            subcategoryNames.forEach(name => {
                subcategoriesToAdd.push({
                    name,
                    category_id: category.id
                });
            });
        });
        
        // Insert subcategories
        const { data: inserted, error: insertError } = await supabase
            .from('subcategories')
            .insert(subcategoriesToAdd)
            .select();
        
        if (insertError) {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to insert subcategories",
                error: insertError.message 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Successfully added ${inserted.length} subcategories`,
            data: inserted 
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to seed subcategories",
            error: error.message 
        });
    }
}));

// Get all sub-categories
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { data: subCategories, error } = await supabase
            .from('subcategories')
            .select(`
                id,
                name,
                created_at,
                updated_at,
                categories (
                    id,
                    name
                )
            `);

        if (error) {
            throw error;
        }

        // Transform the data to match frontend expectations
        const transformedSubCategories = subCategories.map(sub => ({
            _id: sub.id,
            name: sub.name,
            categoryId: {
                _id: sub.categories?.id || sub.category_id,
                name: sub.categories?.name || 'Unknown Category'
            },
            createdAt: sub.created_at,
            updatedAt: sub.updated_at
        }));
        
        res.json({ success: true, message: "Sub-categories retrieved successfully.", data: transformedSubCategories });
    } catch (error) {
        console.error('Error fetching sub-categories:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch sub-categories. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// Get a sub-category by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const subCategoryID = req.params.id;
        const { data: subCategory, error } = await supabase
            .from('subcategories')
            .select(`
                id,
                name,
                created_at,
                updated_at,
                categories (
                    id,
                    name
                )
            `)
            .eq('id', subCategoryID)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
            throw error;
        }

        if (!subCategory) {
            return res.status(404).json({ success: false, message: "Sub-category not found." });
        }

        // Transform to match frontend
        const transformedSubCategory = {
            _id: subCategory.id,
            name: subCategory.name,
            categoryId: {
                _id: subCategory.categories?.id,
                name: subCategory.categories?.name || 'Unknown Category'
            },
            createdAt: subCategory.created_at,
            updatedAt: subCategory.updated_at
        };

        res.json({ success: true, message: "Sub-category retrieved successfully.", data: transformedSubCategory });
    } catch (error) {
        console.error('Error fetching sub-category:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch sub-category. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// Create a new sub-category
router.post('/', asyncHandler(async (req, res) => {
    const { name, categoryId } = req.body;
    if (!name || !categoryId) {
        return res.status(400).json({ success: false, message: "Name and category ID are required." });
    }

    try {
        const { data: newSubCategory, error } = await supabase
            .from('subcategories')
            .insert({ name: name.trim(), category_id: categoryId })
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.json({ success: true, message: "Sub-category created successfully.", data: null });
    } catch (error) {
        console.error('Error creating sub-category:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a sub-category
router.put('/:id', asyncHandler(async (req, res) => {
    const subCategoryID = req.params.id;
    const { name, categoryId } = req.body;
    console.log(req.body);
    console.log(subCategoryID);
    if (!name || !categoryId) {
        return res.status(400).json({ success: false, message: "Name and category ID are required." });
    }

    try {
        const { data: updatedSubCategory, error } = await supabase
            .from('subcategories')
            .update({ name: name.trim(), category_id: categoryId })
            .eq('id', subCategoryID)
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (!updatedSubCategory) {
            return res.status(404).json({ success: false, message: "Sub-category not found." });
        }

        res.json({ success: true, message: "Sub-category updated successfully.", data: null });
    } catch (error) {
        console.error('Error updating sub-category:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a sub-category
router.delete('/:id', asyncHandler(async (req, res) => {
    const subCategoryID = req.params.id;
    try {
        // Check if any brand is associated with the sub-category
        // Assuming 'brands' table has 'subcategory_id' column
        const { count: brandCount, error: brandError } = await supabase
            .from('brands')
            .select('*', { count: 'exact', head: true })
            .eq('subcategory_id', subCategoryID);

        if (brandError) {
            throw brandError;
        }

        if (brandCount > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete sub-category. It is associated with one or more brands." });
        }

        // Check if any products reference this sub-category
        // Assuming 'products' table has 'pro_sub_category_id' column
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('pro_sub_category_id', subCategoryID);

        if (productError) {
            throw productError;
        }

        if (products && products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete sub-category. Products are referencing it." });
        }

        // If no brands or products are associated, proceed with deletion
        const { data: subCategory, error: deleteError } = await supabase
            .from('subcategories')
            .select('id')
            .eq('id', subCategoryID)
            .single();

        if (deleteError && deleteError.code !== 'PGRST116') {
            throw deleteError;
        }

        if (!subCategory) {
            return res.status(404).json({ success: false, message: "Sub-category not found." });
        }

        const { error: deleteSubError } = await supabase
            .from('subcategories')
            .delete()
            .eq('id', subCategoryID);

        if (deleteSubError) {
            throw deleteSubError;
        }

        res.json({ success: true, message: "Sub-category deleted successfully." });
    } catch (error) {
        console.error('Error deleting sub-category:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;