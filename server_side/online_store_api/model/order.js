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
            products:product_id(name, price)
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
            products:product_id(name, price)
          ),
          shipping_addresses(*)
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
            products:product_id(name, price)
          ),
          shipping_addresses(*)
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

  // Add order items
  static async addItems(orderId, items) {
    try {
      const itemData = items.map(item => ({
        order_id: orderId,
        product_id: item.productID,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
        variant: item.variant
      }));

      const { data, error } = await supabase
        .from('order_items')
        .insert(itemData)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error adding order items: ${error.message}`);
    }
  }

  // Add shipping address
  static async addShippingAddress(orderId, address) {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .insert([{
          order_id: orderId,
          ...address
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error adding shipping address: ${error.message}`);
    }
  }

  // Add billing address
  static async addBillingAddress(orderId, address) {
    try {
      const { data, error } = await supabase
        .from('billing_addresses')
        .insert([{
          order_id: orderId,
          ...address
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error adding billing address: ${error.message}`);
    }
  }

  // Get order statistics
  static async getStats() {
    try {
      const { data: totalOrders, error: totalError } = await supabase
        .from('orders')
        .select('id', { count: 'exact' });

      const { data: pendingOrders, error: pendingError } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('order_status', 'pending');

      const { data: completedOrders, error: completedError } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('order_status', 'delivered');

      const { data: revenue, error: revenueError } = await supabase
        .from('orders')
        .select('total_price')
        .eq('order_status', 'delivered');

      if (totalError || pendingError || completedError || revenueError) {
        throw new Error('Error getting order statistics');
      }

      const totalRevenue = revenue?.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0) || 0;

      return {
        totalOrders: totalOrders?.length || 0,
        pendingOrders: pendingOrders?.length || 0,
        completedOrders: completedOrders?.length || 0,
        totalRevenue
      };
    } catch (error) {
      throw new Error(`Error getting order statistics: ${error.message}`);
    }
  }
}

module.exports = Order;
