const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ ÉTAT FINAL MONGODB ━━━\n');
  
  const cats = await db.collection('menucategories').countDocuments();
  const items = await db.collection('menuitems').countDocuments();
  const supps = await db.collection('menuitems').countDocuments({
    tags: { $in: ['Supplement Pizza', 'Supplement Sandwich'] }
  });
  
  console.log('Catégories:', cats);
  console.log('Items Total:', items);
  console.log('Suppléments:', supps);
  console.log('Items originaux:', items - supps);
  
  console.log('\n━━━ VÉRIF IMAGES CATÉGORIES ━━━\n');
  
  const catsWithImg = await db.collection('menucategories')
    .find({})
    .sort({ order: 1 })
    .toArray();
  
  let cloudinary = 0, nullImg = 0, invalid = 0;
  
  catsWithImg.forEach(c => {
    if (!c.image) {
      nullImg++;
      console.log(`⬜ ${c.name.fr}: null`);
    } else if (c.image.includes('cloudinary')) {
      cloudinary++;
      console.log(`✅ ${c.name.fr}: Cloudinary`);
    } else {
      invalid++;
      console.log(`❌ ${c.name.fr}: INVALID - ${c.image.substring(0, 60)}`);
    }
  });
  
  console.log('\n━━━ RÉSUMÉ IMAGES ━━━');
  console.log(`✅ Cloudinary: ${cloudinary}/11`);
  console.log(`⬜ Null (Supplement): ${nullImg}/11`);
  console.log(`❌ Invalid: ${invalid}/11`);
  
  const allOk = cloudinary === 10 && nullImg === 1 && invalid === 0 && cats === 11 && items === 114;
  
  console.log('\n━━━ VALIDATION FINALE ━━━');
  if (allOk) {
    console.log('🎉 TOUT EST CORRECT!');
    console.log('   - 11 catégories ✅');
    console.log('   - 114 items ✅');
    console.log('   - 10 images Cloudinary ✅');
    console.log('   - 1 null (Supplement) ✅');
    console.log('   - 0 image invalide ✅');
  } else {
    console.log('⚠️  PROBLÈME DÉTECTÉ');
    console.log(`   Catégories: ${cats} (attendu: 11)`);
    console.log(`   Items: ${items} (attendu: 114)`);
    console.log(`   Images Cloudinary: ${cloudinary} (attendu: 10)`);
    console.log(`   Images null: ${nullImg} (attendu: 1)`);
    console.log(`   Images invalides: ${invalid} (attendu: 0)`);
  }
  
  await client.close();
})();
