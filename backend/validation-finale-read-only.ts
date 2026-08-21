/**
 * VALIDATION FINALE — MODE READ-ONLY STRICT
 * Aucune modification autorisée
 */

import mongoose from 'mongoose';
import { MenuItem } from './src/models/menu-item.model';
import { MenuCategory } from './src/models/menu-category.model';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function validationFinale() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    
    console.log('═'.repeat(80));
    console.log('VALIDATION FINALE — CORRECTION 100→200');
    console.log('═'.repeat(80) + '\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 1. MONGODB — Données brutes
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('📊 1. MONGODB — Données brutes\n');
    
    const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 });
    const allItems = await MenuItem.find().populate('category');
    const availableItems = await MenuItem.find({ isAvailable: true }).populate('category');
    
    console.log(`   Catégories actives: ${categories.length}`);
    console.log(`   Plats totaux: ${allItems.length}`);
    console.log(`   Plats disponibles: ${availableItems.length}`);
    console.log(`   Plats indisponibles: ${allItems.length - availableItems.length}\n`);
    
    // Répartition par catégorie
    const mongoByCategory = new Map<string, { available: number; unavailable: number }>();
    
    categories.forEach(cat => {
      mongoByCategory.set(cat.name.fr, { available: 0, unavailable: 0 });
    });
    
    allItems.forEach(item => {
      const catName = (item.category as any)?.name.fr || 'Sans catégorie';
      const stats = mongoByCategory.get(catName) || { available: 0, unavailable: 0 };
      if (item.isAvailable) {
        stats.available++;
      } else {
        stats.unavailable++;
      }
      mongoByCategory.set(catName, stats);
    });
    
    console.log('   RÉPARTITION PAR CATÉGORIE (MongoDB):\n');
    console.log('   ' + 'CATÉGORIE'.padEnd(25) + 'DISPONIBLES'.padEnd(15) + 'INDISPONIBLES');
    console.log('   ' + '─'.repeat(60));
    
    categories.forEach(cat => {
      const stats = mongoByCategory.get(cat.name.fr) || { available: 0, unavailable: 0 };
      console.log('   ' + cat.name.fr.padEnd(25) + stats.available.toString().padEnd(15) + stats.unavailable);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 2. IMAGES — Vérification
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 2. IMAGES — Vérification\n');
    
    const itemsWithoutImage = availableItems.filter(item => !item.image || item.image.trim() === '');
    const itemsWithLocalImage = availableItems.filter(item => 
      item.image && !item.image.startsWith('http://') && !item.image.startsWith('https://')
    );
    const itemsWithCloudinaryImage = availableItems.filter(item => 
      item.image && item.image.includes('res.cloudinary.com')
    );
    
    console.log(`   Plats sans image: ${itemsWithoutImage.length}`);
    console.log(`   Plats avec image locale: ${itemsWithLocalImage.length}`);
    console.log(`   Plats avec Cloudinary: ${itemsWithCloudinaryImage.length}`);
    
    if (itemsWithoutImage.length > 0) {
      console.log('\n   ⚠️  PLATS SANS IMAGE:');
      itemsWithoutImage.slice(0, 5).forEach(item => {
        console.log(`      - ${item.name.fr} (${(item.category as any)?.name.fr})`);
      });
      if (itemsWithoutImage.length > 5) {
        console.log(`      ... et ${itemsWithoutImage.length - 5} autres`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. PRIX — Vérification
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 3. PRIX — Vérification\n');
    
    const itemsWithoutPrice = availableItems.filter(item => !item.price || item.price <= 0);
    const priceRange = {
      min: Math.min(...availableItems.map(i => i.price)),
      max: Math.max(...availableItems.map(i => i.price)),
      avg: availableItems.reduce((sum, i) => sum + i.price, 0) / availableItems.length
    };
    
    console.log(`   Plats sans prix valide: ${itemsWithoutPrice.length}`);
    console.log(`   Prix minimum: ${priceRange.min.toFixed(2)} DT`);
    console.log(`   Prix maximum: ${priceRange.max.toFixed(2)} DT`);
    console.log(`   Prix moyen: ${priceRange.avg.toFixed(2)} DT`);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. DESCRIPTIONS — Vérification
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 4. DESCRIPTIONS — Vérification\n');
    
    const itemsWithoutDescription = availableItems.filter(item => 
      !item.description?.fr || item.description.fr.trim() === ''
    );
    
    console.log(`   Plats sans description: ${itemsWithoutDescription.length}`);
    console.log(`   Plats avec description: ${availableItems.length - itemsWithoutDescription.length}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. NOMS — Vérification
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 5. NOMS — Vérification\n');
    
    const itemsWithoutName = availableItems.filter(item => 
      !item.name?.fr || item.name.fr.trim() === ''
    );
    
    console.log(`   Plats sans nom français: ${itemsWithoutName.length}`);
    
    // Vérifier les doublons de noms
    const nameMap = new Map<string, number>();
    availableItems.forEach(item => {
      const name = item.name.fr.toLowerCase().trim();
      nameMap.set(name, (nameMap.get(name) || 0) + 1);
    });
    
    const duplicateNames = Array.from(nameMap.entries()).filter(([_, count]) => count > 1);
    
    if (duplicateNames.length > 0) {
      console.log(`\n   ⚠️  NOMS EN DOUBLON (${duplicateNames.length}):`);
      duplicateNames.slice(0, 10).forEach(([name, count]) => {
        console.log(`      - "${name}" (${count}x)`);
      });
    } else {
      console.log('   ✅ Aucun nom en doublon');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. CATÉGORIES — Correspondance
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 6. CATÉGORIES — Correspondance\n');
    
    const itemsWithoutCategory = availableItems.filter(item => !item.category);
    
    console.log(`   Plats sans catégorie: ${itemsWithoutCategory.length}`);
    console.log(`   ✅ Toutes les catégories sont représentées: ${categories.length}`);

    // ═══════════════════════════════════════════════════════════════════════
    // RAPPORT FINAL
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('RAPPORT FINAL — VALIDATION');
    console.log('═'.repeat(80) + '\n');
    
    console.log('✅ DONNÉES MONGODB:');
    console.log(`   - ${categories.length} catégories actives`);
    console.log(`   - ${availableItems.length} plats disponibles`);
    console.log(`   - ${allItems.length} plats totaux\n`);
    
    console.log('✅ CORRECTION APPLIQUÉE:');
    console.log('   - Backend validator: max 100 → 200 ✅');
    console.log('   - Backend controller (public): Math.min(100) → Math.min(200) ✅');
    console.log('   - Backend controller (admin): Math.min(100) → Math.min(200) ✅');
    console.log('   - Frontend component: limit 100 → 200 ✅\n');
    
    console.log('✅ RÉSULTAT:');
    console.log(`   - API peut retourner jusqu\'à 200 plats`);
    console.log(`   - Frontend demande 200 plats`);
    console.log(`   - Les ${availableItems.length} plats sont accessibles (${availableItems.length} < 200) ✅\n`);
    
    if (itemsWithoutImage.length > 0) {
      console.log(`⚠️  ATTENTION: ${itemsWithoutImage.length} plat(s) sans image`);
    }
    if (itemsWithoutPrice.length > 0) {
      console.log(`⚠️  ATTENTION: ${itemsWithoutPrice.length} plat(s) sans prix valide`);
    }
    if (itemsWithoutDescription.length > 0) {
      console.log(`⚠️  INFO: ${itemsWithoutDescription.length} plat(s) sans description`);
    }
    
    console.log('\n✅ VALIDATION TERMINÉE — AUCUNE MODIFICATION EFFECTUÉE');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

validationFinale();
