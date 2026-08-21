// Quick verification script for menu data integrity
const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/bizzart';

async function verifyMenuData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Count categories
    const categoriesCount = await db.collection('menucategories').countDocuments();
    console.log(`📁 Categories: ${categoriesCount}`);
    
    // Count items
    const itemsCount = await db.collection('menuitems').countDocuments();
    console.log(`🍽️  Menu Items: ${itemsCount}`);
    
    // Get all categories
    const categories = await db.collection('menucategories')
      .find({})
      .project({ name: 1, slug: 1, image: 1 })
      .toArray();
    
    console.log('\n📋 Categories:');
    categories.forEach((cat, i) => {
      const hasImage = cat.image ? '🖼️' : '⬜';
      console.log(`  ${i + 1}. ${hasImage} ${cat.name.fr} (${cat.slug})`);
    });
    
    // Categories with images
    const catsWithImages = categories.filter(c => c.image).length;
    console.log(`\n🖼️  Categories with images: ${catsWithImages}/${categoriesCount}`);
    
    // Sample some items to verify data integrity
    const sampleItems = await db.collection('menuitems')
      .find({})
      .limit(5)
      .project({ name: 1, price: 1, category: 1 })
      .toArray();
    
    console.log('\n🔍 Sample items (first 5):');
    sampleItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name.fr} - ${item.price} DT`);
    });
    
    console.log('\n✅ Verification complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - ${categoriesCount} categories (expected: 11)`);
    console.log(`   - ${itemsCount} items (expected: 98)`);
    console.log(`   - ${catsWithImages} categories have photos`);
    
    if (categoriesCount === 11 && itemsCount === 98) {
      console.log('\n🎉 DATA INTEGRITY CONFIRMED: All 11 categories and 98 items preserved!');
    } else {
      console.log('\n⚠️  WARNING: Data counts do not match expected values!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verifyMenuData();
