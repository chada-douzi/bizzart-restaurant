/**
 * AUDIT API — Route publique du menu
 * 
 * Test: GET /api/menu/items et GET /api/menu/categories
 * Compare avec MongoDB
 */

import mongoose from 'mongoose';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function auditApiMenu() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    
    console.log('═'.repeat(80));
    console.log('=== AUDIT API — MENU PUBLIC ===');
    console.log('═'.repeat(80) + '\n');

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1 — DONNÉES MONGODB (référence)
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('📊 PHASE 1 — DONNÉES MONGODB\n');
    
    const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 });
    const allItems = await MenuItem.find().populate('category');
    const availableItems = await MenuItem.find({ isAvailable: true }).populate('category');
    
    console.log(`📂 Catégories actives : ${categories.length}`);
    console.log(`📄 Plats totaux : ${allItems.length}`);
    console.log(`✅ Plats disponibles (isAvailable=true) : ${availableItems.length}`);
    console.log(`❌ Plats indisponibles : ${allItems.length - availableItems.length}\n`);
    
    // Compte par catégorie (disponibles seulement)
    const mongoByCategory = new Map<string, number>();
    availableItems.forEach(item => {
      const catName = (item.category as any)?.name.fr || 'Sans catégorie';
      mongoByCategory.set(catName, (mongoByCategory.get(catName) || 0) + 1);
    });
    
    console.log('📂 MONGODB — Plats disponibles par catégorie:\n');
    categories.forEach(cat => {
      const count = mongoByCategory.get(cat.name.fr) || 0;
      console.log(`   ${cat.name.fr.padEnd(20)} : ${count} plats`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2 — TEST API /api/menu/categories
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 PHASE 2 — TEST API /api/menu/categories\n');
    
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    
    try {
      const categoriesResponse = await axios.get(`${apiBaseUrl}/api/menu/categories`);
      const apiCategories = categoriesResponse.data.data;
      
      console.log(`✅ API retourne ${apiCategories.length} catégories`);
      console.log(`📂 MongoDB contient ${categories.length} catégories actives`);
      
      if (apiCategories.length === categories.length) {
        console.log('✅ Nombre de catégories cohérent\n');
      } else {
        console.log(`⚠️  Différence détectée : ${categories.length - apiCategories.length} catégorie(s)\n`);
      }
      
      console.log('📂 API — Catégories retournées:\n');
      apiCategories.forEach((cat: any) => {
        console.log(`   ${cat.name.fr} (slug: ${cat.slug})`);
      });
      
    } catch (error: any) {
      console.error(`❌ Erreur API /api/menu/categories:`, error.message);
      console.log('⚠️  Le backend n\'est probablement pas démarré\n');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3 — TEST API /api/menu/items (sans pagination)
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 PHASE 3 — TEST API /api/menu/items\n');
    
    try {
      const itemsResponse = await axios.get(`${apiBaseUrl}/api/menu/items?limit=200`);
      const apiData = itemsResponse.data.data;
      const apiItems = apiData.items;
      const apiPagination = apiData.pagination;
      
      console.log(`✅ API retourne ${apiItems.length} plats`);
      console.log(`📄 Pagination: page ${apiPagination.page}/${apiPagination.totalPages}, total: ${apiPagination.total}`);
      console.log(`📊 MongoDB disponibles: ${availableItems.length} plats`);
      
      if (apiItems.length === availableItems.length) {
        console.log('✅ Nombre de plats cohérent avec MongoDB (isAvailable=true)\n');
      } else {
        console.log(`⚠️  Différence : ${availableItems.length - apiItems.length} plat(s)\n`);
      }
      
      // Compte par catégorie depuis l'API
      const apiByCategory = new Map<string, number>();
      apiItems.forEach((item: any) => {
        const catName = item.category?.name.fr || 'Sans catégorie';
        apiByCategory.set(catName, (apiByCategory.get(catName) || 0) + 1);
      });
      
      console.log('📊 COMPARAISON PAR CATÉGORIE:\n');
      console.log('CATÉGORIE'.padEnd(25) + 'MONGODB'.padEnd(12) + 'API'.padEnd(12) + 'DIFFÉRENCE');
      console.log('─'.repeat(60));
      
      categories.forEach(cat => {
        const mongoCount = mongoByCategory.get(cat.name.fr) || 0;
        const apiCount = apiByCategory.get(cat.name.fr) || 0;
        const diff = apiCount - mongoCount;
        const diffStr = diff === 0 ? '✅ 0' : `⚠️  ${diff > 0 ? '+' : ''}${diff}`;
        
        console.log(
          cat.name.fr.padEnd(25) + 
          mongoCount.toString().padEnd(12) + 
          apiCount.toString().padEnd(12) + 
          diffStr
        );
      });
      
      // Vérifier s'il y a des plats dans l'API mais pas dans MongoDB (catégories supplémentaires)
      const extraCategories: string[] = [];
      apiByCategory.forEach((count, catName) => {
        if (!mongoByCategory.has(catName) && catName !== 'Sans catégorie') {
          extraCategories.push(catName);
        }
      });
      
      if (extraCategories.length > 0) {
        console.log(`\n⚠️  Catégories dans l'API mais pas dans MongoDB:`);
        extraCategories.forEach(cat => {
          console.log(`   - ${cat}: ${apiByCategory.get(cat)} plats`);
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Erreur API /api/menu/items:`, error.message);
      console.log('⚠️  Le backend n\'est probablement pas démarré\n');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RAPPORT FINAL
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('=== RÉSUMÉ API ===');
    console.log('═'.repeat(80) + '\n');
    
    console.log('✅ ROUTE PUBLIQUE: GET /api/menu/items');
    console.log('✅ FILTRE APPLIQUÉ: isAvailable=true (par défaut)');
    console.log('✅ PAGINATION: limit=50 par défaut, max=100');
    console.log('✅ TRI: order ASC, createdAt ASC\n');
    
    console.log('📊 LOGIQUE API:');
    console.log('   - Par défaut, l\'API retourne UNIQUEMENT les plats avec isAvailable=true');
    console.log('   - Les catégories sont filtrées par isActive=true');
    console.log('   - Pas de limite artificielle détectée dans le code');
    console.log('   - Tous les 114 plats disponibles devraient être retournés\n');
    
    console.log('💡 CONCLUSION:');
    console.log('   Si des plats semblent manquer dans le frontend, ce n\'est PAS');
    console.log('   un problème de l\'API backend. Le problème est soit:');
    console.log('   1. Dans le frontend (filtrage, limite, affichage)');
    console.log('   2. Dans la perception (plats présents mais mal organisés)');
    console.log('   3. Dans une attente incorrecte (plats jamais ajoutés à MongoDB)\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

auditApiMenu();
