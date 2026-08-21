/**
 * TEST CORRECTION — Vérification limit=200
 */

import mongoose from 'mongoose';
import { MenuItem } from './src/models/menu-item.model';
import { MenuCategory } from './src/models/menu-category.model';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function testCorrectionLimit() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    
    console.log('═'.repeat(80));
    console.log('TEST CORRECTION — Limite 200');
    console.log('═'.repeat(80) + '\n');

    // Compter dans MongoDB
    const totalItems = await MenuItem.countDocuments({ isAvailable: true });
    const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 });
    
    console.log('📊 MONGODB:\n');
    console.log(`   Total plats disponibles: ${totalItems}`);
    console.log(`   Catégories actives: ${categories.length}\n`);
    
    // Simuler la requête API avec limit=200
    const items = await MenuItem.find({ isAvailable: true })
      .populate('category', 'name slug')
      .sort({ order: 1, createdAt: 1 })
      .limit(200)
      .lean();
    
    console.log('📊 SIMULATION API (limit=200):\n');
    console.log(`   Plats retournés: ${items.length}`);
    console.log(`   Limite appliquée: 200\n`);
    
    // Compter par catégorie
    const byCategory = new Map<string, number>();
    items.forEach((item: any) => {
      const catName = item.category?.name?.fr || 'Sans catégorie';
      byCategory.set(catName, (byCategory.get(catName) || 0) + 1);
    });
    
    console.log('📊 RÉPARTITION PAR CATÉGORIE:\n');
    console.log('CATÉGORIE'.padEnd(25) + 'NOMBRE');
    console.log('─'.repeat(40));
    
    let total = 0;
    categories.forEach(cat => {
      const count = byCategory.get(cat.name.fr) || 0;
      console.log(cat.name.fr.padEnd(25) + count);
      total += count;
    });
    console.log('─'.repeat(40));
    console.log('TOTAL'.padEnd(25) + total);
    
    console.log('\n' + '═'.repeat(80));
    console.log('RÉSULTAT:\n');
    
    if (items.length === totalItems) {
      console.log('✅ SUCCÈS — Tous les plats sont récupérables avec limit=200');
      console.log(`✅ ${totalItems} plats disponibles dans MongoDB`);
      console.log(`✅ ${items.length} plats retournés par la requête`);
      console.log('✅ Aucun plat manquant\n');
    } else {
      console.log(`⚠️  ATTENTION — ${totalItems - items.length} plat(s) non récupéré(s)`);
      console.log(`   MongoDB: ${totalItems} plats`);
      console.log(`   API: ${items.length} plats retournés\n`);
    }
    
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testCorrectionLimit();
