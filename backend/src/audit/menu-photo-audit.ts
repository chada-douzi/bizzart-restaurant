/**
 * AUDIT COMPLET DU MENU BIZZ'ART
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Ce script analyse l'état actuel des 98 plats et de leurs photos
 * sans modifier aucune donnée.
 */

import { connectDatabase } from '../config/database';
import { MenuItem } from '../models/menu-item.model';
import { Media } from '../models/media.model';
import { MenuCategory } from '../models/menu-category.model';
import * as fs from 'fs';
import * as path from 'path';

interface MenuItemAudit {
  index: number;
  _id: string;
  nameFr: string;
  nameEn: string;
  category: string;
  categoryName: string;
  slug: string;
  price: number;
  image: string;
  imageFileName: string;
  imageAccessible: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  order: number;
}

interface PhotoUsage {
  url: string;
  fileName: string;
  usageCount: number;
  usedBy: string[];
  usedByIds: string[];
}

interface AuditReport {
  generatedAt: string;
  totalItems: number;
  totalCategories: number;
  totalMediaImages: number;
  items: MenuItemAudit[];
  photoUsage: PhotoUsage[];
  duplicates: PhotoUsage[];
  uniquePhotos: PhotoUsage[];
  statistics: {
    itemsWithImages: number;
    itemsWithoutImages: number;
    duplicatePhotos: number;
    uniquePhotos: number;
    totalPhotoUrls: number;
  };
}

