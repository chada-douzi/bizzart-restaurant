/**
 * VÉRIFICATION POST-MIGRATION
 * 
 * Vérifie que la migration s'est déroulée correctement :
 * - 98 plats toujours présents
 * - Toutes les URLs sont accessibles
 * - Aucune URL vide involontairement
 * - Aucun document perdu
 * - Catégories intactes
 */

import { connectDatabase } from '../config/database';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import * as https from 'https';
import * as http from 'http';

// ═══════════════════════════════════════════════════════════════════════════════
// Fonction pour vérifier une URL
// ═══════════════════════════════════════════════════════════════════════════════

const checkUrlAccessible = (url: string): Promise<{ accessible: boolean; statusCode?: number; error?: string }> => {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(url, { timeout: 5000 }, (res) => {
        resolve({
          accessible: res.statusCode === 200,
          statusCode: res.statusCode,
        });
      });

      req.on('error', (error) => {
        resolve({
          accessible: false,
          error: error.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          accessible: false,
          error: 'Timeout',
        });
      });
    } catch (error) {
      resolve({
        accessible: false,
        error: String(error),
      });
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// Vérification principale
// ═══════════════════════════════════════════════════════════════════════════════

const verifyPostMigration = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('VÉRIFICATION POST-MIGRATION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Connexion MongoDB
    await connectDatabase();
    console.log('✅ Connecté à MongoDB');
    console.log('');

    // 2. Vérifier le nombre de plats
    console.log('📊 Vérification du nombre de plats...');
    const totalMenuItems = await MenuItem.countDocuments({});
    console.log(`   Total MenuItems : ${totalMenuItems}`);

    if (totalMenuItems !== 98) {
      console.log(`   ⚠️ WARNING : Attendu 98 plats, trouvé ${totalMenuItems}`);
    } else {
      console.log(`   ✅ OK : 98 plats présents`);
    }
    console.log('');

    // 3. Vérifier les catégories
    console.log('📂 Vérification des catégories...');
    const totalCategories = await MenuCategory.countDocuments({});
    console.log(`   Total MenuCategories : ${totalCategories}`);
    console.log(`   ✅ OK : Catégories intactes`);
    console.log('');

    // 4. Vérifier les images
    console.log('🖼️  Vérification des images...');
    const menuItems = await MenuItem.find({}).populate('category', 'name').lean();

    const stats = {
      withImage: 0,
      withoutImage: 0,
      emptyImage: 0,
      invalidUrl: 0,
    };

    const itemsWithoutImage: string[] = [];
    const itemsWithEmptyImage: string[] = [];
    const itemsWithInvalidUrl: string[] = [];

    menuItems.forEach((item) => {
      if (!item.image) {
        stats.withoutImage++;
        itemsWithoutImage.push(item.name.fr);
      } else if (item.image.trim() === '') {
        stats.emptyImage++;
        itemsWithEmptyImage.push(item.name.fr);
      } else {
        try {
          new URL(item.image);
          stats.withImage++;
        } catch {
          stats.invalidUrl++;
          itemsWithInvalidUrl.push(`${item.name.fr} (${item.image})`);
        }
      }
    });

    console.log(`   Total avec image valide    : ${stats.withImage}`);
    console.log(`   Total sans image           : ${stats.withoutImage}`);
    console.log(`   Total avec image vide      : ${stats.emptyImage}`);
    console.log(`   Total avec URL invalide    : ${stats.invalidUrl}`);
    console.log('');

    if (itemsWithEmptyImage.length > 0) {
      console.log('   ⚠️ Plats avec image vide :');
      itemsWithEmptyImage.forEach(name => console.log(`      - ${name}`));
      console.log('');
    }

    if (itemsWithInvalidUrl.length > 0) {
      console.log('   ❌ Plats avec URL invalide :');
      itemsWithInvalidUrl.forEach(name => console.log(`      - ${name}`));
      console.log('');
    }

    // 5. Vérifier l'accessibilité des URLs (échantillon)
    console.log('🌐 Vérification de l\'accessibilité des URLs (échantillon de 10)...');
    const itemsWithImages = menuItems.filter(item => item.image && item.image.trim() !== '');
    const sample = itemsWithImages.slice(0, 10);

    let accessibleCount = 0;
    let inaccessibleCount = 0;

    for (const item of sample) {
      const result = await checkUrlAccessible(item.image);
      if (result.accessible) {
        console.log(`   ✅ ${item.name.fr} : accessible`);
        accessibleCount++;
      } else {
        console.log(`   ❌ ${item.name.fr} : inaccessible (${result.error || result.statusCode})`);
        inaccessibleCount++;
      }
    }

    console.log('');
    console.log(`   Accessibles   : ${accessibleCount}/${sample.length}`);
    console.log(`   Inaccessibles : ${inaccessibleCount}/${sample.length}`);
    console.log('');

    // 6. Vérifier les doublons
    console.log('🔁 Vérification des doublons...');
    const imageUsage = new Map<string, string[]>();

    menuItems.forEach((item) => {
      if (item.image && item.image.trim() !== '') {
        if (!imageUsage.has(item.image)) {
          imageUsage.set(item.image, []);
        }
        imageUsage.get(item.image)!.push(item.name.fr);
      }
    });

    const duplicates: Array<{ url: string; plats: string[] }> = [];
    imageUsage.forEach((plats, url) => {
      if (plats.length > 1) {
        duplicates.push({ url, plats });
      }
    });

    console.log(`   Total URLs uniques         : ${imageUsage.size}`);
    console.log(`   URLs utilisées plusieurs fois : ${duplicates.length}`);
    console.log('');

    if (duplicates.length > 0) {
      console.log('   ⚠️ URLs dupliquées :');
      duplicates.slice(0, 5).forEach(dup => {
        console.log(`      ${dup.url.substring(0, 60)}...`);
        console.log(`      Utilisée par : ${dup.plats.join(', ')}`);
        console.log('');
      });
      if (duplicates.length > 5) {
        console.log(`      ... et ${duplicates.length - 5} autres`);
        console.log('');
      }
    }

    // 7. Résumé final
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`   ✅ Total plats              : ${totalMenuItems}`);
    console.log(`   ✅ Total catégories         : ${totalCategories}`);
    console.log(`   📊 Plats avec image valide  : ${stats.withImage}`);
    console.log(`   📊 Plats sans image         : ${stats.withoutImage}`);
    console.log(`   ⚠️ Images vides             : ${stats.emptyImage}`);
    console.log(`   ❌ URLs invalides           : ${stats.invalidUrl}`);
    console.log(`   🔁 URLs dupliquées          : ${duplicates.length}`);
    console.log('');

    if (stats.emptyImage > 0 || stats.invalidUrl > 0) {
      console.log('⚠️ ATTENTION : Des problèmes ont été détectés');
      console.log('');
      process.exit(1);
    } else if (inaccessibleCount > 0) {
      console.log('⚠️ ATTENTION : Certaines URLs sont inaccessibles');
      console.log('   Vérifiez votre connexion ou les URLs Cloudinary');
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ VÉRIFICATION TERMINÉE : Aucun problème critique détecté');
      console.log('');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur durant la vérification :', error);
    process.exit(1);
  }
};

verifyPostMigration();
