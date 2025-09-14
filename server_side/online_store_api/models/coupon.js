const { supabase } = require('../config/supabase');

class Coupon {
  // Create a new coupon
  static async create(couponData) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert([couponData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating coupon: ${error.message}`);
    }
  }

  // Find coupon by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          categories:applicable_category_id(name),
          subcategories:applicable_subcategory_id(name),
          products:applicable_product_id(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding coupon by ID: ${error.message}`);
    }
  }

  // Find coupon by code
  static async findByCode(code) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          categories:applicable_category_id(name),
          subcategories:applicable_subcategory_id(name),
          products:applicable_product_id(name)
        `)
        .eq('coupon_code', code.toUpperCase())
        .eq('status', 'active')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding coupon by code: ${error.message}`);
    }
  }

  // Get all coupons
  static async findAll(page = 1, limit = 10) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('coupons')
        .select(`
          *,
          categories:applicable_category_id(name),
          subcategories:applicable_subcategory_id(name),
          products:applicable_product_id(name)
        `, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding coupons: ${error.message}`);
    }
  }

  // Update coupon
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating coupon: ${error.message}`);
    }
  }

  // Delete coupon
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting coupon: ${error.message}`);
    }
  }
}

module.exports = Coupon;
