/**
 * AUDIT COMPLET DU MENU BIZZ'ART
 * 
 * Compare la source officielle (seed-menu-real.ts) avec MongoDB
 * Identifie les plats manquants, doublons, et problèmes de données
 */

import mongoose from 'mongoose';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Import du menu source (seed-menu-real.ts sera analysé)
interface SourceMenuItem {
  categorySlug: string;
  nameFr: string;
  descFr: string;
  price: number;
  image?: string;
  order: number;
}

async function auditMenuComplet() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    // ═══════════════════════════════════════════════════════════════
    // A. RÉCUPÉRATION DES DONNÉES SOURCES
    // ═══════════════════════════════════════════════════════════════
    
    console.log('📊 PHASE A — ANALYSE DE LA SOURCE OFFICIELLE\n');
    
    // Lire le fichier seed-menu-real.ts pour extraire les plats
    const seedFilePath = './src/seed/seed-menu-real.ts';
    const seedContent = fs.readFileSync(seedFilePath, 'utf-8');
    
    // Compter les plats dans le seed (approximation via regex)
    const menuItemMatches = seedContent.match(/\{\s*categorySlug:/g);
    const sourceItemsCount = menuItemMatches ? menuItemMatches.length : 0;
    
    console.log(`📄 Source officielle : ${seedFilePath}`);
    console.log(`📊 Plats dans le seed : ~${sourceItemsCount} plats détectés\n`);

    // ═══════════════════════════════════════════════════════════════
    // B. RÉCUPÉRATION DES DONNÉES MONGODB
    // ═══════════════════════════════════════════════════════════════
    
    console.log('📊 PHASE B — ANALYSE DE MONGODB\n');
    
    const categories = await MenuCategory.find().sort({ order: 1 });
    const menuItems = await MenuItem.find().populate('category');
    
    console.log(`📂 Catégories dans MongoDB : ${categories.length}`);
    console.log(`📄 Plats dans MongoDB : ${menuItems.length}\n`);

    // Groupe par catégorie
    const itemsByCategory = new Map<string, any[]>();
    menuItems.forEach(item => {
      const catSlug = (item.category as any)?.slug || 'sans-categorie';
      if (!itemsByCategory.has(catSlug)) {
        itemsByCategory.set(catSlug, []);
      }
      itemsByCategory.get(catSlug)!.push(item);
    });

    console.log('📂 RÉPARTITION PAR CATÉGORIE :\n');
    categories.forEach(cat => {
      const items = itemsByCategory.get(cat.slug) || [];
      const active = items.filter(i => i.isAvailable).length;
      const inactive = items.filter(i => !i.isAvailable).length;
      console.log(`   ${cat.name.fr} (${cat.slug})`);
      console.log(`      Total: ${items.length} | Disponibles: ${active} | Indisponibles: ${inactive}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // C. DÉTECTION DES PROBLÈMES
    // ═══════════════════════════════════════════════════════════════
    
    console.log('\n📊 PHASE C — DÉTECTION DES PROBLÈMES\n');

    // 1. Plats inactifs
    const inactiveItems = menuItems.filter(item => !item.isAvailable);
    console.log(`⚠️  Plats désactivés : ${inactiveItems.length}`);
    if (inactiveItems.length > 0) {
      inactiveItems.forEach(item => {
        console.log(`   - ${item.name.fr} (${(item.category as any)?.name.fr})`);
      });
    }

    // 2. Recherche "Gouda" → doit être "Gouta"
    console.log('\n🔍 Recherche "Gouda" dans les descriptions :');
    const itemsWithGouda = menuItems.filter(item => 
      item.description?.fr?.toLowerCase().includes('gouda')
    );
    
    if (itemsWithGouda.length > 0) {
      console.log(`   ⚠️  ${itemsWithGouda.length} plat(s) contiennent "Gouda" :`);
      itemsWithGouda.forEach(item => {
        console.log(`      - ${item.name.fr}`);
        console.log(`        Description actuelle : ${item.description?.fr}`);
        console.log(`        Catégorie : ${(item.category as any)?.name.fr}`);
      });
    } else {
      console.log('   ✅ Aucun plat ne contient "Gouda" (déjà corrigé)');
    }

    // 3. Doublons (même nom dans même catégorie)
    console.log('\n🔍 Recherche de doublons :');
    const duplicates: string[] = [];
    itemsByCategory.forEach((items, catSlug) => {
      const nameCount = new Map<string, number>();
      items.forEach(item => {
        const name = item.name.fr;
        nameCount.set(name, (nameCount.get(name) || 0) + 1);
      });
      nameCount.forEach((count, name) => {
        if (count > 1) {
          duplicates.push(`${name} (${catSlug}) : ${count} occurrences`);
        }
      });
    });
    
    if (duplicates.length > 0) {
      console.log(`   ⚠️  ${duplicates.length} doublon(s) détecté(s) :`);
      duplicates.forEach(dup => console.log(`      - ${dup}`));
    } else {
      console.log('   ✅ Aucun doublon détecté');
    }

    // 4. Plats sans image
    console.log('\n🔍 Plats sans image :');
    const noImageItems = menuItems.filter(item => !item.image);
    if (noImageItems.length > 0) {
      console.log(`   ℹ️  ${noImageItems.length} plat(s) sans image`);
    } else {
      console.log('   ✅ Tous les plats ont une image');
    }

    // 5. Plats sans prix
    console.log('\n🔍 Plats avec problème de prix :');
    const noPriceItems = menuItems.filter(item => !item.price || item.price <= 0);
    if (noPriceItems.length > 0) {
      console.log(`   ⚠️  ${noPriceItems.length} plat(s) sans prix valide :`);
      noPriceItems.forEach(item => {
        console.log(`      - ${item.name.fr} : ${item.price} TND`);
      });
    } else {
      console.log('   ✅ Tous les plats ont un prix valide');
    }

    // ═══════════════════════════════════════════════════════════════
    // RAPPORT FINAL
    // ═══════════════════════════════════════════════════════════════
    
    console.log('\n' + '═'.repeat(70));
    console.log('=== AUDIT MENU BIZZ\'ART — RAPPORT FINAL ===');
    console.log('═'.repeat(70) + '\n');

    console.log('📊 STATISTIQUES :');
    console.log(`   Source officielle (seed) : ~${sourceItemsCount} plats`);
    console.log(`   MongoDB total : ${menuItems.length} plats`);
    console.log(`   MongoDB disponibles : ${menuItems.filter(i => i.isAvailable).length} plats`);
    console.log(`   MongoDB indisponibles : ${inactiveItems.length} plats`);
    console.log(`   Catégories : ${categories.length}`);
    console.log(`   Doublons : ${duplicates.length}`);
    console.log(`   Problèmes "Gouda" : ${itemsWithGouda.length}`);
    console.log(`   Sans image : ${noImageItems.length}`);
    console.log(`   Sans prix : ${noPriceItems.length}`);

    console.log('\n⚠️  PLATS DÉSACTIVÉS :');
    if (inactiveItems.length > 0) {
      inactiveItems.forEach((item, idx) => {
        console.log(`\n${idx + 1}. ${item.name.fr}`);
        console.log(`   Catégorie : ${(item.category as any)?.name.fr}`);
        console.log(`   Prix : ${item.price} TND`);
        console.log(`   Description : ${item.description?.fr || 'N/A'}`);
        console.log(`   Statut : isAvailable = false`);
        console.log(`   Cause probable : Désactivé manuellement ou via seed`);
      });
    } else {
      console.log('   ✅ Aucun plat désactivé');
    }

    console.log('\n=== CORRECTION "GOUDA" → "GOUTA" ===');
    if (itemsWithGouda.length > 0) {
      itemsWithGouda.forEach(item => {
        console.log(`\n⚠️  Plat concerné : ${item.name.fr}`);
        console.log(`   Ancienne valeur : ${item.description?.fr}`);
        const newDesc = item.description?.fr?.replace(/Gouda/gi, 'Gouta');
        console.log(`   Nouvelle valeur : ${newDesc}`);
        console.log(`   Action requise : Remplacement dans MongoDB`);
      });
    } else {
      console.log('   ✅ Correction déjà appliquée (aucun "Gouda" trouvé)');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('FIN DE L\'AUDIT');
    console.log('═'.repeat(70));

    console.log('\n💡 RECOMMANDATIONS :');
    console.log('   1. Si des plats sont désactivés par erreur → les réactiver');
    console.log('   2. Si "Gouda" existe encore → le corriger en "Gouta"');
    console.log('   3. Comparer manuellement le seed avec MongoDB pour identifier les manquants');
    console.log('   4. Vérifier l\'API /api/menu/public pour confirmation');

  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

auditMenuComplet();