const getFileName = (url: string): string => {
  try {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
};

const audit = async () => {
  console.log('🔍 AUDIT COMPLET DU MENU BIZZ\'ART');
  console.log('===================================');
  console.log('');
  console.log('🔒 MODE : STRICTEMENT LECTURE SEULE');
  console.log('');

  try {
    // Connexion MongoDB
    await connectDatabase();
    console.log('✅ Connecté à MongoDB');
    console.log('');

    // 1. Charger toutes les catégories
    console.log('📂 Chargement des catégories...');
    const categories = await MenuCategory.find({}).lean();
    console.log(`   ✓ ${categories.length} catégories trouvées`);
    console.log('');

    // Créer un map categoryId → categoryName
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat._id.toString(), cat.name.fr);
    });

    // 2. Charger tous les MenuItems
    console.log('🍽️  Chargement des plats...');
    const items = await MenuItem.find({})
      .populate('category', 'name slug')
      .sort({ order: 1, createdAt: 1 })
      .lean();
    console.log(`   ✓ ${items.length} plats trouvés`);
    console.log('');

    // 3. Charger tous les Media de type image
    console.log('🖼️  Chargement des médias...');
    const mediaImages = await Media.find({ type: 'image' }).lean();
    console.log(`   ✓ ${mediaImages.length} images média trouvées`);
    console.log('');

    // 4. Analyser les items
    console.log('📊 Analyse des plats...');
    const itemsAudit: MenuItemAudit[] = [];
    const photoUsageMap = new Map<string, PhotoUsage>();

    items.forEach((item, index) => {
      const category = item.category as any;
      const categoryName = category?.name?.fr || 'Sans catégorie';
      const imageUrl = item.image || '';
      const fileName = getFileName(imageUrl);

      // Audit de l'item
      itemsAudit.push({
        index: index + 1,
        _id: item._id.toString(),
        nameFr: item.name.fr,
        nameEn: item.name.en || '',
        category: category?._id?.toString() || '',
        categoryName,
        slug: item.slug,
        price: item.price,
        image: imageUrl,
        imageFileName: fileName,
        imageAccessible: true, // On ne peut pas tester l'accessibilité ici
        isAvailable: item.isAvailable,
        isFeatured: item.isFeatured,
        order: item.order,
      });

      // Comptage des usages de photos
      if (imageUrl) {
        if (!photoUsageMap.has(imageUrl)) {
          photoUsageMap.set(imageUrl, {
            url: imageUrl,
            fileName,
            usageCount: 0,
            usedBy: [],
            usedByIds: [],
          });
        }

        const usage = photoUsageMap.get(imageUrl)!;
        usage.usageCount++;
        usage.usedBy.push(item.name.fr);
        usage.usedByIds.push(item._id.toString());
      }
    });

    console.log(`   ✓ ${itemsAudit.length} plats analysés`);
    console.log('');

    // 5. Analyser les usages de photos
    console.log('🔄 Analyse des doublons...');
    const allPhotos = Array.from(photoUsageMap.values());
    const duplicates = allPhotos.filter(p => p.usageCount > 1);
    const uniquePhotos = allPhotos.filter(p => p.usageCount === 1);

    console.log(`   ✓ ${allPhotos.length} URLs uniques`);
    console.log(`   ✓ ${duplicates.length} photos utilisées plusieurs fois (DOUBLONS)`);
    console.log(`   ✓ ${uniquePhotos.length} photos utilisées une seule fois`);
    console.log('');

    // Afficher les doublons critiques
    if (duplicates.length > 0) {
      console.log('⚠️  DOUBLONS CRITIQUES DÉTECTÉS :');
      console.log('');
      duplicates
        .sort((a, b) => b.usageCount - a.usageCount)
        .forEach(dup => {
          console.log(`   📷 ${dup.fileName}`);
          console.log(`      Utilisée par ${dup.usageCount} plats :`);
          dup.usedBy.forEach(name => {
            console.log(`      - ${name}`);
          });
          console.log('');
        });
    }

    // 6. Statistiques
    const statistics = {
      itemsWithImages: itemsAudit.filter(i => i.image).length,
      itemsWithoutImages: itemsAudit.filter(i => !i.image).length,
      duplicatePhotos: duplicates.length,
      uniquePhotos: uniquePhotos.length,
      totalPhotoUrls: allPhotos.length,
    };

    console.log('📈 STATISTIQUES :');
    console.log('');
    console.log(`   Total plats           : ${items.length}`);
    console.log(`   Plats avec image      : ${statistics.itemsWithImages}`);
    console.log(`   Plats sans image      : ${statistics.itemsWithoutImages}`);
    console.log(`   URLs photos uniques   : ${statistics.totalPhotoUrls}`);
    console.log(`   Photos dupliquées     : ${statistics.duplicatePhotos}`);
    console.log(`   Photos uniques        : ${statistics.uniquePhotos}`);
    console.log(`   Total catégories      : ${categories.length}`);
    console.log(`   Total média images    : ${mediaImages.length}`);
    console.log('');

    // 7. Générer le rapport JSON
    const report: AuditReport = {
      generatedAt: new Date().toISOString(),
      totalItems: items.length,
      totalCategories: categories.length,
      totalMediaImages: mediaImages.length,
      items: itemsAudit,
      photoUsage: allPhotos,
      duplicates,
      uniquePhotos,
      statistics,
    };

    // Sauvegarder le rapport
    const outputPath = path.join(__dirname, '../../AUDIT-MENU-PHOTOS.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ Rapport sauvegardé : ${outputPath}`);
    console.log('');

    // 8. Générer un rapport Markdown
    const mdLines: string[] = [];
    mdLines.push('# AUDIT COMPLET DU MENU BIZZ\'ART');
    mdLines.push('');
    mdLines.push(`**Date** : ${new Date().toLocaleString('fr-FR')}`);
    mdLines.push('');
    mdLines.push('## 🔒 MODE : STRICTEMENT LECTURE SEULE');
    mdLines.push('');
    mdLines.push('Aucune donnée n\'a été modifiée durant cet audit.');
    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');
    mdLines.push('## 📊 STATISTIQUES GLOBALES');
    mdLines.push('');
    mdLines.push(`- **Total plats** : ${items.length}`);
    mdLines.push(`- **Plats avec image** : ${statistics.itemsWithImages}`);
    mdLines.push(`- **Plats sans image** : ${statistics.itemsWithoutImages}`);
    mdLines.push(`- **URLs photos uniques** : ${statistics.totalPhotoUrls}`);
    mdLines.push(`- **Photos dupliquées** : ${statistics.duplicatePhotos}`);
    mdLines.push(`- **Photos uniques** : ${statistics.uniquePhotos}`);
    mdLines.push(`- **Total catégories** : ${categories.length}`);
    mdLines.push(`- **Total média images** : ${mediaImages.length}`);
    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');

    if (duplicates.length > 0) {
      mdLines.push('## ⚠️ DOUBLONS CRITIQUES');
      mdLines.push('');
      mdLines.push('Les photos suivantes sont utilisées par **plusieurs plats différents** :');
      mdLines.push('');

      duplicates
        .sort((a, b) => b.usageCount - a.usageCount)
        .forEach(dup => {
          mdLines.push(`### 📷 \`${dup.fileName}\``);
          mdLines.push('');
          mdLines.push(`**Utilisée par ${dup.usageCount} plats** :`);
          mdLines.push('');
          dup.usedBy.forEach(name => {
            mdLines.push(`- ${name}`);
          });
          mdLines.push('');
        });

      mdLines.push('---');
      mdLines.push('');
    }

    mdLines.push('## 📋 LISTE COMPLÈTE DES PLATS');
    mdLines.push('');
    mdLines.push('| # | Nom | Catégorie | Photo | Fichier |');
    mdLines.push('|---|-----|-----------|-------|---------|');

    itemsAudit.forEach(item => {
      const photoStatus = item.image ? '✅' : '❌';
      mdLines.push(`| ${item.index} | ${item.nameFr} | ${item.categoryName} | ${photoStatus} | \`${item.imageFileName}\` |`);
    });

    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');
    mdLines.push('## 🎯 PROCHAINES ÉTAPES');
    mdLines.push('');
    mdLines.push('1. ✅ Audit lecture seule terminé');
    mdLines.push('2. ⏳ Validation visuelle manuelle via `/admin/photo-validation`');
    mdLines.push('3. ⏳ Génération du mapping final');
    mdLines.push('4. ⏳ Dry run de la migration');
    mdLines.push('5. ⏳ Migration finale après validation');
    mdLines.push('6. ⏳ Vérification post-migration');
    mdLines.push('7. ⏳ Suppression de l\'outil temporaire');
    mdLines.push('');

    const mdPath = path.join(__dirname, '../../AUDIT-MENU-PHOTOS.md');
    fs.writeFileSync(mdPath, mdLines.join('\n'));
    console.log(`✅ Rapport Markdown sauvegardé : ${mdPath}`);
    console.log('');

    console.log('✅ AUDIT TERMINÉ');
    console.log('');
    console.log('📄 Rapports générés :');
    console.log(`   - ${outputPath}`);
    console.log(`   - ${mdPath}`);
    console.log('');
    console.log('🔒 Aucune donnée n\'a été modifiée');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur durant l\'audit :', error);
    process.exit(1);
  }
};

// Exécution
audit();
