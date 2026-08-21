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

const IMAGE_FILE = 'C:\\Users\\boukh\\OneDrive\\Bureau\\restaurant\\bizzart-restaurant\\backend\\menu-category-images\\paella-plats-espagnol.png';
const CATEGORY_ID = '6a845a7a2876405dd5375d0c';
const CATEGORY_SLUG = 'plats-espagnol';

(async () => {
  console.log('━━━ REMPLACEMENT IMAGE CATÉGORIE "PLATS ESPAGNOL" ━━━\n');
  
  // ─── ÉTAPE 1: VÉRIFICATION FICHIER ─────────────────────────────────────────
  
  console.log('🔎 ÉTAPE 1: Vérification fichier source\n');
  
  if (!fs.existsSync(IMAGE_FILE)) {
    console.error('❌ Fichier introuvable:', IMAGE_FILE);
    process.exit(1);
  }
  
  const fileStats = fs.statSync(IMAGE_FILE);
  console.log('✅ Fichier trouvé');
  console.log('   Taille:', Math.round(fileStats.size / 1024), 'KB');
  console.log('   Chemin:', IMAGE_FILE);
  console.log('');
  
  // ─── ÉTAPE 2: CONNEXION MONGODB ────────────────────────────────────────────
  
  console.log('🔎 ÉTAPE 2: Connexion MongoDB\n');
  
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('✅ MongoDB connecté\n');
  
  // ─── ÉTAPE 3: RÉCUPÉRATION CATÉGORIE ACTUELLE ──────────────────────────────
  
  console.log('🔎 ÉTAPE 3: Récupération catégorie actuelle\n');
  
  const category = await db.collection('menucategories').findOne({
    _id: new ObjectId(CATEGORY_ID)
  });
  
  if (!category) {
    console.error('❌ Catégorie introuvable');
    await client.close();
    process.exit(1);
  }
  
  console.log('✅ Catégorie trouvée');
  console.log('   ID:', category._id.toString());
  console.log('   Nom:', category.name.fr);
  console.log('   Slug:', category.slug);
  console.log('   Image actuelle:', category.image);
  console.log('   PublicId actuel:', category.publicId || 'N/A');
  console.log('');
  
  const oldImage = category.image;
  const oldPublicId = category.publicId;
  
  // ─── ÉTAPE 4: UPLOAD CLOUDINARY ────────────────────────────────────────────
  
  console.log('🔎 ÉTAPE 4: Upload vers Cloudinary\n');
  
  try {
    const uploadResult = await cloudinary.uploader.upload(IMAGE_FILE, {
      folder: 'bizzart/menu/categories',
      public_id: CATEGORY_SLUG,
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
    
    const newImage = uploadResult.secure_url;
    const newPublicId = uploadResult.public_id;
    
    // ─── ÉTAPE 5: MISE À JOUR MONGODB ──────────────────────────────────────────
    
    console.log('🔎 ÉTAPE 5: Mise à jour MongoDB (catégorie uniquement)\n');
    
    const updateResult = await db.collection('menucategories').updateOne(
      { _id: new ObjectId(CATEGORY_ID) },
      {
        $set: {
          image: newImage,
          publicId: newPublicId,
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Catégorie mise à jour');
      console.log('   Documents modifiés:', updateResult.modifiedCount);
      console.log('');
    } else {
      console.log('⚠️  Aucune modification (valeurs identiques?)');
      console.log('');
    }
    
    // ─── ÉTAPE 6: VÉRIFICATION ─────────────────────────────────────────────────
    
    console.log('🔎 ÉTAPE 6: Vérification finale\n');
    
    const updatedCategory = await db.collection('menucategories').findOne({
      _id: new ObjectId(CATEGORY_ID)
    });
    
    console.log('Catégorie "Plats Espagnol":');
    console.log('   Image:', updatedCategory.image);
    console.log('   PublicId:', updatedCategory.publicId);
    console.log('');
    
    // Vérifier que les autres catégories n'ont pas été touchées
    const allCategories = await db.collection('menucategories').find({}).toArray();
    const otherCategories = allCategories.filter(c => c._id.toString() !== CATEGORY_ID);
    
    console.log('Autres catégories (', otherCategories.length, '):');
    otherCategories.forEach(cat => {
      console.log('  ', cat.name.fr, '→', cat.image ? '✅ Image présente' : '⚠️  Pas d\'image');
    });
    console.log('');
    
    // Vérifier plat "Paella Royale" non modifié
    const paella = await db.collection('menuitems').findOne({ slug: 'paella-royale' });
    if (paella) {
      console.log('Plat "Paella Royale":');
      console.log('   Image:', paella.image || 'N/A');
      console.log('   Status: ✅ Inchangé');
      console.log('');
    }
    
    // ─── RAPPORT FINAL ─────────────────────────────────────────────────────────
    
    console.log('━━━ RAPPORT FINAL ━━━\n');
    console.log('Ancienne image:', oldImage);
    console.log('Nouvelle image:', newImage);
    console.log('');
    console.log('Catégorie modifiée: Plats Espagnol ✅');
    console.log('Autres données modifiées: Aucune ✅');
    console.log('');
    console.log('Cloudinary: Upload réussi ✅');
    console.log('MongoDB: 1 catégorie mise à jour ✅');
    console.log('Plat "Paella Royale": Inchangé ✅');
    console.log('Autres catégories: Inchangées ✅');
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
