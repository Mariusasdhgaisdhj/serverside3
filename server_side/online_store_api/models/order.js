const { supabase } = require('../config/supabase');

class Order {
  // Create a new order
  static async create(orderData) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating order: ${error.message}`);
    }
  }

  // Add order items
  static async addItems(orderId, items = []) {
    if (!items || items.length === 0) return true;
    const rows = items.map((it) => ({
      order_id: orderId,
      product_id: it.productID,
      product_name: it.productName,
      quantity: it.quantity,
      price: it.price,
      variant: it.variant,
    }));
    const { error } = await supabase.from('order_items').insert(rows);
    if (error) throw new Error(error.message);
    return true;
  }

  // Add shipping address
  static async addShippingAddress(orderId, addr) {
    if (!addr) return true;
    const row = {
      order_id: orderId,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postalCode,
      country: addr.country,
    };
    const { error } = await supabase.from('shipping_addresses').insert([row]);
    if (error) throw new Error(error.message);
    return true;
  }

  // Add billing address
  static async addBillingAddress(orderId, addr) {
    if (!addr) return true;
    const row = {
      order_id: orderId,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postalCode,
      country: addr.country,
      company_name: addr.companyName || null,
      tax_id: addr.taxId || null,
    };
    const { error } = await supabase.from('billing_addresses').insert([row]);
    if (error) throw new Error(error.message);
    return true;
  }

  // Find order by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users:user_id(name, email),
          coupons:coupon_id(coupon_code, discount_type, discount_amount),
          order_items(
            *,
            products:product_id(name, price, seller_id)
          ),
          shipping_addresses(*),
          billing_addresses(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding order by ID: ${error.message}`);
    }
  }

  // Get orders by user ID
  static async findByUserId(userId, page = 1, limit = 10) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('orders')
        .select(`
          *,
          coupons:coupon_id(coupon_code, discount_type, discount_amount),
          order_items(
            *,
            products:product_id(name, price, seller_id)
          ),
          shipping_addresses(*),
          billing_addresses(*)
        `, { count: 'exact' })
        .eq('user_id', userId)
        .range(from, to)
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding orders by user ID: ${error.message}`);
    }
  }

  // Get all orders with pagination and filters
  static async findAll(filters = {}, page = 1, limit = 10) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('orders')
        .select(`
          *,
          users:user_id(name, email),
          coupons:coupon_id(coupon_code, discount_type, discount_amount),
          order_items(
            *,
            products:product_id(name, price, seller_id)
          ),
          shipping_addresses(*),
          billing_addresses(*)
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.eq('order_status', filters.status);
      }
      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters.startDate) {
        query = query.gte('order_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('order_date', filters.endDate);
      }

      const { data, error, count } = await query
        .range(from, to)
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding orders: ${error.message}`);
    }
  }

  // Update order
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating order: ${error.message}`);
    }
  }

  // Update order status
  static async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ order_status: status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating order status: ${error.message}`);
    }
  }

  // Delete order
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting order: ${error.message}`);
    }
  }
}

module.exports = Order;
