const { supabase } = require('../config/supabase');

class VariantType {
  // Create a new variant type
  static async create(variantTypeData) {
    try {
      const { data, error } = await supabase
        .from('variant_types')
        .insert([variantTypeData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating variant type: ${error.message}`);
    }
  }

  // Find variant type by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('variant_types')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding variant type by ID: ${error.message}`);
    }
  }

  // Get all variant types
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('variant_types')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding variant types: ${error.message}`);
    }
  }

  // Update variant type
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('variant_types')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating variant type: ${error.message}`);
    }
  }

  // Delete variant type
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('variant_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting variant type: ${error.message}`);
    }
  }
}

module.exports = VariantType;
