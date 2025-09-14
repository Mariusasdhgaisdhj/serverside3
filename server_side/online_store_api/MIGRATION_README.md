# MongoDB to Supabase PostgreSQL Migration Guide

This guide will help you migrate your AgriReady3D e-commerce application from MongoDB to Supabase PostgreSQL.

## Prerequisites

1. **Supabase Account**: Create a Supabase project at [supabase.com](https://supabase.com)
2. **MongoDB Access**: Ensure you have access to your existing MongoDB database
3. **Node.js**: Make sure Node.js is installed on your system

## Setup Steps

### 1. Install Dependencies

```bash
cd serverside3/server_side/online_store_api
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `serverside3/server_side/online_store_api` directory with the following variables:

```env
# MongoDB Configuration (for migration)
MONGO_URL=your_mongodb_connection_string

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OneSignal Configuration
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_API_KEY=your_onesignal_api_key

# PayPal Configuration (if using PayPal)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# Other configurations
NODE_ENV=development
PORT=3000
```

### 3. Create PostgreSQL Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Execute the SQL script to create all tables and relationships

### 4. Run Data Migration

To migrate your existing data from MongoDB to Supabase:

```bash
node migration/migrate-to-supabase.js
```

This script will:
- Connect to your MongoDB database
- Connect to your Supabase PostgreSQL database
- Migrate all data from MongoDB collections to PostgreSQL tables
- Convert MongoDB ObjectIds to UUIDs
- Handle relationships and foreign keys
- Provide progress updates and error handling

### 5. Update Flutter App Configuration

Update your Flutter app's `defines.json` file with your Supabase credentials:

```json
{
  "supabase_url": "your_supabase_project_url",
  "supabase_anon_key": "your_supabase_anon_key"
}
```

## Database Schema Changes

### Key Changes from MongoDB to PostgreSQL:

1. **ObjectId to UUID**: All MongoDB ObjectIds are converted to PostgreSQL UUIDs
2. **Schema Structure**: MongoDB documents are normalized into relational tables
3. **Relationships**: Foreign key relationships are properly established
4. **Data Types**: MongoDB-specific types are converted to PostgreSQL equivalents

### New Table Structure:

- `users` - User accounts and profiles
- `categories` - Product categories
- `subcategories` - Product subcategories
- `brands` - Product brands
- `variant_types` - Product variant types
- `variants` - Product variants
- `products` - Product information
- `product_images` - Product images (separate table)
- `coupons` - Discount coupons
- `orders` - Order information
- `order_items` - Order line items (separate table)
- `shipping_addresses` - Shipping addresses (separate table)
- `conversations` - User conversations
- `messages` - Conversation messages
- `posts` - Forum posts
- `comments` - Post comments
- `notifications` - User notifications
- `posters` - Promotional posters

## API Changes

### Model Updates:

All model files have been updated to use Supabase instead of Mongoose:

- `models/user.js` - User management
- `models/product.js` - Product management
- `models/order.js` - Order management
- `models/category.js` - Category management
- `models/subCategory.js` - Subcategory management
- `models/brand.js` - Brand management
- `models/variantType.js` - Variant type management
- `models/variant.js` - Variant management
- `models/coupon.js` - Coupon management
- `models/message.js` - Messaging system
- `models/post.js` - Forum system

### Route Updates:

All API routes have been updated to use the new Supabase models. The API endpoints remain the same, but the underlying database operations now use PostgreSQL instead of MongoDB.

## Testing

After migration, test the following:

1. **User Authentication**: Login, registration, profile updates
2. **Product Management**: CRUD operations for products, categories, brands
3. **Order Processing**: Order creation, status updates, order history
4. **Messaging System**: Conversations and messages
5. **Forum System**: Posts and comments
6. **Admin Functions**: All administrative operations

## Troubleshooting

### Common Issues:

1. **Connection Errors**: Verify your Supabase URL and API key
2. **Migration Errors**: Check MongoDB connection string and data integrity
3. **Foreign Key Errors**: Ensure all referenced records exist before creating dependent records
4. **Data Type Errors**: Verify that data types match the PostgreSQL schema

### Rollback Plan:

If you need to rollback:
1. Keep your MongoDB database running
2. Update the model imports back to the original MongoDB models
3. Revert the `app.js` file to use MongoDB connection
4. Update your Flutter app to use the original API endpoints

## Support

If you encounter issues during migration:

1. Check the console logs for specific error messages
2. Verify your environment variables are correct
3. Ensure your Supabase project has the correct permissions
4. Test individual model operations before running the full migration

## Benefits of Migration

1. **Better Performance**: PostgreSQL offers better query performance for complex operations
2. **ACID Compliance**: Full ACID transactions for data consistency
3. **Better Relationships**: Proper foreign key constraints and relationships
4. **Scalability**: Better horizontal and vertical scaling options
5. **Real-time Features**: Supabase provides real-time subscriptions
6. **Authentication**: Built-in authentication and authorization
7. **Storage**: Integrated file storage for images and documents
