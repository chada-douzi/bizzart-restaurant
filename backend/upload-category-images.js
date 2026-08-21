const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Mapping fichiers → catégories
const CATEGORY_MAPPING = {
  '1000046318.png': { slug: 'les-pizzas', name: 'Les Pizzas' },
  '1000046167.png': { slug: 'pates', name: 'Pâtes' },
  '1000046319.png': { slug: 'plats-espagnol', name: 'Plats Espagnol' },
  '1000046174.png': { slug: 'salade', name: 'Salade' },
  '1000046316.png': { slug: 'volailles', name: 'Volailles' },
  '1000046311.jpg': { slug: 'viandes', name: 'Viandes' },
  '1000046297.png': { slug: 'fruits-de-mer', name: 'Fruits de mer' },
  '1000046681.jpg': { slug: 'tacos', name: 'Tacos' },
  '1000046685.jpg': { slug: 'makioub', name: 'MAkIOUB' },
  '1000046684.jpg': { slug: 'soda', name: 'Soda' }
};

const IMAGES_DIR = './menu-category-images';

async function uploadCategoryImages() {
  try {
    console.log('━━━ UPLOAD PHOTOS CATÉGORIES VERS CLOUDINARY ━━━\n');
    
    const results = [];
    let uploaded = 0;
    let failed = 0;
    
    for (const [filename, category] of Object.entries(CATEGORY_MAPPING)) {
      const filePath = path.join(IMAGES_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ ${category.name}: Fichier introuvable (${filename})`);
        failed++;
        continue;
      }
      
      try {
        console.log(`🔄 ${category.name}: Upload en cours...`);
        
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'bizzart/menu/categories',
          public_id: category.slug,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 1600, height: 1000, crop: 'limit', quality: 'auto:good' }
          ]
        });
        
        console.log(`✅ ${category.name}: ${result.secure_url}`);
        console.log(`   Format: ${result.format}, Size: ${Math.round(result.bytes / 1024)} KB`);
        
        results.push({
          categoryName: category.name,
          categorySlug: category.slug,
          filename: filename,
          cloudinaryUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          sizeKB: Math.round(result.bytes / 1024),
          width: result.width,
          height: result.height
        });
        
        uploaded++;
        
      } catch (error) {
        console.log(`❌ ${category.name}: Erreur upload`);
        console.log(`   ${error.message}`);
        failed++;
      }
      
      console.log('');
    }
    
    // Sauvegarder résultats
    fs.writeFileSync(
      'cloudinary-category-images-mapping.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('━━━ RÉSUMÉ ━━━');
    console.log(`✅ Uploadés: ${uploaded}/10`);
    console.log(`❌ Échecs: ${failed}/10`);
    console.log(`\n✅ Mapping sauvegardé: cloudinary-category-images-mapping.json\n`);
    
    // Afficher mapping final
    console.log('━━━ MAPPING FINAL ━━━\n');
    results.forEach(r => {
      console.log(`${r.categoryName} (${r.categorySlug})`);
      console.log(`  → ${r.cloudinaryUrl}`);
      console.log('');
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  }
}

// Exécution
uploadCategoryImages()
  .then(() => {
    console.log('🎉 Upload terminé!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
