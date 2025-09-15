const { supabase } = require('./config/supabase');

async function testSubcategories() {
  try {
    console.log('Testing subcategories API...');
    
    // Test 1: Check if subcategories table exists and has data
    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select(`
        *,
        categories:category_id(name)
      `)
      .order('name');
    
    if (subError) {
      console.error('Error fetching subcategories:', subError);
      return;
    }
    
    console.log(`Found ${subcategories.length} subcategories in database`);
    
    if (subcategories.length === 0) {
      console.log('No subcategories found. Adding some sample data...');
      
      // First, get categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (catError) {
        console.error('Error fetching categories:', catError);
        return;
      }
      
      console.log(`Found ${categories.length} categories:`, categories.map(c => c.name));
      
      if (categories.length === 0) {
        console.log('No categories found. Please add categories first.');
        return;
      }
      
      // Add some sample subcategories
      const sampleSubcategories = [
        { name: 'Rice', category_id: categories[0].id },
        { name: 'Wheat', category_id: categories[0].id },
        { name: 'Corn', category_id: categories[0].id },
        { name: 'Leafy Greens', category_id: categories[1]?.id || categories[0].id },
        { name: 'Root Vegetables', category_id: categories[1]?.id || categories[0].id },
      ];
      
      const { data: inserted, error: insertError } = await supabase
        .from('subcategories')
        .insert(sampleSubcategories)
        .select();
      
      if (insertError) {
        console.error('Error inserting subcategories:', insertError);
      } else {
        console.log(`Successfully inserted ${inserted.length} subcategories`);
      }
    } else {
      // Show existing subcategories
      subcategories.forEach(sub => {
        console.log(`  - ${sub.name} (Category: ${sub.categories?.name || 'Unknown'})`);
      });
    }
    
    // Test 2: Test the API endpoint format
    console.log('\nTesting API response format...');
    const transformedSubCategories = subcategories.map(sub => ({
      _id: sub.id,
      name: sub.name,
      categoryId: {
        _id: sub.categories?.id || sub.category_id,
        name: sub.categories?.name || 'Unknown Category'
      },
      createdAt: sub.created_at,
      updatedAt: sub.updated_at
    }));
    
    console.log('Transformed data sample:');
    console.log(JSON.stringify(transformedSubCategories[0], null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSubcategories()
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSubcategories };
