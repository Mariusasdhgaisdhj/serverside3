const { supabase } = require('./config/supabase');

// Food crops related categories with appropriate images
const categories = [
  {
    name: 'Fruits & Vegetables',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=300&fit=crop'
  },
  {
    name: 'Grains & Cereals',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
  },
  {
    name: 'Legumes & Pulses',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop'
  },
  {
    name: 'Nuts & Seeds',
    image: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400&h=300&fit=crop'
  },
  {
    name: 'Herbs & Spices',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop'
  },
  {
    name: 'Organic Products',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
  },
  {
    name: 'Dairy & Eggs',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop'
  },
  {
    name: 'Meat & Poultry',
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop'
  }
];

// Subcategories for each category
const subcategories = [
  // Fruits & Vegetables
  { name: 'Fresh Fruits', categoryName: 'Fruits & Vegetables' },
  { name: 'Fresh Vegetables', categoryName: 'Fruits & Vegetables' },
  { name: 'Leafy Greens', categoryName: 'Fruits & Vegetables' },
  { name: 'Root Vegetables', categoryName: 'Fruits & Vegetables' },
  { name: 'Tropical Fruits', categoryName: 'Fruits & Vegetables' },
  { name: 'Citrus Fruits', categoryName: 'Fruits & Vegetables' },
  { name: 'Berries', categoryName: 'Fruits & Vegetables' },
  
  // Grains & Cereals
  { name: 'Rice', categoryName: 'Grains & Cereals' },
  { name: 'Wheat', categoryName: 'Grains & Cereals' },
  { name: 'Corn', categoryName: 'Grains & Cereals' },
  { name: 'Oats', categoryName: 'Grains & Cereals' },
  { name: 'Barley', categoryName: 'Grains & Cereals' },
  { name: 'Quinoa', categoryName: 'Grains & Cereals' },
  { name: 'Millet', categoryName: 'Grains & Cereals' },
  
  // Legumes & Pulses
  { name: 'Beans', categoryName: 'Legumes & Pulses' },
  { name: 'Lentils', categoryName: 'Legumes & Pulses' },
  { name: 'Chickpeas', categoryName: 'Legumes & Pulses' },
  { name: 'Peas', categoryName: 'Legumes & Pulses' },
  { name: 'Soybeans', categoryName: 'Legumes & Pulses' },
  { name: 'Black Beans', categoryName: 'Legumes & Pulses' },
  { name: 'Kidney Beans', categoryName: 'Legumes & Pulses' },
  
  // Nuts & Seeds
  { name: 'Almonds', categoryName: 'Nuts & Seeds' },
  { name: 'Walnuts', categoryName: 'Nuts & Seeds' },
  { name: 'Cashews', categoryName: 'Nuts & Seeds' },
  { name: 'Pistachios', categoryName: 'Nuts & Seeds' },
  { name: 'Pumpkin Seeds', categoryName: 'Nuts & Seeds' },
  { name: 'Sunflower Seeds', categoryName: 'Nuts & Seeds' },
  { name: 'Chia Seeds', categoryName: 'Nuts & Seeds' },
  
  // Herbs & Spices
  { name: 'Fresh Herbs', categoryName: 'Herbs & Spices' },
  { name: 'Dried Herbs', categoryName: 'Herbs & Spices' },
  { name: 'Spices', categoryName: 'Herbs & Spices' },
  { name: 'Seasoning Blends', categoryName: 'Herbs & Spices' },
  { name: 'Medicinal Herbs', categoryName: 'Herbs & Spices' },
  
  // Organic Products
  { name: 'Organic Fruits', categoryName: 'Organic Products' },
  { name: 'Organic Vegetables', categoryName: 'Organic Products' },
  { name: 'Organic Grains', categoryName: 'Organic Products' },
  { name: 'Organic Dairy', categoryName: 'Organic Products' },
  { name: 'Organic Meat', categoryName: 'Organic Products' },
  
  // Dairy & Eggs
  { name: 'Milk', categoryName: 'Dairy & Eggs' },
  { name: 'Cheese', categoryName: 'Dairy & Eggs' },
  { name: 'Yogurt', categoryName: 'Dairy & Eggs' },
  { name: 'Butter', categoryName: 'Dairy & Eggs' },
  { name: 'Eggs', categoryName: 'Dairy & Eggs' },
  { name: 'Cream', categoryName: 'Dairy & Eggs' },
  
  // Meat & Poultry
  { name: 'Beef', categoryName: 'Meat & Poultry' },
  { name: 'Pork', categoryName: 'Meat & Poultry' },
  { name: 'Chicken', categoryName: 'Meat & Poultry' },
  { name: 'Turkey', categoryName: 'Meat & Poultry' },
  { name: 'Lamb', categoryName: 'Meat & Poultry' },
  { name: 'Fish', categoryName: 'Meat & Poultry' }
];

async function seedCategories() {
  try {
    console.log('🌱 Starting to seed categories and subcategories...');
    
    // Clear existing data
    console.log('🗑️ Clearing existing categories and subcategories...');
    await supabase.from('subcategories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert categories
    console.log('📦 Inserting categories...');
    const { data: createdCategories, error: categoryError } = await supabase
      .from('categories')
      .insert(categories)
      .select();
    
    if (categoryError) {
      throw new Error(`Error creating categories: ${categoryError.message}`);
    }
    
    console.log(`✅ Created ${createdCategories.length} categories`);
    
    // Create a map of category names to IDs
    const categoryMap = {};
    createdCategories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    
    // Insert subcategories with proper category references
    console.log('📦 Inserting subcategories...');
    const subCategoriesToInsert = subcategories.map(sub => ({
      name: sub.name,
      category_id: categoryMap[sub.categoryName]
    }));
    
    const { data: createdSubCategories, error: subCategoryError } = await supabase
      .from('subcategories')
      .insert(subCategoriesToInsert)
      .select();
    
    if (subCategoryError) {
      throw new Error(`Error creating subcategories: ${subCategoryError.message}`);
    }
    
    console.log(`✅ Created ${createdSubCategories.length} subcategories`);
    
    console.log('🎉 Database seeding completed successfully!');
    
    // Display created data
    console.log('\n📋 Categories created:');
    createdCategories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id})`);
    });
    
    console.log('\n📋 Subcategories created:');
    createdSubCategories.forEach(sub => {
      const category = createdCategories.find(cat => cat.id === sub.category_id);
      console.log(`- ${sub.name} (Category: ${category?.name})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
if (require.main === module) {
  seedCategories();
}

module.exports = { seedCategories };
