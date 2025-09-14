const { supabase } = require('../config/supabase');

class Variant {
  // Create a new variant
  static async create(variantData) {
    try {
      const { data, error } = await supabase
        .from('variants')
        .insert([variantData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating variant: ${error.message}`);
    }
  }

  // Find variant by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('variants')
        .select(`
          *,
          variant_types:variant_type_id(name, type)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding variant by ID: ${error.message}`);
    }
  }

  // Get all variants
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('variants')
        .select(`
          *,
          variant_types:variant_type_id(name, type)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding variants: ${error.message}`);
    }
  }

  // Get variants by variant type ID
  static async findByVariantTypeId(variantTypeId) {
    try {
      const { data, error } = await supabase
        .from('variants')
        .select(`
          *,
          variant_types:variant_type_id(name, type)
        `)
        .eq('variant_type_id', variantTypeId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding variants by variant type ID: ${error.message}`);
    }
  }

  // Update variant
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('variants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating variant: ${error.message}`);
    }
  }

  // Delete variant
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('variants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting variant: ${error.message}`);
    }
  }
}

module.exports = Variant;
