const { MongoClient } = require('mongodb');
const https = require('https');

// URLs actuelles (AVANT swap)
const BEFORE = {
  volailles: 'https://res.cloudinary.com/gmpztbom/image/upload/v1787141436/bizzart/menu/categories/volailles.png',
  viandes: 'https://res.cloudinary.com/gmpztbom/image/upload/v1787141440/bizzart/menu/categories/viandes.jpg'
};

// URLs après swap (on inverse)
const AFTER = {
  volailles: BEFORE.viandes, // Volailles prend l'URL de Viandes
  viandes: BEFORE.volailles  // Viandes prend l'URL de Volailles
};

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode === 200 });
      res.resume();
    });
    req.on('error', () => resolve({ url, status: 'ERROR', ok: false }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT', ok: false });
    });
  });
}

(async () => {
  console.log('━━━ SWAP PHOTOS VOLAILLES ↔ VIANDES ━━━\n');
  
  // 1. Vérification URLs Cloudinary
  console.log('1️⃣ VÉRIFICATION URLs Cloudinary\n');
  
  const volaillesCheck = await checkUrl(BEFORE.volailles);
  const viandesCheck = await checkUrl(BEFORE.viandes);
  
  console.log(`Volailles (1000046316.png): ${volaillesCheck.ok ? '✅ HTTP 200' : '❌ ' + volaillesCheck.status}`);
  console.log(`Viandes (1000046311.jpg): ${viandesCheck.ok ? '✅ HTTP 200' : '❌ ' + viandesCheck.status}`);
  
  if (!volaillesCheck.ok || !viandesCheck.ok) {
    console.error('\n❌ ERREUR: Une ou plusieurs URLs Cloudinary sont inaccessibles');
    process.exit(1);
  }
  
  console.log('\n✅ Les deux URLs sont valides\n');
  
  // 2. Connexion MongoDB
  console.log('2️⃣ CONNEXION MongoDB\n');
  
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('✅ Connecté\n');
  
  // 3. État AVANT
  console.log('3️⃣ ÉTAT AVANT (MongoDB)\n');
  
  const volaillesBefore = await db.collection('menucategories').findOne({ slug: 'volailles' });
  const viandesBefore = await db.collection('menucategories').findOne({ slug: 'viandes' });
  
  console.log(`Volailles: ${volaillesBefore.image.substring(0, 70)}...`);
  console.log(`Viandes:   ${viandesBefore.image.substring(0, 70)}...`);
  console.log('');
  
  // 4. SWAP MongoDB
  console.log('4️⃣ SWAP MongoDB\n');
  
  const result1 = await db.collection('menucategories').updateOne(
    { slug: 'volailles' },
    { $set: { image: AFTER.volailles } }
  );
  
  const result2 = await db.collection('menucategories').updateOne(
    { slug: 'viandes' },
    { $set: { image: AFTER.viandes } }
  );
  
  console.log(`Volailles: ${result1.modifiedCount > 0 ? '✅ Modifié' : '⚠️  Pas de modification'}`);
  console.log(`Viandes:   ${result2.modifiedCount > 0 ? '✅ Modifié' : '⚠️  Pas de modification'}`);
  console.log('');
  
  // 5. État APRÈS
  console.log('5️⃣ ÉTAT APRÈS (MongoDB)\n');
  
  const volaillesAfter = await db.collection('menucategories').findOne({ slug: 'volailles' });
  const viandesAfter = await db.collection('menucategories').findOne({ slug: 'viandes' });
  
  console.log(`Volailles: ${volaillesAfter.image.substring(0, 70)}...`);
  console.log(`Viandes:   ${viandesAfter.image.substring(0, 70)}...`);
  console.log('');
  
  // 6. Vérification swap correct
  console.log('6️⃣ VÉRIFICATION SWAP\n');
  
  const swapOk = 
    volaillesAfter.image === AFTER.volailles &&
    viandesAfter.image === AFTER.viandes &&
    volaillesAfter.image === viandesBefore.image &&
    viandesAfter.image === volaillesBefore.image;
  
  if (swapOk) {
    console.log('✅ SWAP RÉUSSI');
    console.log('   - Volailles utilise maintenant l\'ancienne URL de Viandes');
    console.log('   - Viandes utilise maintenant l\'ancienne URL de Volailles');
  } else {
    console.log('❌ ERREUR SWAP');
    console.log('   - Les URLs n\'ont pas été correctement échangées');
  }
  
  console.log('');
  
  // 7. Vérification intégrité
  console.log('7️⃣ VÉRIFICATION INTÉGRITÉ\n');
  
  const cats = await db.collection('menucategories').countDocuments();
  const items = await db.collection('menuitems').countDocuments();
  
  console.log(`Catégories: ${cats} (attendu: 11)`);
  console.log(`Items: ${items} (attendu: 114)`);
  
  const integrityOk = cats === 11 && items === 114;
  
  if (integrityOk) {
    console.log('✅ INTÉGRITÉ PRÉSERVÉE');
  } else {
    console.log('❌ PROBLÈME INTÉGRITÉ');
  }
  
  console.log('');
  
  // 8. Résumé final
  console.log('━━━ RÉSUMÉ FINAL ━━━\n');
  
  console.log('AVANT:');
  console.log('  Volailles → volailles.png (1000046316.png)');
  console.log('  Viandes   → viandes.jpg (1000046311.jpg)');
  console.log('');
  console.log('APRÈS:');
  console.log('  Volailles → viandes.jpg (1000046311.jpg) ✅ SWAPPED');
  console.log('  Viandes   → volailles.png (1000046316.png) ✅ SWAPPED');
  console.log('');
  
  if (swapOk && integrityOk) {
    console.log('🎉 CORRECTION TERMINÉE AVEC SUCCÈS!');
  } else {
    console.log('⚠️  PROBLÈME DÉTECTÉ - Vérification manuelle requise');
  }
  
  await client.close();
})();
