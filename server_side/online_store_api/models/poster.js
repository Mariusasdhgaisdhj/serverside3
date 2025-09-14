const { supabase } = require('../config/supabase');

class Poster {
  // Create a new poster
  static async create(posterData) {
    try {
      const { data, error } = await supabase
        .from('posters')
        .insert([posterData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating poster: ${error.message}`);
    }
  }

  // Find poster by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('posters')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding poster by ID: ${error.message}`);
    }
  }

  // Get all posters
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('posters')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding posters: ${error.message}`);
    }
  }

  // Get all posters (including inactive) for admin
  static async findAllAdmin() {
    try {
      const { data, error } = await supabase
        .from('posters')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding all posters: ${error.message}`);
    }
  }

  // Update poster
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('posters')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating poster: ${error.message}`);
    }
  }

  // Delete poster
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('posters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting poster: ${error.message}`);
    }
  }

  // Toggle poster active status
  static async toggleActive(id) {
    try {
      // First get the current poster
      const poster = await this.findById(id);
      if (!poster) {
        throw new Error('Poster not found');
      }

      // Toggle the active status
      const { data, error } = await supabase
        .from('posters')
        .update({ is_active: !poster.is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error toggling poster active status: ${error.message}`);
    }
  }
}

module.exports = Poster;
