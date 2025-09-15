const { supabase } = require('./config/supabase');

async function checkSubcategories() {
  try {
    console.log('Checking subcategories in database...');
    
    // Check if subcategories table exists and has data
    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select(`
        *,
        categories:category_id(name)
      `)
      .order('name');
    
    if (subError) {
      console.error('Error fetching subcategories:', subError);
      console.error('Error details:', JSON.stringify(subError, null, 2));
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
      
      // Add sample subcategories for the first category
      const sampleSubcategories = [
        { name: 'Rice', category_id: categories[0].id },
        { name: 'Wheat', category_id: categories[0].id },
        { name: 'Corn', category_id: categories[0].id },
        { name: 'Barley', category_id: categories[0].id },
        { name: 'Oats', category_id: categories[0].id }
      ];
      
      const { data: inserted, error: insertError } = await supabase
        .from('subcategories')
        .insert(sampleSubcategories)
        .select();
      
      if (insertError) {
        console.error('Error inserting subcategories:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      } else {
        console.log(`Successfully inserted ${inserted.length} subcategories`);
        console.log('Inserted subcategories:', inserted.map(s => s.name));
      }
    } else {
      console.log('Existing subcategories:');
      subcategories.forEach(sub => {
        console.log(`  - ${sub.name} (Category: ${sub.categories?.name || 'Unknown'})`);
      });
    }
    
    // Test the API response format
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
    
    console.log('Sample transformed data:');
    if (transformedSubCategories.length > 0) {
      console.log(JSON.stringify(transformedSubCategories[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error checking subcategories:', error);
  }
}

checkSubcategories();
