const { supabase } = require('../config/supabase');

class Post {
  // Create a new post
  static async create(postData) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating post: ${error.message}`);
    }
  }

  // Find post by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id(name, email),
          comments(
            *,
            users:user_id(name, email)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding post by ID: ${error.message}`);
    }
  }

  // Get all posts with pagination
  static async findAll(page = 1, limit = 10) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id(name, email),
          comments(
            *,
            users:user_id(name, email)
          )
        `, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding posts: ${error.message}`);
    }
  }

  // Get posts by user ID
  static async findByUserId(userId, page = 1, limit = 10) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id(name, email),
          comments(
            *,
            users:user_id(name, email)
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .range(from, to)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding posts by user ID: ${error.message}`);
    }
  }

  // Update post
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating post: ${error.message}`);
    }
  }

  // Delete post
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting post: ${error.message}`);
    }
  }
}

class Comment {
  // Create a new comment
  static async create(commentData) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating comment: ${error.message}`);
    }
  }

  // Find comment by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id(name, email),
          posts:post_id(title)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding comment by ID: ${error.message}`);
    }
  }

  // Get comments by post ID
  static async findByPostId(postId, page = 1, limit = 20) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id(name, email)
        `, { count: 'exact' })
        .eq('post_id', postId)
        .range(from, to)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      throw new Error(`Error finding comments by post ID: ${error.message}`);
    }
  }

  // Update comment
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating comment: ${error.message}`);
    }
  }

  // Delete comment
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`Error deleting comment: ${error.message}`);
    }
  }
}

module.exports = { Post, Comment };
