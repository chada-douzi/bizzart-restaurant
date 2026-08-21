/**
 * BACKUP MONGODB
 * 
 * Crée un backup complet des collections critiques avant la migration.
 * 
 * Collections sauvegardées :
 * - MenuItems
 * - MenuCategories
 * - Media
 */

import { connectDatabase } from '../config/database';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import { Media } from '../models/media.model';
import * as fs from 'fs';
import * as path from 'path';

const createBackup = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('BACKUP MONGODB');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Connexion MongoDB
    await connectDatabase();
    console.log('✅ Connecté à MongoDB');
    console.log('');

    // 2. Créer le dossier de backup
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupDir = path.join(__dirname, `../../backups/backup-before-menu-photo-migration-${timestamp}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`📁 Dossier de backup : ${backupDir}`);
    console.log('');

    // 3. Backup MenuItems
    console.log('📦 Backup MenuItems...');
    const menuItems = await MenuItem.find({}).lean();
    fs.writeFileSync(
      path.join(backupDir, 'menu-items.json'),
      JSON.stringify(menuItems, null, 2)
    );
    console.log(`   ✓ ${menuItems.length} MenuItems sauvegardés`);

    // 4. Backup MenuCategories
    console.log('📦 Backup MenuCategories...');
    const menuCategories = await MenuCategory.find({}).lean();
    fs.writeFileSync(
      path.join(backupDir, 'menu-categories.json'),
      JSON.stringify(menuCategories, null, 2)
    );
    console.log(`   ✓ ${menuCategories.length} MenuCategories sauvegardées`);

    // 5. Backup Media
    console.log('📦 Backup Media...');
    const media = await Media.find({}).lean();
    fs.writeFileSync(
      path.join(backupDir, 'media.json'),
      JSON.stringify(media, null, 2)
    );
    console.log(`   ✓ ${media.length} Media sauvegardés`);

    // 6. Créer un fichier de métadonnées
    const metadata = {
      backupDate: new Date().toISOString(),
      collections: {
        menuItems: menuItems.length,
        menuCategories: menuCategories.length,
        media: media.length,
      },
      purpose: 'Backup avant migration des photos du menu',
    };

    fs.writeFileSync(
      path.join(backupDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('');
    console.log('✅ BACKUP TERMINÉ AVEC SUCCÈS');
    console.log('');
    console.log(`   Dossier : ${backupDir}`);
    console.log(`   Fichiers :`);
    console.log(`     - menu-items.json (${menuItems.length} documents)`);
    console.log(`     - menu-categories.json (${menuCategories.length} documents)`);
    console.log(`     - media.json (${media.length} documents)`);
    console.log(`     - metadata.json`);
    console.log('');
    console.log('⚠️ NE PAS SUPPRIMER CE BACKUP');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur durant le backup :', error);
    process.exit(1);
  }
};

createBackup();
