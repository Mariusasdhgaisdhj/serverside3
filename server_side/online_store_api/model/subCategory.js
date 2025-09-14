const { supabase } = require('../config/supabase');

class SubCategory {
  // Create a new subcategory
  static async create(subCategoryData) {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert([subCategoryData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating subcategory: ${error.message}`);
    }
  }

  // Find subcategory by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          categories:category_id(name, image)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding subcategory by ID: ${error.message}`);
    }
  }

  // Get all subcategories
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          categories:category_id(name, image)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding subcategories: ${error.message}`);
    }
  }

  // Get subcategories by category ID
  static async findByCategoryId(categoryId) {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          categories:category_id(name, image)
        `)
        .eq('category_id', categoryId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding subcategories by category ID: ${error.message}`);
    }
  }

  // Update subcategory
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating subcategory: ${error.message}`);
    }
  }

  // Delete subcategory
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting subcategory: ${error.message}`);
    }
  }
}

module.exports = SubCategory;
