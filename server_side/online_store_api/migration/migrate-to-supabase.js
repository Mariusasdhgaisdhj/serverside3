const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// MongoDB connection
const mongoUrl = process.env.MONGO_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!mongoUrl || !supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables. Please check MONGO_URL, SUPABASE_URL, and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to convert MongoDB ObjectId to UUID
function objectIdToUuid(objectId) {
  // This is a simple conversion - in production, you might want a more sophisticated approach
  return objectId.toString();
}

// Helper function to convert MongoDB date to ISO string
function convertDate(date) {
  if (!date) return null;
  return new Date(date).toISOString();
}

async function migrateData() {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Migrate Users
    console.log('Migrating users...');
    const users = await db.collection('users').find({}).toArray();
    for (const user of users) {
      try {
        const userData = {
          id: objectIdToUuid(user._id),
          external_auth_id: user.externalAuthId || null,
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role || 'buyer',
          business_name: user.sellerProfile?.businessName || null,
          phone: user.sellerProfile?.phone || null,
          paypal_email: user.sellerProfile?.paypalEmail || null,
          verified: user.sellerProfile?.verified || false,
          created_at: convertDate(user.createdAt),
          updated_at: convertDate(user.updatedAt)
        };
        
        const { error } = await supabase
          .from('users')
          .upsert(userData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating user:', user._id, error);
        } else {
          console.log('Migrated user:', user.email);
        }
      } catch (err) {
        console.error('Error processing user:', user._id, err);
      }
    }
    
    // Migrate Categories
    console.log('Migrating categories...');
    const categories = await db.collection('categories').find({}).toArray();
    for (const category of categories) {
      try {
        const categoryData = {
          id: objectIdToUuid(category._id),
          name: category.name,
          image: category.image,
          created_at: convertDate(category.createdAt),
          updated_at: convertDate(category.updatedAt)
        };
        
        const { error } = await supabase
          .from('categories')
          .upsert(categoryData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating category:', category._id, error);
        } else {
          console.log('Migrated category:', category.name);
        }
      } catch (err) {
        console.error('Error processing category:', category._id, err);
      }
    }
    
    // Migrate SubCategories
    console.log('Migrating subcategories...');
    const subcategories = await db.collection('subcategories').find({}).toArray();
    for (const subcategory of subcategories) {
      try {
        const subcategoryData = {
          id: objectIdToUuid(subcategory._id),
          name: subcategory.name,
          category_id: objectIdToUuid(subcategory.categoryId),
          created_at: convertDate(subcategory.createdAt),
          updated_at: convertDate(subcategory.updatedAt)
        };
        
        const { error } = await supabase
          .from('subcategories')
          .upsert(subcategoryData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating subcategory:', subcategory._id, error);
        } else {
          console.log('Migrated subcategory:', subcategory.name);
        }
      } catch (err) {
        console.error('Error processing subcategory:', subcategory._id, err);
      }
    }
    
    // Migrate Brands
    console.log('Migrating brands...');
    const brands = await db.collection('brands').find({}).toArray();
    for (const brand of brands) {
      try {
        const brandData = {
          id: objectIdToUuid(brand._id),
          name: brand.name,
          subcategory_id: objectIdToUuid(brand.subcategoryId),
          created_at: convertDate(brand.createdAt),
          updated_at: convertDate(brand.updatedAt)
        };
        
        const { error } = await supabase
          .from('brands')
          .upsert(brandData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating brand:', brand._id, error);
        } else {
          console.log('Migrated brand:', brand.name);
        }
      } catch (err) {
        console.error('Error processing brand:', brand._id, err);
      }
    }
    
    // Migrate VariantTypes
    console.log('Migrating variant types...');
    const variantTypes = await db.collection('varianttypes').find({}).toArray();
    for (const variantType of variantTypes) {
      try {
        const variantTypeData = {
          id: objectIdToUuid(variantType._id),
          name: variantType.name,
          type: variantType.type,
          created_at: convertDate(variantType.createdAt),
          updated_at: convertDate(variantType.updatedAt)
        };
        
        const { error } = await supabase
          .from('variant_types')
          .upsert(variantTypeData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating variant type:', variantType._id, error);
        } else {
          console.log('Migrated variant type:', variantType.name);
        }
      } catch (err) {
        console.error('Error processing variant type:', variantType._id, err);
      }
    }
    
    // Migrate Variants
    console.log('Migrating variants...');
    const variants = await db.collection('variants').find({}).toArray();
    for (const variant of variants) {
      try {
        const variantData = {
          id: objectIdToUuid(variant._id),
          name: variant.name,
          variant_type_id: objectIdToUuid(variant.variantTypeId),
          created_at: convertDate(variant.createdAt),
          updated_at: convertDate(variant.updatedAt)
        };
        
        const { error } = await supabase
          .from('variants')
          .upsert(variantData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating variant:', variant._id, error);
        } else {
          console.log('Migrated variant:', variant.name);
        }
      } catch (err) {
        console.error('Error processing variant:', variant._id, err);
      }
    }
    
    // Migrate Products
    console.log('Migrating products...');
    const products = await db.collection('products').find({}).toArray();
    for (const product of products) {
      try {
        const productData = {
          id: objectIdToUuid(product._id),
          seller_id: product.sellerId ? objectIdToUuid(product.sellerId) : null,
          name: product.name,
          description: product.description,
          quantity: product.quantity,
          price: product.price,
          offer_price: product.offerPrice || null,
          pro_category_id: objectIdToUuid(product.proCategoryId),
          pro_sub_category_id: objectIdToUuid(product.proSubCategoryId),
          pro_brand_id: product.proBrandId ? objectIdToUuid(product.proBrandId) : null,
          pro_variant_type_id: product.proVariantTypeId ? objectIdToUuid(product.proVariantTypeId) : null,
          pro_variant_id: product.proVariantId || [],
          created_at: convertDate(product.createdAt),
          updated_at: convertDate(product.updatedAt)
        };
        
        const { error } = await supabase
          .from('products')
          .upsert(productData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating product:', product._id, error);
        } else {
          console.log('Migrated product:', product.name);
          
          // Migrate product images
          if (product.images && product.images.length > 0) {
            for (const image of product.images) {
              try {
                const imageData = {
                  product_id: objectIdToUuid(product._id),
                  image_order: image.image,
                  url: image.url
                };
                
                const { error: imageError } = await supabase
                  .from('product_images')
                  .insert(imageData);
                
                if (imageError) {
                  console.error('Error migrating product image:', imageError);
                }
              } catch (err) {
                console.error('Error processing product image:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error processing product:', product._id, err);
      }
    }
    
    // Migrate Coupons
    console.log('Migrating coupons...');
    const coupons = await db.collection('coupons').find({}).toArray();
    for (const coupon of coupons) {
      try {
        const couponData = {
          id: objectIdToUuid(coupon._id),
          coupon_code: coupon.couponCode,
          discount_type: coupon.discountType,
          discount_amount: coupon.discountAmount,
          minimum_purchase_amount: coupon.minimumPurchaseAmount,
          end_date: convertDate(coupon.endDate),
          status: coupon.status || 'active',
          applicable_category_id: coupon.applicableCategory ? objectIdToUuid(coupon.applicableCategory) : null,
          applicable_subcategory_id: coupon.applicableSubCategory ? objectIdToUuid(coupon.applicableSubCategory) : null,
          applicable_product_id: coupon.applicableProduct ? objectIdToUuid(coupon.applicableProduct) : null,
          created_at: convertDate(coupon.createdAt),
          updated_at: convertDate(coupon.updatedAt)
        };
        
        const { error } = await supabase
          .from('coupons')
          .upsert(couponData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating coupon:', coupon._id, error);
        } else {
          console.log('Migrated coupon:', coupon.couponCode);
        }
      } catch (err) {
        console.error('Error processing coupon:', coupon._id, err);
      }
    }
    
    // Migrate Orders
    console.log('Migrating orders...');
    const orders = await db.collection('orders').find({}).toArray();
    for (const order of orders) {
      try {
        const orderData = {
          id: objectIdToUuid(order._id),
          user_id: objectIdToUuid(order.userID),
          order_date: convertDate(order.orderDate),
          order_status: order.orderStatus || 'pending',
          total_price: order.totalPrice,
          payment_method: order.paymentMethod || null,
          coupon_id: order.couponCode ? objectIdToUuid(order.couponCode) : null,
          subtotal: order.orderTotal?.subtotal || null,
          discount: order.orderTotal?.discount || null,
          total: order.orderTotal?.total || null,
          tracking_url: order.trackingUrl || null,
          created_at: convertDate(order.createdAt),
          updated_at: convertDate(order.updatedAt)
        };
        
        const { error } = await supabase
          .from('orders')
          .upsert(orderData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating order:', order._id, error);
        } else {
          console.log('Migrated order:', order._id);
          
          // Migrate order items
          if (order.items && order.items.length > 0) {
            for (const item of order.items) {
              try {
                const itemData = {
                  order_id: objectIdToUuid(order._id),
                  product_id: objectIdToUuid(item.productID),
                  product_name: item.productName,
                  quantity: item.quantity,
                  price: item.price,
                  variant: item.variant || null
                };
                
                const { error: itemError } = await supabase
                  .from('order_items')
                  .insert(itemData);
                
                if (itemError) {
                  console.error('Error migrating order item:', itemError);
                }
              } catch (err) {
                console.error('Error processing order item:', err);
              }
            }
          }
          
          // Migrate shipping address
          if (order.shippingAddress) {
            try {
              const addressData = {
                order_id: objectIdToUuid(order._id),
                phone: order.shippingAddress.phone || null,
                street: order.shippingAddress.street || null,
                city: order.shippingAddress.city || null,
                state: order.shippingAddress.state || null,
                postal_code: order.shippingAddress.postalCode || null,
                country: order.shippingAddress.country || null
              };
              
              const { error: addressError } = await supabase
                .from('shipping_addresses')
                .insert(addressData);
              
              if (addressError) {
                console.error('Error migrating shipping address:', addressError);
              }
            } catch (err) {
              console.error('Error processing shipping address:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error processing order:', order._id, err);
      }
    }
    
    // Migrate Conversations and Messages
    console.log('Migrating conversations and messages...');
    const conversations = await db.collection('conversations').find({}).toArray();
    for (const conversation of conversations) {
      try {
        const conversationData = {
          id: objectIdToUuid(conversation._id),
          buyer_id: objectIdToUuid(conversation.buyerId),
          seller_id: objectIdToUuid(conversation.sellerId),
          created_at: convertDate(conversation.createdAt)
        };
        
        const { error } = await supabase
          .from('conversations')
          .upsert(conversationData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating conversation:', conversation._id, error);
        } else {
          console.log('Migrated conversation:', conversation._id);
        }
      } catch (err) {
        console.error('Error processing conversation:', conversation._id, err);
      }
    }
    
    const messages = await db.collection('messages').find({}).toArray();
    for (const message of messages) {
      try {
        const messageData = {
          id: objectIdToUuid(message._id),
          conversation_id: objectIdToUuid(message.conversationId),
          sender_id: objectIdToUuid(message.senderId),
          text: message.text,
          created_at: convertDate(message.createdAt)
        };
        
        const { error } = await supabase
          .from('messages')
          .upsert(messageData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating message:', message._id, error);
        } else {
          console.log('Migrated message:', message._id);
        }
      } catch (err) {
        console.error('Error processing message:', message._id, err);
      }
    }
    
    // Migrate Posts and Comments
    console.log('Migrating posts and comments...');
    const posts = await db.collection('posts').find({}).toArray();
    for (const post of posts) {
      try {
        const postData = {
          id: objectIdToUuid(post._id),
          user_id: objectIdToUuid(post.userId),
          title: post.title,
          content: post.content,
          created_at: convertDate(post.createdAt),
          updated_at: convertDate(post.updatedAt)
        };
        
        const { error } = await supabase
          .from('posts')
          .upsert(postData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error migrating post:', post._id, error);
        } else {
          console.log('Migrated post:', post.title);
          
          // Migrate comments
          if (post.comments && post.comments.length > 0) {
            for (const comment of post.comments) {
              try {
                const commentData = {
                  post_id: objectIdToUuid(post._id),
                  user_id: objectIdToUuid(comment.userId),
                  content: comment.content,
                  created_at: convertDate(comment.createdAt)
                };
                
                const { error: commentError } = await supabase
                  .from('comments')
                  .insert(commentData);
                
                if (commentError) {
                  console.error('Error migrating comment:', commentError);
                }
              } catch (err) {
                console.error('Error processing comment:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error processing post:', post._id, err);
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrateData().catch(console.error);
