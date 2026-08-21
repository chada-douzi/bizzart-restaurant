const { MongoClient } = require('mongodb');
const fs = require('fs');

const mapping = JSON.parse(fs.readFileSync('cloudinary-category-images-mapping.json', 'utf8'));

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ MISE À JOUR IMAGES CATÉGORIES MONGODB ━━━\n');
  
  // État AVANT
  const beforeCount = await db.collection('menucategories').countDocuments();
  const beforeItemsCount = await db.collection('menuitems').countDocuments();
  
  console.log(`État AVANT:`);
  console.log(`  Catégories: ${beforeCount}`);
  console.log(`  Items: ${beforeItemsCount}\n`);
  
  let updated = 0;
  
  for (const item of mapping) {
    const result = await db.collection('menucategories').updateOne(
      { slug: item.categorySlug },
      { $set: { image: item.cloudinaryUrl } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ ${item.categoryName}: Image mise à jour`);
      updated++;
    } else {
      console.log(`⚠️  ${item.categoryName}: Pas de modification`);
    }
  }
  
  // Supplement reste à null
  await db.collection('menucategories').updateOne(
    { slug: 'supplement' },
    { $set: { image: null } }
  );
  console.log(`⬜ Supplement: Image null (aucune photo)`);
  
  console.log('');
  
  // État APRÈS
  const afterCount = await db.collection('menucategories').countDocuments();
  const afterItemsCount = await db.collection('menuitems').countDocuments();
  
  console.log(`État APRÈS:`);
  console.log(`  Catégories: ${afterCount}`);
  console.log(`  Items: ${afterItemsCount}\n`);
  
  // Vérification intégrité
  console.log('━━━ VÉRIFICATION INTÉGRITÉ ━━━');
  
  const integrityOk = 
    beforeCount === afterCount &&
    beforeItemsCount === afterItemsCount &&
    beforeCount === 11 &&
    beforeItemsCount === 114;
  
  if (integrityOk) {
    console.log('✅ INTÉGRITÉ CONFIRMÉE');
    console.log('   - 11 catégories préservées');
    console.log('   - 114 items préservés (98 + 16)');
    console.log('   - Aucun document supprimé');
  } else {
    console.log('❌ PROBLÈME INTÉGRITÉ!');
    console.log(`   Catégories: ${beforeCount} → ${afterCount}`);
    console.log(`   Items: ${beforeItemsCount} → ${afterItemsCount}`);
  }
  
  // Afficher état final
  console.log('\n━━━ ÉTAT FINAL CATÉGORIES ━━━\n');
  const finalCategories = await db.collection('menucategories')
    .find({})
    .sort({ order: 1 })
    .toArray();
  
  finalCategories.forEach((cat, i) => {
    const hasCloudinary = cat.image && cat.image.includes('cloudinary');
    const status = hasCloudinary ? '🖼️  CLOUDINARY' : '⬜ AUCUNE IMAGE';
    console.log(`${i + 1}. ${cat.name.fr} (${cat.slug})`);
    console.log(`   ${status}`);
    if (cat.image) {
      console.log(`   ${cat.image.substring(0, 90)}...`);
    }
    console.log('');
  });
  
  console.log(`✅ Mise à jour terminée! ${updated} images modifiées.\n`);
  
  await client.close();
})();
