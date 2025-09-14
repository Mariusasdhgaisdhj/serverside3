const axios = require('axios');

async function seedCategories() {
    try {
        console.log('🌱 Seeding categories and subcategories...');
        
        const response = await axios.post('http://localhost:4000/api/categories/seed');
        
        if (response.data.success) {
            console.log('✅ Categories seeded successfully!');
            console.log(`📦 Created ${response.data.data.categories} categories`);
            console.log(`📦 Created ${response.data.data.subcategories} subcategories`);
        } else {
            console.error('❌ Failed to seed categories:', response.data.message);
        }
    } catch (error) {
        console.error('❌ Error seeding categories:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

// Run the seeding function
seedCategories();
