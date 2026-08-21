const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ MenuItems avec URLs Cloudinary ━━━\n');
  const items = await db.collection('menuitems')
    .find({ image: { $regex: 'cloudinary' } })
    .limit(10)
    .project({ name: 1, image: 1, category: 1 })
    .toArray();
  
  items.forEach(i => {
    console.log(`${i.name.fr}:`);
    console.log(`  ${i.image}`);
    console.log('');
  });
  
  console.log('\n━━━ Media Collection (si existe) ━━━\n');
  const mediaExists = await db.listCollections({ name: 'media' }).hasNext();
  if (mediaExists) {
    const media = await db.collection('media').find({}).limit(5).toArray();
    media.forEach(m => {
      console.log(`${m.title || m.name || 'Untitled'}:`);
      console.log(`  ${m.url || m.cloudinaryUrl}`);
      console.log('');
    });
  } else {
    console.log('Collection "media" non trouvée');
  }
  
  await client.close();
})();
