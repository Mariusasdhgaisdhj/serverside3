const { supabase } = require('../config/supabase');

class Notification {
  // Create a new notification
  static async create(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating notification: ${error.message}`);
    }
  }

  // Find notification by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          users:user_id(name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding notification by ID: ${error.message}`);
    }
  }

  // Get notifications by user ID
  static async findByUserId(userId, page = 1, limit = 20) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('notifications')
        .select(`
          *,
          users:user_id(name, email)
        `, { count: 'exact' })
        .eq('user_id', userId)
        .range(from, to)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding notifications by user ID: ${error.message}`);
    }
  }

  // Get unread notifications by user ID
  static async findUnreadByUserId(userId, page = 1, limit = 20) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('notifications')
        .select(`
          *,
          users:user_id(name, email)
        `, { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false)
        .range(from, to)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding unread notifications by user ID: ${error.message}`);
    }
  }

  // Mark notification as read
  static async markAsRead(id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error marking notification as read: ${error.message}`);
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error marking all notifications as read: ${error.message}`);
    }
  }

  // Update notification
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating notification: ${error.message}`);
    }
  }

  // Delete notification
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting notification: ${error.message}`);
    }
  }

  // Delete all notifications for a user
  static async deleteAllByUserId(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting all notifications for user: ${error.message}`);
    }
  }
}

module.exports = Notification;
