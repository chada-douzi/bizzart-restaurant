const { MongoClient } = require('mongodb');
const https = require('https');
const http = require('http');

// Helper: vérifier URL HTTP
function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode === 200 });
      res.resume();
    });
    req.on('error', () => resolve({ url, status: 'ERROR', ok: false }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT', ok: false });
    });
  });
}

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ PRÉPARATION MAPPING IMAGES CATÉGORIES ━━━\n');
  
  const categories = await db.collection('menucategories').find({}).sort({ order: 1 }).toArray();
  const mapping = [];
  
  for (const cat of categories) {
    // Chercher premier MenuItem de cette catégorie avec image Cloudinary
    const item = await db.collection('menuitems').findOne({
      category: cat._id,
      image: { $regex: 'cloudinary' }
    });
    
    const newImageUrl = item ? item.image : null;
    
    mapping.push({
      categoryId: cat._id.toString(),
      categoryName: cat.name.fr,
      slug: cat.slug,
      oldImage: cat.image,
      newImage: newImageUrl,
      sourceItem: item ? item.name.fr : null
    });
  }
  
  // Afficher le mapping
  console.log('📋 MAPPING PROPOSÉ:\n');
  mapping.forEach((m, i) => {
    console.log(`${i + 1}. ${m.categoryName} (${m.slug})`);
    console.log(`   ID: ${m.categoryId}`);
    console.log(`   Avant: ${m.oldImage}`);
    if (m.newImage) {
      console.log(`   Après: ${m.newImage.substring(0, 80)}...`);
      console.log(`   Source: ${m.sourceItem}`);
    } else {
      console.log(`   Après: AUCUNE IMAGE`);
      console.log(`   Source: N/A`);
    }
    console.log('');
  });
  
  // Vérifier URLs Cloudinary
  console.log('━━━ VÉRIFICATION URLs CLOUDINARY ━━━\n');
  const urlsToCheck = mapping.filter(m => m.newImage).map(m => m.newImage);
  
  for (const url of urlsToCheck) {
    const result = await checkUrl(url);
    const status = result.ok ? '✅ 200 OK' : `❌ ${result.status}`;
    console.log(`${status}: ${url.substring(0, 70)}...`);
  }
  console.log('');
  
  // Compter
  const withImage = mapping.filter(m => m.newImage).length;
  const withoutImage = mapping.filter(m => !m.newImage).length;
  
  console.log('━━━ RÉSUMÉ ━━━');
  console.log(`Total catégories: ${mapping.length}`);
  console.log(`Avec image Cloudinary: ${withImage}`);
  console.log(`Sans image: ${withoutImage}`);
  if (withoutImage > 0) {
    const noImageCats = mapping.filter(m => !m.newImage).map(m => m.categoryName);
    console.log(`Catégories sans image: ${noImageCats.join(', ')}`);
  }
  
  // Sauvegarder mapping
  const fs = require('fs');
  fs.writeFileSync('migration-mapping.json', JSON.stringify(mapping, null, 2));
  console.log('\n✅ Mapping sauvegardé: migration-mapping.json');
  
  await client.close();
})();
