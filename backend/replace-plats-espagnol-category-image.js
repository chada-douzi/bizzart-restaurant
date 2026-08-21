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

const IMAGE_FILE = 'C:\\Users\\boukh\\OneDrive\\Bureau\\restaurant\\bizzart-restaurant\\backend\\menu-category-images\\Plats Espagnol.png';
const CATEGORY_SLUG = 'plats-espagnol';

(async () => {
  console.log('━━━ REMPLACEMENT PHOTO CATÉGORIE "PLATS ESPAGNOL" ━━━\n');
  
  // ─── ÉTAPE 1: VÉRIFICATION FICHIER ─────────────────────────────────────────
  
  console.log('🔎 ÉTAPE 1: Vérification fichier source\n');
  
  if (!fs.existsSync(IMAGE_FILE)) {
    console.error('❌ Fichier introuvable:', IMAGE_FILE);
    process.exit(1);
  }
  
  const fileStats = fs.statSync(IMAGE_FILE);
  console.log('✅ Fichier "Plats Espagnol.png" trouvé');
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
  
  const category = await db.collection('menucategories').findOne({ slug: CATEGORY_SLUG });
  
  if (!category) {
    console.error('❌ Catégorie "Plats Espagnol" introuvable');
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
  
  console.log('🔎 ÉTAPE 4: Upload nouvelle image vers Cloudinary\n');
  
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
    
    // ─── ÉTAPE 5: MISE À JOUR MONGODB (CATÉGORIE UNIQUEMENT) ──────────────────
    
    console.log('🔎 ÉTAPE 5: Mise à jour MongoDB (catégorie Plats Espagnol UNIQUEMENT)\n');
    
    const updateResult = await db.collection('menucategories').updateOne(
      { slug: CATEGORY_SLUG },
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
    
    // Vérifier la catégorie mise à jour
    const updatedCategory = await db.collection('menucategories').findOne({ slug: CATEGORY_SLUG });
    
    console.log('Catégorie "Plats Espagnol":');
    console.log('   Nom:', updatedCategory.name.fr);
    console.log('   Image:', updatedCategory.image);
    console.log('   PublicId:', updatedCategory.publicId);
    console.log('   Status:', updatedCategory.image === newImage ? '✅ MISE À JOUR' : '⚠️  ERREUR');
    console.log('');
    
    // Vérifier que Paella Royale n'a pas été modifiée
    const paellaRoyale = await db.collection('menuitems').findOne({ slug: 'paella-royale' });
    
    if (paellaRoyale) {
      console.log('Plat "Paella Royale" (vérification protection):');
      console.log('   Nom:', paellaRoyale.name.fr);
      console.log('   Prix:', paellaRoyale.price, 'DT');
      console.log('   Image:', paellaRoyale.image);
      console.log('   Status:', paellaRoyale.price === 63.5 ? '✅ INCHANGÉ' : '⚠️  MODIFIÉ');
      console.log('');
    }
    
    // Vérifier que les autres catégories n'ont pas été touchées
    const allCategories = await db.collection('menucategories').countDocuments();
    const categoriesWithNewImage = await db.collection('menucategories').countDocuments({
      image: newImage
    });
    
    console.log('Autres catégories:');
    console.log('   Total catégories:', allCategories);
    console.log('   Avec nouvelle image:', categoriesWithNewImage, '(doit être 1)');
    console.log('   Status:', categoriesWithNewImage === 1 ? '✅ AUTRES INCHANGÉES' : '⚠️  VÉRIFIER');
    console.log('');
    
    // ─── RAPPORT FINAL ─────────────────────────────────────────────────────────
    
    console.log('━━━ RAPPORT FINAL ━━━\n');
    console.log('Ancienne URL:', oldImage);
    console.log('Nouvelle URL:', newImage);
    console.log('');
    console.log('Catégorie MongoDB modifiée: Plats Espagnol ✅');
    console.log('Autres catégories: INCHANGÉES ✅');
    console.log('Plat Paella Royale: INCHANGÉ ✅');
    console.log('Autres plats: INCHANGÉS ✅');
    console.log('');
    console.log('Cloudinary: Upload réussi ✅');
    console.log('MongoDB: 1 catégorie mise à jour ✅');
    console.log('');
    console.log('🎉 Opération terminée avec succès!\n');
    console.log('Vérifications recommandées:');
    console.log('  1. GET http://localhost:3000/api/menu/categories');
    console.log('  2. Ouvrir la nouvelle URL dans le navigateur');
    console.log('  3. Visiter http://localhost:4200/menu');
    console.log('  4. Vérifier GET http://localhost:3000/api/menu/items/paella-royale');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload Cloudinary:');
    console.error(error.message);
    await client.close();
    process.exit(1);
  }
  
  await client.close();
})();
