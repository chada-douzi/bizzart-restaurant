/**
 * SCRIPT DE DIAGNOSTIC - VÉRIFIER LES MENUITEMS
 * 
 * MODE LECTURE SEULE
 */

import { connectDatabase } from '../config/database';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

const checkMenuItems = async () => {
  try {
    console.log('🔍 Connexion à MongoDB...');
    await connectDatabase();
    console.log('✅ Connecté à MongoDB');
    console.log('');

    // Compter tous les MenuItems
    console.log('📊 Comptage des MenuItems...');
    const totalCount = await MenuItem.countDocuments({});
    console.log(`   Total MenuItems: ${totalCount}`);
    
    const availableCount = await MenuItem.countDocuments({ isAvailable: true });
    console.log(`   Available (isAvailable=true): ${availableCount}`);
    
    const notAvailableCount = await MenuItem.countDocuments({ isAvailable: false });
    console.log(`   Not available (isAvailable=false): ${notAvailableCount}`);
    console.log('');

    // Compter les catégories
    console.log('📂 Comptage des catégories...');
    const categoryCount = await MenuCategory.countDocuments({});
    console.log(`   Total catégories: ${categoryCount}`);
    console.log('');

    if (totalCount === 0) {
      console.log('⚠️ ATTENTION: Aucun MenuItem dans la base de données');
      console.log('');
      console.log('Solutions possibles:');
      console.log('  1. Exécuter un script de seed');
      console.log('  2. Importer les données depuis un backup');
      console.log('  3. Créer les MenuItems via l\'API admin');
      console.log('');
    } else {
      // Afficher quelques exemples
      console.log('📋 Exemples de MenuItems:');
      const samples = await MenuItem.find({})
        .populate('category', 'name')
        .limit(5)
        .lean();
      
      samples.forEach((item, index) => {
        const categoryName = (item.category as any)?.name?.fr || 'N/A';
        console.log(`   ${index + 1}. ${item.name.fr} (${categoryName})`);
        console.log(`      Available: ${item.isAvailable}`);
        console.log(`      Image: ${item.image ? 'OUI' : 'NON'}`);
      });
      console.log('');
    }

    console.log('✅ Diagnostic terminé');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

checkMenuItems();
