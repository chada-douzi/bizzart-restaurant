/**
 * TEST API DIRECT — Sans passer par axios
 * Démarre le serveur et teste les routes via fetch
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function testApiDirect() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('═'.repeat(80));
  console.log('TEST API DIRECT — Menu Public');
  console.log('═'.repeat(80) + '\n');
  
  try {
    // Test 1 : GET /api/menu/categories
    console.log('📊 TEST 1 — GET /api/menu/categories\n');
    const catResponse = await fetch(`${baseUrl}/api/menu/categories`);
    const catData = await catResponse.json();
    
    if (catData.success) {
      console.log(`✅ ${catData.data.length} catégories retournées`);
      catData.data.forEach((cat: any) => {
        console.log(`   - ${cat.name.fr} (${cat.slug})`);
      });
    } else {
      console.log('❌ Erreur:', catData.message);
    }
    
    // Test 2 : GET /api/menu/items (limite 200 pour capturer tous les plats)
    console.log('\n\n📊 TEST 2 — GET /api/menu/items?limit=200\n');
    const itemsResponse = await fetch(`${baseUrl}/api/menu/items?limit=200`);
    
    if (!itemsResponse.ok) {
      console.log(`❌ Erreur HTTP ${itemsResponse.status}: ${itemsResponse.statusText}`);
      const errorText = await itemsResponse.text();
      console.log('Réponse:', errorText);
      return;
    }
    
    const itemsData = await itemsResponse.json();
    
    if (itemsData.success) {
      const { items, pagination } = itemsData.data;
      console.log(`✅ ${items.length} plats retournés`);
      console.log(`📄 Pagination: page ${pagination.page}/${pagination.totalPages}, total: ${pagination.total}\n`);
      
      // Grouper par catégorie
      const byCategory = new Map<string, number>();
      items.forEach((item: any) => {
        const catName = item.category?.name?.fr || 'Sans catégorie';
        byCategory.set(catName, (byCategory.get(catName) || 0) + 1);
      });
      
      console.log('📊 PLATS PAR CATÉGORIE (API):\n');
      console.log('CATÉGORIE'.padEnd(25) + 'NOMBRE');
      console.log('─'.repeat(40));
      
      let totalCount = 0;
      byCategory.forEach((count, catName) => {
        console.log(catName.padEnd(25) + count);
        totalCount += count;
      });
      console.log('─'.repeat(40));
      console.log('TOTAL'.padEnd(25) + totalCount);
      
    } else {
      console.log('❌ Erreur:', itemsData.message);
    }
    
    // Test 3 : GET /api/menu/items sans paramètres (défaut)
    console.log('\n\n📊 TEST 3 — GET /api/menu/items (sans paramètres, défaut)\n');
    const defaultResponse = await fetch(`${baseUrl}/api/menu/items`);
    const defaultData = await defaultResponse.json();
    
    if (defaultData.success) {
      const { pagination } = defaultData.data;
      console.log(`✅ Pagination par défaut:`);
      console.log(`   - limit: ${pagination.limit}`);
      console.log(`   - page: ${pagination.page}`);
      console.log(`   - total: ${pagination.total}`);
      console.log(`   - totalPages: ${pagination.totalPages}`);
      console.log(`   - items retournés: ${defaultData.data.items.length}`);
    }
    
  } catch (error: any) {
    console.error('❌ Erreur réseau:', error.message);
    console.log('\n⚠️  Le serveur backend doit être démarré sur le port 3000');
    console.log('   Lancez: cd backend && npm run dev');
  }
  
  console.log('\n' + '═'.repeat(80));
}

testApiDirect();
