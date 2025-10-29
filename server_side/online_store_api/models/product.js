const { supabase } = require('../config/supabase');

class Product {
  // Create a new product
  static async create(productData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  // Find product by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:pro_category_id(name, image),
          subcategories:pro_sub_category_id(name),
          brands:pro_brand_id(name),
          variant_types:pro_variant_type_id(name, type),
          users:seller_id(name, email, business_name, verified),
          product_images(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding product by ID: ${error.message}`);
    }
  }

  // Get all products with pagination, filters, and sorting
  static async findAll(filters = {}, page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc') {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('products')
        .select(`
          *,
          categories:pro_category_id(name, image),
          subcategories:pro_sub_category_id(name),
          brands:pro_brand_id(name),
          variant_types:pro_variant_type_id(name, type),
          users:seller_id(name, email, business_name, verified),
          product_images(*)
        `, { count: 'exact' });

      // Apply filters
      if (filters.categoryId) {
        query = query.eq('pro_category_id', filters.categoryId);
      }
      if (filters.subCategoryId) {
        query = query.eq('pro_sub_category_id', filters.subCategoryId);
      }
      if (filters.brandId) {
        query = query.eq('pro_brand_id', filters.brandId);
      }
      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }
      if (filters.hidden !== undefined) {
        query = query.eq('is_hidden', !!filters.hidden);
      }
      if (filters.archived !== undefined) {
        query = query.eq('is_archived', !!filters.archived);
      }
      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Whitelist sorting
      const allowedSort = new Set(['created_at', 'price', 'name']);
      const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
      const ascending = String(sortOrder).toLowerCase() === 'asc';

      const { data, error, count } = await query
        .order(sortColumn, { ascending })
        .range(from, to);
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding products: ${error.message}`);
    }
  }

  // Update product
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }
  }

  // Delete product
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }
}

module.exports = Product;
