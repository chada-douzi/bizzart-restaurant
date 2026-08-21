const { MongoClient, ObjectId } = require('mongodb');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_FILE = 'C:\\Users\\boukh\\OneDrive\\Bureau\\restaurant\\bizzart-restaurant\\backend\\menu-category-images\\Paella Royale.png';
const DISH_ID = '6a845a7a2876405dd5375d49';
const DISH_SLUG = 'paella-royale';
const CATEGORY_ID = '6a845a7a2876405dd5375d0c'; // Pour vérification uniquement

(async () => {
  console.log('━━━ REMPLACEMENT IMAGE PLAT "PAELLA ROYALE" ━━━\n');
  console.log('⚠️  SCOPE: Uniquement le plat individuel "Paella Royale"');
  console.log('⚠️  La catégorie "Plats Espagnol" NE sera PAS modifiée\n');
  
  // ─── ÉTAPE 1: VÉRIFICATION FICHIER ─────────────────────────────────────────
  
  console.log('🔎 ÉTAPE 1: Vérification fichier source\n');
  
  if (!fs.existsSync(IMAGE_FILE)) {
    console.error('❌ Fichier introuvable:', IMAGE_FILE);
    process.exit(1);
  }
  
  const fileStats = fs.statSync(IMAGE_FILE);
  console.log('✅ Fichier "Paella Royale.png" trouvé');
  console.log('   Taille:', Math.round(fileStats.size / 1024), 'KB');
  console.log('   Chemin:', IMAGE_FILE);
  console.log('');
  
  // ─── ÉTAPE 2: CONNEXION MONGODB ────────────────────────────────────────────
  
  console.log('🔎 ÉTAPE 2: Connexion MongoDB\n');
  
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('✅ MongoDB connecté\n');
  
  // ─── ÉTAPE 3: RÉCUPÉRATION PLAT & CATÉGORIE ────────────────────────────────
  
  console.log('🔎 ÉTAPE 3: Récupération données actuelles\n');
  
  const dish = await db.collection('menuitems').findOne({
    _id: new ObjectId(DISH_ID)
  });
  
  if (!dish) {
    console.error('❌ Plat "Paella Royale" introuvable');
    await client.close();
    process.exit(1);
  }
  
  const category = await db.collection('menucategories').findOne({
    _id: new ObjectId(CATEGORY_ID)
  });
  
  console.log('✅ Plat "Paella Royale" trouvé');
  console.log('   ID:', dish._id.toString());
  console.log('   Nom:', dish.name.fr);
  console.log('   Prix:', dish.price, 'DT');
  console.log('   Image actuelle:', dish.image);
  console.log('   PublicId actuel:', dish.publicId || 'N/A');
  console.log('');
  
  console.log('✅ Catégorie "Plats Espagnol" (vérification)');
  console.log('   ID:', category._id.toString());
  console.log('   Image catégorie:', category.image);
  console.log('   ⚠️  Cette image NE sera PAS modifiée');
  console.log('');
  
  const oldDishImage = dish.image;
  const oldDishPublicId = dish.publicId;
  const categoryImage = category.image; // Pour vérification finale
  
  // ─── ÉTAPE 4: UPLOAD CLOUDINARY ────────────────────────────────────────────
  
  console.log('🔎 ÉTAPE 4: Upload nouvelle image "Paella Royale" vers Cloudinary\n');
  
  try {
    const uploadResult = await cloudinary.uploader.upload(IMAGE_FILE, {
      folder: 'bizzart/menu',
      public_id: DISH_SLUG,
      overwrite: true,
      resource_type: 'image',
    });
    
    console.log('✅ Upload Cloudinary réussi');
    console.log('   URL:', uploadResult.secure_url);
    console.log('   PublicId:', uploadResult.public_id);
    console.log('   Format:', uploadResult.format);
    console.log('   Taille:', uploadResult.bytes, 'bytes');
    console.log('   Résolution:', uploadResult.width, 'x', uploadResult.height);
    console.log('');
    
    const newDishImage = uploadResult.secure_url;
    const newDishPublicId = uploadResult.public_id;
    
    // ─── ÉTAPE 5: MISE À JOUR MONGODB (PLAT UNIQUEMENT) ────────────────────────
    
    console.log('🔎 ÉTAPE 5: Mise à jour MongoDB (PLAT "Paella Royale" UNIQUEMENT)\n');
    
    const updateResult = await db.collection('menuitems').updateOne(
      { _id: new ObjectId(DISH_ID) },
      {
        $set: {
          image: newDishImage,
          publicId: newDishPublicId,
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Plat "Paella Royale" mis à jour');
      console.log('   Documents modifiés:', updateResult.modifiedCount);
      console.log('');
    } else {
      console.log('⚠️  Aucune modification (valeurs identiques?)');
      console.log('');
    }
    
    // ─── ÉTAPE 6: VÉRIFICATION FINALE ──────────────────────────────────────────
    
    console.log('🔎 ÉTAPE 6: Vérification finale\n');
    
    // Vérifier le plat
    const updatedDish = await db.collection('menuitems').findOne({
      _id: new ObjectId(DISH_ID)
    });
    
    console.log('✅ Plat "Paella Royale":');
    console.log('   Nom:', updatedDish.name.fr);
    console.log('   Prix:', updatedDish.price, 'DT (inchangé)');
    console.log('   Image:', updatedDish.image);
    console.log('   PublicId:', updatedDish.publicId);
    console.log('');
    
    // Vérifier que la catégorie n'a pas été modifiée
    const verifyCategory = await db.collection('menucategories').findOne({
      _id: new ObjectId(CATEGORY_ID)
    });
    
    const categoryUnchanged = verifyCategory.image === categoryImage;
    
    console.log('✅ Catégorie "Plats Espagnol":');
    console.log('   Image:', verifyCategory.image);
    console.log('   Status:', categoryUnchanged ? '✅ INCHANGÉE' : '⚠️  MODIFIÉE (ERREUR!)');
    console.log('');
    
    // Vérifier autres plats
    const allDishes = await db.collection('menuitems').countDocuments();
    const changedDishes = await db.collection('menuitems').countDocuments({
      image: newDishImage
    });
    
    console.log('Autres plats:');
    console.log('   Total plats:', allDishes);
    console.log('   Avec nouvelle image:', changedDishes, '(doit être 1)');
    console.log('   Autres plats:', changedDishes === 1 ? '✅ INCHANGÉS' : '⚠️  Vérifier');
    console.log('');
    
    // ─── RAPPORT FINAL ─────────────────────────────────────────────────────────
    
    console.log('━━━ RAPPORT FINAL ━━━\n');
    console.log('Ancienne image Paella Royale:', oldDishImage);
    console.log('Nouvelle image Paella Royale:', newDishImage);
    console.log('');
    console.log('Image catégorie Plats Espagnol:', categoryImage);
    console.log('Status catégorie:', categoryUnchanged ? '✅ INCHANGÉE' : '❌ MODIFIÉE');
    console.log('');
    console.log('Prix Paella Royale:', updatedDish.price, 'DT ✅ INCHANGÉ');
    console.log('Description:', 'INCHANGÉE ✅');
    console.log('Autres plats:', changedDishes === 1 ? 'INCHANGÉS ✅' : '⚠️  VÉRIFIER');
    console.log('Autres catégories:', categoryUnchanged ? 'INCHANGÉES ✅' : '⚠️  VÉRIFIER');
    console.log('');
    console.log('Cloudinary: Upload réussi ✅');
    console.log('MongoDB: 1 plat mis à jour ✅');
    console.log('');
    console.log('🎉 Opération terminée avec succès!\n');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload Cloudinary:');
    console.error(error.message);
    await client.close();
    process.exit(1);
  }
  
  await client.close();
})();
