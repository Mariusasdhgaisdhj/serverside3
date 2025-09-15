const express = require('express');
const router = express.Router();
const Variant = require('../models/variant');
const Product = require('../models/product');
const asyncHandler = require('express-async-handler');

// Get all variants (Supabase)
router.get('/', asyncHandler(async (req, res) => {
    try {
        const variants = await Variant.findAll();
        res.json({ success: true, message: "Variants retrieved successfully.", data: variants });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a variant by ID (Supabase)
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const variantID = req.params.id;
        const variant = await Variant.findById(variantID);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }
        res.json({ success: true, message: "Variant retrieved successfully.", data: variant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new variant (Supabase)
router.post('/', asyncHandler(async (req, res) => {
    const { name, variantTypeId } = req.body;
    if (!name || !variantTypeId) {
        return res.status(400).json({ success: false, message: "Name and VariantType ID are required." });
    }

    try {
        const created = await Variant.create({ name, variant_type_id: variantTypeId });
        res.json({ success: true, message: "Variant created successfully.", data: created });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a variant (Supabase)
router.put('/:id', asyncHandler(async (req, res) => {
    const variantID = req.params.id;
    const { name, variantTypeId } = req.body;
    if (!name || !variantTypeId) {
        return res.status(400).json({ success: false, message: "Name and VariantType ID are required." });
    }

    try {
        const updated = await Variant.update(variantID, { name, variant_type_id: variantTypeId });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }
        res.json({ success: true, message: "Variant updated successfully.", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a variant (Supabase)
router.delete('/:id', asyncHandler(async (req, res) => {
    const variantID = req.params.id;
    try {
        const ok = await Variant.delete(variantID);
        if (!ok) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }
        res.json({ success: true, message: "Variant deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));


module.exports = router;
