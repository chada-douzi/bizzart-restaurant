/**
 * AUDIT STRICT COMPLET DU MENU BIZZ'ART
 * 
 * MODE: READ-ONLY — AUCUNE MODIFICATION
 * 
 * Phases:
 * 1. Comparaison exacte SEED vs MONGODB
 * 2. Analyse des doublons vs variantes
 * 3. Vérification API
 * 4. Vérification "Gouda" vs "Gouta"
 * 5. Rapport final détaillé
 */

import mongoose from 'mongoose';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Fonction de normalisation des noms pour comparaison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Supprime les accents
}

async function auditStrictComplet() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    
    console.log('═'.repeat(80));
    console.log('=== AUDIT STRICT COMPLET DU MENU BIZZ\'ART ===');
    console.log('═'.repeat(80));
    console.log('MODE: READ-ONLY — Aucune modification ne sera effectuée\n');

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1 — LECTURE DU SEED OFFICIEL
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n📊 PHASE 1 — ANALYSE DU SEED OFFICIEL\n');
    
    const seedFilePath = './src/seed/seed-menu-real.ts';
    const seedContent = fs.readFileSync(seedFilePath, 'utf-8');
    
    // Extraction des plats du seed via regex
    const itemPattern = /\{\s*categorySlug:\s*['"]([^'"]+)['"],\s*nameFr:\s*['"]([^'"]+)['"],\s*descFr:\s*['"]([^'"]*)['"],\s*price:\s*([\d.]+),/g;
    
    const seedItems: Array<{
      categorySlug: string;
      nameFr: string;
      descFr: string;
      price: number;
      normalizedName: string;
    }> = [];
    
    let match;
    while ((match = itemPattern.exec(seedContent)) !== null) {
      seedItems.push({
        categorySlug: match[1],
        nameFr: match[2],
        descFr: match[3],
        price: parseFloat(match[4]),
        normalizedName: normalizeName(match[2])
      });
    }
    
    console.log(`📄 Fichier seed: ${seedFilePath}`);
    console.log(`📊 Plats extraits du seed: ${seedItems.length}`);
    
    // Groupe par catégorie
    const seedByCategory = new Map<string, typeof seedItems>();
    seedItems.forEach(item => {
      if (!seedByCategory.has(item.categorySlug)) {
        seedByCategory.set(item.categorySlug, []);
      }
      seedByCategory.get(item.categorySlug)!.push(item);
    });
    
    console.log(`📂 Catégories dans le seed: ${seedByCategory.size}\n`);
    
    seedByCategory.forEach((items, catSlug) => {
      console.log(`   ${catSlug}: ${items.length} plats`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2 — LECTURE DE MONGODB
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 PHASE 2 — ANALYSE DE MONGODB\n');
    
    const categories = await MenuCategory.find().sort({ order: 1 });
    const mongoItems = await MenuItem.find().populate('category');
    
    console.log(`📂 Catégories dans MongoDB: ${categories.length}`);
    console.log(`📄 Plats dans MongoDB: ${mongoItems.length}`);
    console.log(`✅ Plats disponibles: ${mongoItems.filter(i => i.isAvailable).length}`);
    console.log(`⚠️  Plats indisponibles: ${mongoItems.filter(i => !i.isAvailable).length}\n`);
    
    // Groupe par catégorie
    const mongoByCategory = new Map<string, typeof mongoItems>();
    mongoItems.forEach(item => {
      const catSlug = (item.category as any)?.slug || 'sans-categorie';
      if (!mongoByCategory.has(catSlug)) {
        mongoByCategory.set(catSlug, []);
      }
      mongoByCategory.get(catSlug)!.push(item);
    });
    
    console.log('📂 Répartition MongoDB par catégorie:\n');
    categories.forEach(cat => {
      const items = mongoByCategory.get(cat.slug) || [];
      console.log(`   ${cat.slug}: ${items.length} plats`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3 — COMPARAISON SEED vs MONGODB
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n📊 PHASE 3 — COMPARAISON SEED vs MONGODB\n');
    
    // Créer un Set des noms normalisés MongoDB
    const mongoNamesSet = new Set(
      mongoItems.map(item => normalizeName(item.name.fr))
    );
    
    // Créer un Set des noms normalisés SEED
    const seedNamesSet = new Set(
      seedItems.map(item => item.normalizedName)
    );
    
    // Plats dans SEED mais pas dans MONGODB
    const missingInMongo: typeof seedItems = [];
    seedItems.forEach(seedItem => {
      if (!mongoNamesSet.has(seedItem.normalizedName)) {
        missingInMongo.push(seedItem);
      }
    });
    
    // Plats dans MONGODB mais pas dans SEED
    const missingInSeed: typeof mongoItems = [];
    mongoItems.forEach(mongoItem => {
      const normalized = normalizeName(mongoItem.name.fr);
      if (!seedNamesSet.has(normalized)) {
        missingInSeed.push(mongoItem);
      }
    });
    
    console.log('═══ PLATS DU SEED ABSENTS DE MONGODB ===\n');
    if (missingInMongo.length === 0) {
      console.log('✅ Aucun plat du seed n\'est manquant dans MongoDB\n');
    } else {
      console.log(`⚠️  ${missingInMongo.length} plat(s) du seed manquant(s) dans MongoDB:\n`);
      missingInMongo.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.nameFr}`);
        console.log(`   Catégorie: ${item.categorySlug}`);
        console.log(`   Prix: ${item.price} TND`);
        console.log(`   Description: ${item.descFr.substring(0, 80)}${item.descFr.length > 80 ? '...' : ''}`);
        console.log('');
      });
    }
    
    console.log('═══ PLATS MONGODB ABSENTS DU SEED ===\n');
    if (missingInSeed.length === 0) {
      console.log('✅ Aucun plat MongoDB n\'est absent du seed\n');
    } else {
      console.log(`⚠️  ${missingInSeed.length} plat(s) MongoDB absent(s) du seed:\n`);
      missingInSeed.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.name.fr}`);
        console.log(`   Catégorie: ${(item.category as any)?.name.fr || 'N/A'} (${(item.category as any)?.slug})`);
        console.log(`   Prix: ${item.price} TND`);
        console.log(`   Slug: ${item.slug}`);
        console.log(`   Image: ${item.image ? '✅' : '❌'}`);
        console.log(`   Disponible: ${item.isAvailable ? '✅' : '❌'}`);
        console.log(`   Description: ${item.description?.fr?.substring(0, 80) || 'N/A'}${(item.description?.fr?.length || 0) > 80 ? '...' : ''}`);
        console.log('');
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4 — ANALYSE DES DOUBLONS vs VARIANTES
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n📊 PHASE 4 — ANALYSE DOUBLONS vs VARIANTES\n');
    
    const duplicateGroups = new Map<string, typeof mongoItems>();
    mongoItems.forEach(item => {
      const key = normalizeName(item.name.fr);
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(item);
    });
    
    const trueDuplicates: Array<{name: string, items: typeof mongoItems}> = [];
    const legitimateVariants: Array<{name: string, items: typeof mongoItems}> = [];
    
    duplicateGroups.forEach((items, name) => {
      if (items.length > 1) {
        // Analyser si ce sont des variantes légitimes ou des vrais doublons
        const prices = items.map(i => i.price);
        const uniquePrices = [...new Set(prices)];
        const descriptions = items.map(i => i.description?.fr || '');
        
        // Critères pour variante légitime:
        // - Prix différents OU
        // - Descriptions mentionnant "personnes", "portions", "petit", "grand"
        const hasVariantIndicators = descriptions.some(d => 
          /personnes?|portions?|petit|grand|small|medium|large|pizza|sandwich/i.test(d)
        );
        
        if (uniquePrices.length > 1 || hasVariantIndicators) {
          legitimateVariants.push({ name: items[0].name.fr, items });
        } else {
          trueDuplicates.push({ name: items[0].name.fr, items });
        }
      }
    });
    
    console.log('═══ VARIANTES LÉGITIMES (NE PAS SUPPRIMER) ===\n');
    if (legitimateVariants.length === 0) {
      console.log('Aucune variante détectée\n');
    } else {
      legitimateVariants.forEach((group, idx) => {
        console.log(`${idx + 1}. ${group.name} — ${group.items.length} variantes`);
        group.items.forEach((item, i) => {
          console.log(`   [${i + 1}] Prix: ${item.price} TND | Slug: ${item.slug}`);
          console.log(`       Description: ${item.description?.fr?.substring(0, 100) || 'N/A'}`);
        });
        console.log('');
      });
    }
    
    console.log('═══ VRAIS DOUBLONS (À VÉRIFIER) ===\n');
    if (trueDuplicates.length === 0) {
      console.log('✅ Aucun vrai doublon détecté\n');
    } else {
      trueDuplicates.forEach((group, idx) => {
        console.log(`${idx + 1}. ${group.name} — ${group.items.length} occurrences identiques`);
        group.items.forEach((item, i) => {
          console.log(`   [${i + 1}] ID: ${item._id}`);
          console.log(`       Prix: ${item.price} TND | Slug: ${item.slug}`);
          console.log(`       Description: ${item.description?.fr?.substring(0, 80) || 'N/A'}`);
        });
        console.log('');
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 5 — VÉRIFICATION "GOUDA" vs "GOUTA"
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n📊 PHASE 5 — VÉRIFICATION "GOUDA" vs "GOUTA"\n');
    
    // Recherche dans MongoDB
    const itemsWithGouda = mongoItems.filter(item => 
      item.description?.fr?.toLowerCase().includes('gouda') ||
      item.name.fr?.toLowerCase().includes('gouda')
    );
    
    const itemsWithGouta = mongoItems.filter(item => 
      item.description?.fr?.toLowerCase().includes('gouta') ||
      item.name.fr?.toLowerCase().includes('gouta')
    );
    
    console.log('═══ OCCURRENCES "GOUDA" (à corriger) ===\n');
    if (itemsWithGouda.length === 0) {
      console.log('✅ Aucune occurrence de "Gouda" trouvée dans MongoDB\n');
    } else {
      console.log(`⚠️  ${itemsWithGouda.length} occurrence(s) de "Gouda" trouvée(s):\n`);
      itemsWithGouda.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.name.fr}`);
        console.log(`   Description: ${item.description?.fr}`);
        console.log('');
      });
    }
    
    console.log('═══ OCCURRENCES "GOUTA" (correct) ===\n');
    if (itemsWithGouta.length === 0) {
      console.log('⚠️  Aucune occurrence de "Gouta" trouvée\n');
    } else {
      console.log(`✅ ${itemsWithGouta.length} occurrence(s) de "Gouta" trouvée(s):\n`);
      itemsWithGouta.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.name.fr}`);
        console.log(`   Description: ${item.description?.fr}`);
        console.log('');
      });
    }
    
    // Recherche dans le SEED
    const seedWithGouda = seedItems.filter(item =>
      item.descFr.toLowerCase().includes('gouda') ||
      item.nameFr.toLowerCase().includes('gouda')
    );
    
    const seedWithGouta = seedItems.filter(item =>
      item.descFr.toLowerCase().includes('gouta') ||
      item.nameFr.toLowerCase().includes('gouta')
    );
    
    console.log('═══ SEED - OCCURRENCES "GOUDA" ===\n');
    if (seedWithGouda.length === 0) {
      console.log('✅ Aucune occurrence de "Gouda" dans le seed\n');
    } else {
      console.log(`⚠️  ${seedWithGouda.length} occurrence(s) dans le seed:\n`);
      seedWithGouda.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.nameFr}`);
        console.log(`   Description: ${item.descFr}`);
        console.log('');
      });
    }
    
    console.log('═══ SEED - OCCURRENCES "GOUTA" ===\n');
    if (seedWithGouta.length === 0) {
      console.log('⚠️  Aucune occurrence de "Gouta" dans le seed\n');
    } else {
      console.log(`✅ ${seedWithGouta.length} occurrence(s) dans le seed:\n`);
      seedWithGouta.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.nameFr}`);
        console.log(`   Description: ${item.descFr}`);
        console.log('');
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RAPPORT FINAL
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('=== RAPPORT FINAL — AUDIT STRICT COMPLET ===');
    console.log('═'.repeat(80) + '\n');
    
    console.log('📊 STATISTIQUES GÉNÉRALES:\n');
    console.log(`   1. Plats dans le SEED:                    ${seedItems.length}`);
    console.log(`   2. Plats dans MONGODB:                    ${mongoItems.length}`);
    console.log(`   3. Plats MongoDB disponibles:             ${mongoItems.filter(i => i.isAvailable).length}`);
    console.log(`   4. Plats MongoDB indisponibles:           ${mongoItems.filter(i => !i.isAvailable).length}`);
    console.log(`   5. Différence SEED vs MongoDB:            ${mongoItems.length - seedItems.length} (MongoDB - SEED)`);
    console.log(`   6. Catégories:                            ${categories.length}`);
    
    console.log('\n📊 COMPARAISON SEED vs MONGODB:\n');
    console.log(`   7. Plats SEED absents de MongoDB:         ${missingInMongo.length}`);
    console.log(`   8. Plats MongoDB absents du SEED:         ${missingInSeed.length}`);
    
    console.log('\n📊 DOUBLONS ET VARIANTES:\n');
    console.log(`   9. Variantes légitimes détectées:         ${legitimateVariants.length} groupes`);
    console.log(`  10. Vrais doublons détectés:               ${trueDuplicates.length} groupes`);
    
    console.log('\n📊 VÉRIFICATION "GOUDA" vs "GOUTA":\n');
    console.log(`  11. "Gouda" dans MongoDB:                  ${itemsWithGouda.length}`);
    console.log(`  12. "Gouta" dans MongoDB:                  ${itemsWithGouta.length}`);
    console.log(`  13. "Gouda" dans SEED:                     ${seedWithGouda.length}`);
    console.log(`  14. "Gouta" dans SEED:                     ${seedWithGouta.length}`);
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('=== RÉSUMÉ DES PROBLÈMES DÉTECTÉS ===');
    console.log('═'.repeat(80) + '\n');
    
    const problems: string[] = [];
    
    if (missingInMongo.length > 0) {
      problems.push(`⚠️  ${missingInMongo.length} plat(s) du SEED manquant(s) dans MongoDB`);
    }
    if (missingInSeed.length > 0) {
      problems.push(`ℹ️  ${missingInSeed.length} plat(s) dans MongoDB mais pas dans le SEED (ajouts manuels?)`);
    }
    if (trueDuplicates.length > 0) {
      problems.push(`⚠️  ${trueDuplicates.length} groupe(s) de vrais doublons à vérifier`);
    }
    if (itemsWithGouda.length > 0) {
      problems.push(`⚠️  ${itemsWithGouda.length} plat(s) contiennent encore "Gouda" au lieu de "Gouta"`);
    }
    
    if (problems.length === 0) {
      console.log('✅ Aucun problème critique détecté\n');
      console.log('ℹ️  Points d\'attention:');
      console.log(`   - ${legitimateVariants.length} groupe(s) de variantes légitimes (normal)`);
      console.log(`   - ${missingInSeed.length} plat(s) supplémentaires dans MongoDB (peut être voulu)`);
    } else {
      console.log('PROBLÈMES DÉTECTÉS:\n');
      problems.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p}`);
      });
    }
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('FIN DE L\'AUDIT STRICT');
    console.log('═'.repeat(80));
    console.log('\n✅ Aucune modification n\'a été effectuée (mode READ-ONLY)');
    console.log('💡 En attente des instructions pour les corrections\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

auditStrictComplet();
