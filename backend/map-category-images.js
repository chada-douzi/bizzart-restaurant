const { MongoClient } = require('mongodb');

// Mapping: pour chaque catégorie, prendre l'image d'un plat représentatif
const CATEGORY_IMAGE_MAPPING = {
  'les-pizzas': 'Pizza Margherita', // ou tout autre plat pizza
  'pates': 'Pâtes BIZZ\'Art',
  'plats-espagnol': 'Paella 1 Personne',
  'salade': 'Salade César',
  'volailles': 'Escalope Ou Cuisse de Poulet',
  'viandes': 'Steak Grillé',
  'fruits-de-mer': null, // Chercher premier plat de cette catégorie
  'tacos': null,
  'makioub': null,
  'supplement': null,
  'soda': null
};

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ Mapping Images Catégories depuis MenuItems ━━━\n');
  
  const categories = await db.collection('menucategories').find({}).toArray();
  
  for (const cat of categories) {
    const targetItemName = CATEGORY_IMAGE_MAPPING[cat.slug];
    
    let imageUrl = null;
    
    if (targetItemName) {
      // Chercher le plat spécifique
      const item = await db.collection('menuitems').findOne({ 
        'name.fr': targetItemName,
        image: { $regex: 'cloudinary' }
      });
      if (item) {
        imageUrl = item.image;
      }
    }
    
    // Si pas de mapping ou pas trouvé, prendre le premier plat de la catégorie avec image Cloudinary
    if (!imageUrl) {
      const item = await db.collection('menuitems').findOne({ 
        category: cat._id,
        image: { $regex: 'cloudinary' }
      });
      if (item) {
        imageUrl = item.image;
      }
    }
    
    console.log(`${cat.name.fr} (${cat.slug}):`);
    if (imageUrl) {
      console.log(`  ✅ ${imageUrl}`);
    } else {
      console.log(`  ⚠️  Aucune image Cloudinary trouvée`);
    }
    console.log('');
  }
  
  await client.close();
})();
