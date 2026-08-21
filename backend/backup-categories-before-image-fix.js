const { MongoClient } = require('mongodb');
const fs = require('fs');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ BACKUP MENUCATEGORIES AVANT MIGRATION ━━━\n');
  
  // Backup complet
  const categories = await db.collection('menucategories').find({}).toArray();
  const itemsCount = await db.collection('menuitems').countDocuments();
  
  const backup = {
    timestamp: new Date().toISOString(),
    categoriesCount: categories.length,
    itemsCount: itemsCount,
    categories: categories
  };
  
  const filename = `backup-categories-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  
  console.log(`✅ Backup créé: ${filename}`);
  console.log(`📁 ${categories.length} catégories sauvegardées`);
  console.log(`🍽️  ${itemsCount} items (référence)`);
  console.log('');
  
  console.log('━━━ ÉTAT AVANT MIGRATION ━━━\n');
  categories.forEach(cat => {
    console.log(`${cat.name.fr} (${cat.slug})`);
    console.log(`  ID: ${cat._id}`);
    console.log(`  Image actuelle: ${cat.image || 'AUCUNE'}`);
    console.log('');
  });
  
  await client.close();
})();
