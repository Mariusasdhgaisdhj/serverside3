const { supabase } = require('../config/supabase');

class Message {
  // Create a new message
  static async create(messageData) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating message: ${error.message}`);
    }
  }

  // Find message by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          users:sender_id(name, email),
          conversations:conversation_id(buyer_id, seller_id)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding message by ID: ${error.message}`);
    }
  }

  // Get messages by conversation ID
  static async findByConversationId(conversationId, page = 1, limit = 50) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('messages')
        .select(`
          *,
          users:sender_id(name, email)
        `, { count: 'exact' })
        .eq('conversation_id', conversationId)
        .range(from, to)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding messages by conversation ID: ${error.message}`);
    }
  }

  // Update message
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating message: ${error.message}`);
    }
  }

  // Delete message
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting message: ${error.message}`);
    }
  }
}

class Conversation {
  // Create a new conversation
  static async create(conversationData) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([conversationData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating conversation: ${error.message}`);
    }
  }

  // Find conversation by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          buyer:buyer_id(name, email, business_name, profilepicture),
          seller:seller_id(name, email, business_name, profilepicture)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding conversation by ID: ${error.message}`);
    }
  }

  // Find conversation by buyer and seller
  static async findByBuyerAndSeller(buyerId, sellerId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          buyer:buyer_id(name, email, business_name, profilepicture),
          seller:seller_id(name, email, business_name, profilepicture)
        `)
        .eq('buyer_id', buyerId)
        .eq('seller_id', sellerId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding conversation by buyer and seller: ${error.message}`);
    }
  }

  // Get conversations by user ID (as buyer or seller)
  static async findByUserId(userId, page = 1, limit = 10) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('conversations')
        .select(`
          *,
          buyer:buyer_id(name, email, business_name, profilepicture, firstname, lastname),
          seller:seller_id(name, email, business_name, profilepicture, firstname, lastname)
        `, { count: 'exact' })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .range(from, to)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding conversations by user ID: ${error.message}`);
    }
  }

  // Get or create conversation
  static async getOrCreate(buyerId, sellerId) {
    try {
      // First try to find existing conversation
      let conversation = await this.findByBuyerAndSeller(buyerId, sellerId);
      
      if (!conversation) {
        // Create new conversation if it doesn't exist
        conversation = await this.create({
          buyer_id: buyerId,
          seller_id: sellerId
        });
      }
      
      return conversation;
    } catch (error) {
      throw new Error(`Error getting or creating conversation: ${error.message}`);
    }
  }

  // Update conversation
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating conversation: ${error.message}`);
    }
  }

  // Delete conversation
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting conversation: ${error.message}`);
    }
  }
}

module.exports = { Message, Conversation };
