const { supabase } = require('../config/supabase');

class User {
  // Create a new user
  static async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  // Find user by external auth ID
  static async findByExternalAuthId(externalAuthId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('external_auth_id', externalAuthId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user by external auth ID: ${error.message}`);
    }
  }

  // Find user by external auth ID or email
  static async findByExternalIdOrEmail(externalAuthId, email) {
    try {
      // First try to find by external auth ID
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('external_auth_id', externalAuthId)
        .single();

      if (error && error.code === 'PGRST116') {
        // If not found, try by email
        const result = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .single();

        data = result.data;
        error = result.error;
      }

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user by external ID or email: ${error.message}`);
    }
  }

  // Search users by name
  static async searchByName(name) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('name', `%${name}%`)
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error searching users by name: ${error.message}`);
    }
  }

  // Update user
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // ✅ Get all users with optional pagination (limit = null = all)
  static async findAll(page = 1, limit = 10) {
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Only apply range if limit is set
      if (limit && limit > 0) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding users: ${error.message}`);
    }
  }

  // ✅ Get all users (no pagination, all pages)
  static async findAllNoLimit(batchSize = 1000) {
    try {
      let allUsers = [];
      let from = 0;
      let to = batchSize - 1;
      let fetched = [];

      do {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        fetched = data || [];
        allUsers = allUsers.concat(fetched);

        from += batchSize;
        to += batchSize;
      } while (fetched.length === batchSize);

      return allUsers;
    } catch (error) {
      throw new Error(`Error fetching all users: ${error.message}`);
    }
  }

  // ✅ Get users by role (with pagination or no limit)
  static async findByRole(role, page = 1, limit = 10) {
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', role)
        .order('created_at', { ascending: false });

      if (limit && limit > 0) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding users by role: ${error.message}`);
    }
  }
}

module.exports = User;
