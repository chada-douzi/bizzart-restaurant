const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ ÉTAT ACTUEL ━━━\n');
  
  // Catégorie Plats Espagnol
  const category = await db.collection('menucategories').findOne({ slug: 'plats-espagnol' });
  
  console.log('1️⃣ CATÉGORIE "Plats Espagnol"');
  console.log('   ID:', category._id.toString());
  console.log('   Image actuelle:', category.image);
  console.log('   PublicId:', category.publicId || 'N/A');
  
  // Extraire le timestamp de l'image actuelle
  const categoryTimestamp = category.image.match(/v(\d+)/)?.[1] || 'inconnu';
  console.log('   Timestamp:', categoryTimestamp);
  console.log('');
  
  // Plat Paella Royale
  const dish = await db.collection('menuitems').findOne({ slug: 'paella-royale' });
  
  console.log('2️⃣ PLAT "Paella Royale"');
  console.log('   ID:', dish._id.toString());
  console.log('   Nom:', dish.name.fr);
  console.log('   Prix:', dish.price, 'DT');
  console.log('   Image actuelle:', dish.image);
  console.log('   PublicId:', dish.publicId || 'N/A');
  
  const dishTimestamp = dish.image.match(/v(\d+)/)?.[1] || 'inconnu';
  console.log('   Timestamp:', dishTimestamp);
  console.log('');
  
  // Analyse
  console.log('━━━ ANALYSE ━━━\n');
  
  // Vérifier si "Plats Espagnol.png" est déjà utilisé pour la catégorie
  const isCorrectCategoryImage = category.image.includes('plats-espagnol') && 
                                  category.publicId === 'bizzart/menu/categories/plats-espagnol';
  
  console.log('Catégorie "Plats Espagnol":');
  console.log('   Utilise le bon fichier?', isCorrectCategoryImage ? '✅ OUI' : '❌ NON');
  console.log('   Action requise:', isCorrectCategoryImage ? 'Aucune (déjà correct)' : 'Remplacer par "Plats Espagnol.png"');
  console.log('');
  
  // Vérifier si "Paella Royale.png" est déjà utilisé pour le plat
  const isCorrectDishImage = dish.image.includes('paella-royale') &&
                             dish.publicId === 'bizzart/menu/paella-royale';
  
  console.log('Plat "Paella Royale":');
  console.log('   Utilise le bon fichier?', isCorrectDishImage ? '✅ OUI' : '❌ NON');
  console.log('   Action requise:', isCorrectDishImage ? 'Uniquement ajustement visuel' : 'Remplacer image');
  console.log('');
  
  await client.close();
})();
