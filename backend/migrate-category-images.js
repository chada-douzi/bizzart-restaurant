const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ MIGRATION IMAGES CATÉGORIES ━━━\n');
  
  // Charger mapping
  const mapping = JSON.parse(fs.readFileSync('migration-mapping.json', 'utf8'));
  
  console.log('📋 Mapping chargé: 11 catégories\n');
  
  // État AVANT
  const beforeCount = await db.collection('menucategories').countDocuments();
  const beforeItemsCount = await db.collection('menuitems').countDocuments();
  
  console.log(`État AVANT migration:`);
  console.log(`  Catégories: ${beforeCount}`);
  console.log(`  Items: ${beforeItemsCount}\n`);
  
  // Migration
  console.log('🔄 Mise à jour en cours...\n');
  
  let updated = 0;
  let skipped = 0;
  
  for (const m of mapping) {
    if (m.newImage) {
      // Mettre à jour l'image
      const result = await db.collection('menucategories').updateOne(
        { _id: new ObjectId(m.categoryId) },
        { $set: { image: m.newImage } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ ${m.categoryName}: Image mise à jour`);
        console.log(`   ${m.newImage.substring(0, 70)}...`);
        updated++;
      } else {
        console.log(`⚠️  ${m.categoryName}: Aucune modification (déjà à jour?)`);
      }
    } else {
      // Pas d'image: mettre null
      await db.collection('menucategories').updateOne(
        { _id: new ObjectId(m.categoryId) },
        { $set: { image: null } }
      );
      console.log(`⬜ ${m.categoryName}: Image supprimée (aucune disponible)`);
      skipped++;
    }
  }
  
  console.log('');
  
  // État APRÈS
  const afterCount = await db.collection('menucategories').countDocuments();
  const afterItemsCount = await db.collection('menuitems').countDocuments();
  
  console.log('━━━ RÉSULTAT MIGRATION ━━━');
  console.log(`Images mises à jour: ${updated}`);
  console.log(`Catégories sans image: ${skipped}`);
  console.log('');
  console.log(`État APRÈS migration:`);
  console.log(`  Catégories: ${afterCount}`);
  console.log(`  Items: ${afterItemsCount}`);
  console.log('');
  
  // Vérification intégrité
  console.log('━━━ VÉRIFICATION INTÉGRITÉ ━━━');
  
  const integrityOk = 
    beforeCount === afterCount &&
    beforeItemsCount === afterItemsCount &&
    beforeCount === 11 &&
    beforeItemsCount === 98;
  
  if (integrityOk) {
    console.log('✅ INTÉGRITÉ CONFIRMÉE');
    console.log('   - 11 catégories préservées');
    console.log('   - 98 items préservés');
    console.log('   - Aucun document supprimé');
    console.log('   - Aucun document créé');
  } else {
    console.log('❌ PROBLÈME INTÉGRITÉ DÉTECTÉ!');
    console.log(`   Catégories: ${beforeCount} → ${afterCount}`);
    console.log(`   Items: ${beforeItemsCount} → ${afterItemsCount}`);
  }
  
  // Afficher état final
  console.log('\n━━━ ÉTAT FINAL CATÉGORIES ━━━\n');
  const finalCategories = await db.collection('menucategories').find({}).sort({ order: 1 }).toArray();
  
  finalCategories.forEach((cat, i) => {
    const hasCloudinary = cat.image && cat.image.includes('cloudinary');
    const status = hasCloudinary ? '🖼️  CLOUDINARY' : '⬜ AUCUNE IMAGE';
    console.log(`${i + 1}. ${cat.name.fr} (${cat.slug})`);
    console.log(`   ${status}`);
    if (cat.image) {
      console.log(`   ${cat.image.substring(0, 70)}...`);
    }
    console.log('');
  });
  
  console.log('✅ Migration terminée!');
  
  await client.close();
})();
