# Seed Categories and Subcategories

This guide explains how to add food crops related categories and subcategories to the database.

## Method 1: Using the Seed Script (Recommended)

1. Make sure your server is running:
   ```bash
   cd serverside3/server_side/online_store_api
   npm start
   ```

2. Run the seed script:
   ```bash
   node seed_categories_simple.js
   ```

## Method 2: Using curl command

If your server is running on port 4000, you can use this curl command:

```bash
curl -X POST http://localhost:4000/api/categories/seed
```

## Method 3: Using the API directly

You can also call the seed endpoint from your frontend or any HTTP client:

```
POST http://localhost:4000/api/categories/seed
```

## What gets created:

### Categories (8 total):
- Fruits & Vegetables
- Grains & Cereals  
- Legumes & Pulses
- Nuts & Seeds
- Herbs & Spices
- Organic Products
- Dairy & Eggs
- Meat & Poultry

### Subcategories (56 total):
Each category has 5-7 relevant subcategories, including:
- Fresh Fruits, Fresh Vegetables, Leafy Greens, etc.
- Rice, Wheat, Corn, Oats, etc.
- Beans, Lentils, Chickpeas, etc.
- And many more...

## Notes:
- This will clear existing categories and subcategories before adding new ones
- Each category includes a high-quality image from Unsplash
- All categories are food crops related as requested
- The seed endpoint returns the count of created categories and subcategories
