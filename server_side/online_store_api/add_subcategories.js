const { supabase } = require('./config/supabase');

async function addSubcategories() {
  try {
    console.log('Adding subcategories to database...');
    
    // First, get all categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    
    if (catError) {
      console.error('Error fetching categories:', catError);
      return;
    }
    
    console.log('Found categories:', categories.map(c => c.name));
    
    if (categories.length === 0) {
      console.log('No categories found. Please add categories first.');
      return;
    }
    
    // Find the "Grains & Cereals" category
    const grainsCategory = categories.find(c => 
      c.name.toLowerCase().includes('grain') || 
      c.name.toLowerCase().includes('cereal')
    );
    
    if (!grainsCategory) {
      console.log('Grains & Cereals category not found. Using first available category.');
      const firstCategory = categories[0];
      
      // Add subcategories for the first category
      const subcategories = [
        { name: 'Rice', category_id: firstCategory.id },
        { name: 'Wheat', category_id: firstCategory.id },
        { name: 'Corn', category_id: firstCategory.id },
        { name: 'Oats', category_id: firstCategory.id }
      ];
      
      const { data, error } = await supabase
        .from('subcategories')
        .insert(subcategories)
        .select();
      
      if (error) {
        console.error('Error adding subcategories:', error);
      } else {
        console.log('Successfully added subcategories:', data.map(s => s.name));
      }
    } else {
      console.log('Found Grains & Cereals category:', grainsCategory.name);
      
      // Add subcategories for Grains & Cereals
      const subcategories = [
        { name: 'Rice', category_id: grainsCategory.id },
        { name: 'Wheat', category_id: grainsCategory.id },
        { name: 'Corn', category_id: grainsCategory.id },
        { name: 'Barley', category_id: grainsCategory.id },
        { name: 'Oats', category_id: grainsCategory.id },
        { name: 'Quinoa', category_id: grainsCategory.id },
        { name: 'Millet', category_id: grainsCategory.id }
      ];
      
      const { data, error } = await supabase
        .from('subcategories')
        .insert(subcategories)
        .select();
      
      if (error) {
        console.error('Error adding subcategories:', error);
      } else {
        console.log('Successfully added subcategories for Grains & Cereals:', data.map(s => s.name));
      }
    }
    
    // Add subcategories for other categories if they exist
    const otherCategories = categories.filter(c => 
      !c.name.toLowerCase().includes('grain') && 
      !c.name.toLowerCase().includes('cereal')
    );
    
    for (const category of otherCategories.slice(0, 3)) { // Limit to first 3 other categories
      let subcategoryNames = [];
      
      if (category.name.toLowerCase().includes('vegetable')) {
        subcategoryNames = ['Leafy Greens', 'Root Vegetables', 'Tomatoes', 'Peppers', 'Cucumbers'];
      } else if (category.name.toLowerCase().includes('fruit')) {
        subcategoryNames = ['Citrus Fruits', 'Tropical Fruits', 'Berries', 'Stone Fruits', 'Apples'];
      } else if (category.name.toLowerCase().includes('dairy')) {
        subcategoryNames = ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream'];
      } else {
        subcategoryNames = ['Type A', 'Type B', 'Type C', 'Type D', 'Type E'];
      }
      
      const subcategories = subcategoryNames.map(name => ({
        name,
        category_id: category.id
      }));
      
      const { data, error } = await supabase
        .from('subcategories')
        .insert(subcategories)
        .select();
      
      if (error) {
        console.error(`Error adding subcategories for ${category.name}:`, error);
      } else {
        console.log(`Successfully added subcategories for ${category.name}:`, data.map(s => s.name));
      }
    }
    
    // Verify all subcategories
    const { data: allSubcategories, error: verifyError } = await supabase
      .from('subcategories')
      .select(`
        *,
        categories:category_id(name)
      `)
      .order('name');
    
    if (verifyError) {
      console.error('Error verifying subcategories:', verifyError);
    } else {
      console.log(`\nTotal subcategories in database: ${allSubcategories.length}`);
      allSubcategories.forEach(sub => {
        console.log(`  - ${sub.name} (Category: ${sub.categories?.name || 'Unknown'})`);
      });
    }
    
  } catch (error) {
    console.error('Error adding subcategories:', error);
  }
}

addSubcategories();
