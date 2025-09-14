const { supabase } = require('../config/supabase');

class Brand {
  // Create a new brand
  static async create(brandData) {
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert([brandData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating brand: ${error.message}`);
    }
  }

  // Find brand by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          subcategories:subcategory_id(name, category_id)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding brand by ID: ${error.message}`);
    }
  }

  // Get all brands
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          subcategories:subcategory_id(name, category_id)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding brands: ${error.message}`);
    }
  }

  // Get brands by subcategory ID
  static async findBySubCategoryId(subCategoryId) {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          subcategories:subcategory_id(name, category_id)
        `)
        .eq('subcategory_id', subCategoryId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding brands by subcategory ID: ${error.message}`);
    }
  }

  // Update brand
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('brands')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating brand: ${error.message}`);
    }
  }

  // Delete brand
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting brand: ${error.message}`);
    }
  }
}

module.exports = Brand;
