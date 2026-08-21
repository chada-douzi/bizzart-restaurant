const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  const cat = await db.collection('menucategories').findOne({ slug: 'plats-espagnol' });
  
  if (cat) {
    console.log('━━━ CATÉGORIE "PLATS ESPAGNOL" ━━━');
    console.log('ID:', cat._id.toString());
    console.log('Name FR:', cat.name.fr);
    console.log('Slug:', cat.slug);
    console.log('Image actuelle:', cat.image);
    console.log('PublicId actuel:', cat.publicId || 'N/A');
    console.log('Order:', cat.order);
  } else {
    console.log('❌ Catégorie introuvable');
  }
  
  await client.close();
})();
