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

  // Get all products with pagination and filters
  static async findAll(filters = {}, page = 1, limit = 10) {
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
      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });
      
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

  // Add product images
  static async addImages(productId, images) {
    try {
      const imageData = images.map(img => ({
        product_id: productId,
        image_order: img.image,
        url: img.url
      }));

      const { data, error } = await supabase
        .from('product_images')
        .insert(imageData)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error adding product images: ${error.message}`);
    }
  }

  // Update product images
  static async updateImages(productId, images) {
    try {
      // First delete existing images
      await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      // Then add new images
      return await this.addImages(productId, images);
    } catch (error) {
      throw new Error(`Error updating product images: ${error.message}`);
    }
  }

  // Get products by category
  static async findByCategory(categoryId, page = 1, limit = 10) {
    return await this.findAll({ categoryId }, page, limit);
  }

  // Get products by subcategory
  static async findBySubCategory(subCategoryId, page = 1, limit = 10) {
    return await this.findAll({ subCategoryId }, page, limit);
  }

  // Get products by seller
  static async findBySeller(sellerId, page = 1, limit = 10) {
    return await this.findAll({ sellerId }, page, limit);
  }

  // Search products
  static async search(searchTerm, page = 1, limit = 10) {
    return await this.findAll({ search: searchTerm }, page, limit);
  }

  // Get featured products (you can customize this logic)
  static async getFeatured(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:pro_category_id(name, image),
          subcategories:pro_sub_category_id(name),
          brands:pro_brand_id(name),
          product_images(*)
        `)
        .not('offer_price', 'is', null)
        .limit(limit)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error getting featured products: ${error.message}`);
    }
  }
}

module.exports = Product;
