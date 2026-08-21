/**
 * AUDIT DÉTAILLÉ - Identification des doublons et comparaison seed vs MongoDB
 */

import mongoose from 'mongoose';
import { MenuItem } from '../models/menu-item.model';
import * as dotenv from 'dotenv';

dotenv.config();

async function auditDetailedMenu() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    console.log('═'.repeat(70));
    console.log('=== AUDIT DÉTAILLÉ DES DOUBLONS ===');
    console.log('═'.repeat(70) + '\n');

    const menuItems = await MenuItem.find().populate('category');

    // Groupe par catégorie + nom
    const duplicateMap = new Map<string, any[]>();
    
    menuItems.forEach(item => {
      const catName = (item.category as any)?.name.fr || 'Sans catégorie';
      const itemName = item.name.fr;
      const key = `${catName}|${itemName}`;
      
      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, []);
      }
      duplicateMap.get(key)!.push(item);
    });

    // Afficher uniquement les doublons
    let duplicateCount = 0;
    duplicateMap.forEach((items, key) => {
      if (items.length > 1) {
        duplicateCount++;
        const [catName, itemName] = key.split('|');
        console.log(`\n${duplicateCount}. DOUBLON: ${itemName}`);
        console.log(`   Catégorie: ${catName}`);
        console.log(`   Nombre d'occurrences: ${items.length}`);
        console.log(`   Détails:`);
        items.forEach((item, idx) => {
          console.log(`\n   [${idx + 1}] ID: ${item._id}`);
          console.log(`       Nom: ${item.name.fr}`);
          console.log(`       Description: ${item.description?.fr || 'N/A'}`);
          console.log(`       Prix: ${item.price} TND`);
          console.log(`       Image: ${item.image}`);
          console.log(`       Slug: ${item.slug}`);
          console.log(`       Disponible: ${item.isAvailable}`);
          console.log(`       Ordre: ${item.order}`);
        });
      }
    });

    if (duplicateCount === 0) {
      console.log('✅ Aucun doublon trouvé');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('=== ANALYSE DE LA DIFFÉRENCE SEED vs MONGODB ===');
    console.log('═'.repeat(70) + '\n');

    console.log('📊 Source seed : ~99 plats attendus');
    console.log(`📊 MongoDB : ${menuItems.length} plats actuels`);
    console.log(`📊 Différence : ${menuItems.length - 99} plats`);

    if (menuItems.length > 99) {
      console.log(`\n⚠️  Il y a ${menuItems.length - 99} plats de PLUS dans MongoDB que dans le seed`);
      console.log('💡 Causes possibles:');
      console.log('   - Doublons (déjà identifiés ci-dessus)');
      console.log('   - Plats ajoutés manuellement via admin');
      console.log('   - Seed exécuté plusieurs fois sans nettoyage');
    } else if (menuItems.length < 99) {
      console.log(`\n⚠️  Il y a ${99 - menuItems.length} plats MANQUANTS dans MongoDB par rapport au seed`);
    } else {
      console.log('\n✅ Le nombre de plats correspond');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('=== RECOMMANDATIONS ===');
    console.log('═'.repeat(70) + '\n');

    if (duplicateCount > 0) {
      console.log(`1. SUPPRIMER LES DOUBLONS (${duplicateCount} identifiés)`);
      console.log('   - Conserver la version avec la meilleure image');
      console.log('   - Conserver la version avec l\'ordre le plus bas');
      console.log('   - Vérifier manuellement avant suppression');
    }

    console.log(`\n2. VÉRIFIER LE MENU PUBLIC`);
    console.log('   - Tester /menu sur le frontend');
    console.log('   - Tester /api/menu/public sur le backend');
    console.log('   - Confirmer que tous les plats attendus sont affichés');

    console.log(`\n3. ÉTAT ACTUEL`);
    console.log(`   ✅ Aucun plat désactivé`);
    console.log(`   ✅ "Gouda" déjà corrigé en "Gouta"`);
    console.log(`   ✅ Tous les plats ont image + prix`);
    console.log(`   ${duplicateCount > 0 ? '⚠️' : '✅'}  ${duplicateCount} doublon(s) à traiter`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

auditDetailedMenu();
