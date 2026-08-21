const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  // Get dish
  const dish = await db.collection('menuitems').findOne({ slug: 'paella-royale' });
  
  if (!dish) {
    console.log('❌ Plat "Paella Royale" introuvable');
    await client.close();
    return;
  }
  
  console.log('━━━ PLAT "PAELLA ROYALE" ACTUEL ━━━\n');
  console.log('ID:', dish._id.toString());
  console.log('Nom FR:', dish.name.fr);
  console.log('Slug:', dish.slug);
  console.log('Prix:', dish.price, 'DT');
  console.log('Catégorie:', dish.category);
  console.log('\nImage actuelle:', dish.image || 'N/A');
  console.log('PublicId actuel:', dish.publicId || 'N/A');
  console.log('ImageUrl actuel:', dish.imageUrl || 'N/A');
  
  // Get category to verify separation
  const category = await db.collection('menucategories').findOne({ slug: 'plats-espagnol' });
  
  if (category) {
    console.log('\n━━━ CATÉGORIE "PLATS ESPAGNOL" (pour référence) ━━━\n');
    console.log('ID:', category._id.toString());
    console.log('Nom FR:', category.name.fr);
    console.log('Image catégorie:', category.image);
    console.log('PublicId catégorie:', category.publicId || 'N/A');
    console.log('\n⚠️  Cette image catégorie NE DOIT PAS être modifiée ⚠️');
  }
  
  await client.close();
})();
