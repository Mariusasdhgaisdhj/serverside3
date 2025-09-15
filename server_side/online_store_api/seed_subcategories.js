const { supabase } = require('./config/supabase');

// Sample subcategories data
const subcategoriesData = [
  // Grains and Cereals
  { name: 'Rice', category_id: null }, // Will be updated with actual category ID
  { name: 'Wheat', category_id: null },
  { name: 'Corn', category_id: null },
  { name: 'Barley', category_id: null },
  { name: 'Oats', category_id: null },
  
  // Vegetables
  { name: 'Leafy Greens', category_id: null },
  { name: 'Root Vegetables', category_id: null },
  { name: 'Tomatoes', category_id: null },
  { name: 'Peppers', category_id: null },
  { name: 'Cucumbers', category_id: null },
  
  // Fruits
  { name: 'Citrus Fruits', category_id: null },
  { name: 'Tropical Fruits', category_id: null },
  { name: 'Berries', category_id: null },
  { name: 'Stone Fruits', category_id: null },
  { name: 'Apples', category_id: null },
  
  // Dairy Products
  { name: 'Milk', category_id: null },
  { name: 'Cheese', category_id: null },
  { name: 'Yogurt', category_id: null },
  { name: 'Butter', category_id: null },
  { name: 'Cream', category_id: null },
  
  // Meat and Poultry
  { name: 'Beef', category_id: null },
  { name: 'Pork', category_id: null },
  { name: 'Chicken', category_id: null },
  { name: 'Lamb', category_id: null },
  { name: 'Fish', category_id: null },
  
  // Herbs and Spices
  { name: 'Fresh Herbs', category_id: null },
  { name: 'Dried Herbs', category_id: null },
  { name: 'Spices', category_id: null },
  { name: 'Seasonings', category_id: null },
  { name: 'Salt and Pepper', category_id: null }
];

async function seedSubcategories() {
  try {
    console.log('Starting subcategory seeding...');
    
    // First, get all categories to map subcategories to them
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    
    if (categoriesError) {
      throw new Error(`Error fetching categories: ${categoriesError.message}`);
    }
    
    console.log(`Found ${categories.length} categories:`, categories.map(c => c.name));
    
    // Create a mapping of category names to IDs
    const categoryMap = {};
    categories.forEach(category => {
      categoryMap[category.name.toLowerCase()] = category.id;
    });
    
    // Map subcategories to categories based on name patterns
    const subcategoryMappings = [
      // Grains and Cereals
      { pattern: /rice|wheat|corn|barley|oats/i, categoryName: 'grains and cereals' },
      
      // Vegetables
      { pattern: /leafy|root|tomato|pepper|cucumber|vegetable/i, categoryName: 'vegetables' },
      
      // Fruits
      { pattern: /citrus|tropical|berr|stone|apple|fruit/i, categoryName: 'fruits' },
      
      // Dairy Products
      { pattern: /milk|cheese|yogurt|butter|cream|dairy/i, categoryName: 'dairy products' },
      
      // Meat and Poultry
      { pattern: /beef|pork|chicken|lamb|fish|meat|poultry/i, categoryName: 'meat and poultry' },
      
      // Herbs and Spices
      { pattern: /herb|spice|seasoning|salt|pepper/i, categoryName: 'herbs and spices' }
    ];
    
    // Assign category IDs to subcategories
    const subcategoriesWithCategoryIds = subcategoriesData.map(sub => {
      let categoryId = null;
      
      // Find matching category based on subcategory name
      for (const mapping of subcategoryMappings) {
        if (mapping.pattern.test(sub.name)) {
          const categoryName = mapping.categoryName;
          if (categoryMap[categoryName]) {
            categoryId = categoryMap[categoryName];
            break;
          }
        }
      }
      
      // If no specific match found, assign to first available category
      if (!categoryId && categories.length > 0) {
        categoryId = categories[0].id;
      }
      
      return {
        ...sub,
        category_id: categoryId
      };
    });
    
    // Filter out subcategories without category IDs
    const validSubcategories = subcategoriesWithCategoryIds.filter(sub => sub.category_id);
    
    console.log(`Prepared ${validSubcategories.length} subcategories for insertion`);
    
    // Insert subcategories in batches
    const batchSize = 10;
    for (let i = 0; i < validSubcategories.length; i += batchSize) {
      const batch = validSubcategories.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('subcategories')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      } else {
        console.log(`Successfully inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} subcategories`);
      }
    }
    
    console.log('Subcategory seeding completed!');
    
    // Verify the data
    const { data: insertedSubcategories, error: verifyError } = await supabase
      .from('subcategories')
      .select(`
        *,
        categories:category_id(name)
      `)
      .order('name');
    
    if (verifyError) {
      console.error('Error verifying inserted data:', verifyError);
    } else {
      console.log(`Verification: Found ${insertedSubcategories.length} subcategories in database`);
      insertedSubcategories.forEach(sub => {
        console.log(`  - ${sub.name} (Category: ${sub.categories?.name || 'Unknown'})`);
      });
    }
    
  } catch (error) {
    console.error('Error seeding subcategories:', error);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedSubcategories()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSubcategories };
