import * as fs from 'fs';
import * as path from 'path';

interface ManifestItem {
  menuItemId: string;
  name: string;
  category: string;
  slug: string;
  expectedFile: string;
  currentImage: string | null;
  description: string;
  price: number;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function checkPhotosStatus() {
  console.log('📊 ÉTAT DES PHOTOS MENU — BIZZ\'ART\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  const menuImagesDir = path.join(__dirname, '../../../menu-images');
  const manifestPath = path.join(menuImagesDir, 'menu-images-manifest.json');

  // Vérifications
  if (!fs.existsSync(menuImagesDir)) {
    console.error('❌ Dossier menu-images/ introuvable\n');
    console.error('Exécutez : npm run menu:manifest\n');
    process.exit(1);
  }

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Manifest introuvable\n');
    console.error('Exécutez : npm run menu:manifest\n');
    process.exit(1);
  }

  // Charger manifest
  const manifest: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`✅ Manifest chargé : ${manifest.length} plats attendus\n`);

  // Parcourir et vérifier
  const present: string[] = [];
  const missing: string[] = [];
  const byCategory = new Map<string, { present: number; missing: number }>();

  for (const item of manifest) {
    const filePath = path.join(menuImagesDir, item.expectedFile);
    let found = false;

    // Vérifier le fichier exact
    if (fs.existsSync(filePath)) {
      found = true;
    } else {
      // Essayer avec d'autres extensions
      const baseName = path.basename(item.expectedFile, path.extname(item.expectedFile));
      for (const ext of ALLOWED_EXTENSIONS) {
        const altPath = path.join(menuImagesDir, baseName + ext);
        if (fs.existsSync(altPath)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      present.push(item.name);
    } else {
      missing.push(item.name);
    }

    // Stats par catégorie
    const stats = byCategory.get(item.category) || { present: 0, missing: 0 };
    if (found) {
      stats.present++;
    } else {
      stats.missing++;
    }
    byCategory.set(item.category, stats);
  }

  // Afficher résumé global
  console.log('📊 RÉSUMÉ GLOBAL\n');
  console.log(`   Total plats          : ${manifest.length}`);
  console.log(`   ✅ Photos présentes   : ${present.length}`);
  console.log(`   ❌ Photos manquantes  : ${missing.length}`);
  
  const percentage = ((present.length / manifest.length) * 100).toFixed(1);
  console.log(`   📈 Progression        : ${percentage}%`);
  console.log('');

  // Afficher par catégorie
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📂 ÉTAT PAR CATÉGORIE\n');

  for (const [category, stats] of byCategory) {
    const total = stats.present + stats.missing;
    const catPercentage = ((stats.present / total) * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(stats.present / total * 20)) + 
                '░'.repeat(20 - Math.floor(stats.present / total * 20));
    
    console.log(`${category.padEnd(25)} ${bar} ${stats.present}/${total} (${catPercentage}%)`);
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');

  if (missing.length > 0) {
    console.log(`❌ PHOTOS MANQUANTES (${missing.length})\n`);
    
    // Grouper par catégorie
    const missingByCategory = new Map<string, ManifestItem[]>();
    manifest.forEach(item => {
      if (missing.includes(item.name)) {
        const items = missingByCategory.get(item.category) || [];
        items.push(item);
        missingByCategory.set(item.category, items);
      }
    });

    for (const [category, items] of missingByCategory) {
      console.log(`\n${category} :`);
      items.forEach(item => {
        console.log(`   - ${item.expectedFile.padEnd(45)} → ${item.name}`);
      });
    }

    console.log('\n════════════════════════════════════════════════════════════════\n');
    console.log('Ajoutez les photos manquantes dans : menu-images/\n');
    console.log('Puis exécutez : npm run menu:upload\n');
  } else {
    console.log('🎉 TOUTES LES PHOTOS SONT PRÉSENTES !\n');
    console.log('Vous pouvez maintenant exécuter :\n');
    console.log('   npm run menu:upload\n');
    console.log('Pour uploader vers Cloudinary et mettre à jour MongoDB.\n');
  }

  console.log('════════════════════════════════════════════════════════════════\n');
}

checkPhotosStatus();
