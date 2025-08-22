const mongoose = require('mongoose');
const Category = require('./model/category');
const SubCategory = require('./model/subCategory');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrigrow';

// Sample data
const sampleCategories = [
  {
    name: 'Fruits & Vegetables',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400'
  },
  {
    name: 'Grains & Cereals',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'
  },
  {
    name: 'Dairy & Eggs',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'
  },
  {
    name: 'Meat & Poultry',
    image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400'
  },
  {
    name: 'Seafood',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400'
  },
  {
    name: 'Herbs & Spices',
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400'
  },
  {
    name: 'Nuts & Seeds',
    image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
  },
  {
    name: 'Organic Products',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'
  }
];

const sampleSubCategories = [
  // Fruits & Vegetables
  { name: 'Fresh Fruits', categoryName: 'Fruits & Vegetables' },
  { name: 'Fresh Vegetables', categoryName: 'Fruits & Vegetables' },
  { name: 'Leafy Greens', categoryName: 'Fruits & Vegetables' },
  { name: 'Root Vegetables', categoryName: 'Fruits & Vegetables' },
  
  // Grains & Cereals
  { name: 'Rice', categoryName: 'Grains & Cereals' },
  { name: 'Wheat', categoryName: 'Grains & Cereals' },
  { name: 'Corn', categoryName: 'Grains & Cereals' },
  { name: 'Oats', categoryName: 'Grains & Cereals' },
  { name: 'Barley', categoryName: 'Grains & Cereals' },
  
  // Dairy & Eggs
  { name: 'Milk', categoryName: 'Dairy & Eggs' },
  { name: 'Cheese', categoryName: 'Dairy & Eggs' },
  { name: 'Yogurt', categoryName: 'Dairy & Eggs' },
  { name: 'Eggs', categoryName: 'Dairy & Eggs' },
  { name: 'Butter', categoryName: 'Dairy & Eggs' },
  
  // Meat & Poultry
  { name: 'Beef', categoryName: 'Meat & Poultry' },
  { name: 'Pork', categoryName: 'Meat & Poultry' },
  { name: 'Chicken', categoryName: 'Meat & Poultry' },
  { name: 'Lamb', categoryName: 'Meat & Poultry' },
  { name: 'Turkey', categoryName: 'Meat & Poultry' },
  
  // Seafood
  { name: 'Fish', categoryName: 'Seafood' },
  { name: 'Shrimp', categoryName: 'Seafood' },
  { name: 'Crab', categoryName: 'Seafood' },
  { name: 'Mussels', categoryName: 'Seafood' },
  { name: 'Salmon', categoryName: 'Seafood' },
  
  // Herbs & Spices
  { name: 'Fresh Herbs', categoryName: 'Herbs & Spices' },
  { name: 'Dried Herbs', categoryName: 'Herbs & Spices' },
  { name: 'Whole Spices', categoryName: 'Herbs & Spices' },
  { name: 'Ground Spices', categoryName: 'Herbs & Spices' },
  
  // Nuts & Seeds
  { name: 'Almonds', categoryName: 'Nuts & Seeds' },
  { name: 'Walnuts', categoryName: 'Nuts & Seeds' },
  { name: 'Cashews', categoryName: 'Nuts & Seeds' },
  { name: 'Sunflower Seeds', categoryName: 'Nuts & Seeds' },
  { name: 'Chia Seeds', categoryName: 'Nuts & Seeds' },
  
  // Organic Products
  { name: 'Organic Fruits', categoryName: 'Organic Products' },
  { name: 'Organic Vegetables', categoryName: 'Organic Products' },
  { name: 'Organic Grains', categoryName: 'Organic Products' },
  { name: 'Organic Dairy', categoryName: 'Organic Products' }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Category.deleteMany({});
    await SubCategory.deleteMany({});
    console.log('Cleared existing categories and subcategories');

    // Insert categories
    const createdCategories = await Category.insertMany(sampleCategories);
    console.log(`Created ${createdCategories.length} categories`);

    // Create a map of category names to IDs
    const categoryMap = {};
    createdCategories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    // Insert subcategories with proper category references
    const subCategoriesToInsert = sampleSubCategories.map(sub => ({
      name: sub.name,
      categoryId: categoryMap[sub.categoryName]
    }));

    const createdSubCategories = await SubCategory.insertMany(subCategoriesToInsert);
    console.log(`Created ${createdSubCategories.length} subcategories`);

    console.log('Database seeding completed successfully!');
    
    // Display created data
    console.log('\nCategories created:');
    createdCategories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat._id})`);
    });

    console.log('\nSubcategories created:');
    createdSubCategories.forEach(sub => {
      const category = createdCategories.find(cat => cat._id.toString() === sub.categoryId.toString());
      console.log(`- ${sub.name} (Category: ${category?.name})`);
    });

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeding function
seedDatabase();
