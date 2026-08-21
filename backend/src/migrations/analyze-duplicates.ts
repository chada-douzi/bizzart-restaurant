/**
 * ANALYSE DES DOUBLONS (LECTURE SEULE)
 * 
 * Ce script analyse les 29 URLs utilisées plusieurs fois
 * sans aucune modification
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationItem {
  menuItemId: string;
  nameFr: string;
  category: string;
  currentImage: string;
  validatedImage: string | null;
  status: string;
  professionalFilename: string;
  duplicate: boolean;
}

interface ValidationMapping {
  version: number;
  readonly: boolean;
  validatedAt: string;
  generatedAt: string;
  totalItems: number;
  summary: any;
  validations: ValidationItem[];
}

interface DuplicateInfo {
  url: string;
  count: number;
  plats: Array<{
    nom: string;
    menuItemId: string;
    category: string;
    status: string;
  }>;
}

function analyzeDuplicates() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ANALYSE DES DOUBLONS (LECTURE SEULE)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const jsonPath = path.join(__dirname, '../../validation-exports/bizzart-photo-validation-1787087704324.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Fichier JSON introuvable');
    process.exit(1);
  }

  const mapping: ValidationMapping = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`✅ ${mapping.totalItems} validations chargées`);
  console.log('');

  // Grouper par URL
  const urlMap = new Map<string, ValidationItem[]>();

  for (const item of mapping.validations) {
    const url = item.currentImage;
    const items = urlMap.get(url) || [];
    items.push(item);
    urlMap.set(url, items);
  }

  // Extraire uniquement les doublons (count > 1)
  const duplicates: DuplicateInfo[] = [];

  for (const [url, items] of urlMap) {
    if (items.length > 1) {
      duplicates.push({
        url,
        count: items.length,
        plats: items.map(item => ({
          nom: item.nameFr,
          menuItemId: item.menuItemId,
          category: item.category,
          status: item.status,
        })),
      });
    }
  }

  // Trier par nombre d'utilisations décroissant
  duplicates.sort((a, b) => b.count - a.count);

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`DOUBLONS DÉTECTÉS : ${duplicates.length} URLs`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  let index = 1;
  for (const dup of duplicates) {
    console.log(`[${index}] URL utilisée ${dup.count} fois :`);
    console.log(`    ${dup.url}`);
    console.log('');
    console.log('    Plats concernés :');

    for (const plat of dup.plats) {
      const statusEmoji = plat.status === 'validated' ? '✅' : '⏳';
      console.log(`       ${statusEmoji} ${plat.nom}`);
      console.log(`          Catégorie: ${plat.category}`);
      console.log(`          Status: ${plat.status}`);
      console.log(`          ID: ${plat.menuItemId}`);
      console.log('');
    }

    // Analyse du doublon
    const validatedCount = dup.plats.filter(p => p.status === 'validated').length;
    const pendingCount = dup.plats.filter(p => p.status === 'pending').length;

    console.log('    Analyse :');
    if (dup.count === 2 && dup.plats.every(p => p.category === dup.plats[0].category)) {
      console.log('       Type: NORMAL (même catégorie, plats similaires)');
    } else if (dup.count > 3) {
      console.log('       Type: SUSPECT (trop de plats avec la même photo)');
    } else {
      console.log('       Type: À VÉRIFIER');
    }

    if (validatedCount > 0) {
      console.log(`       ⚠️ ${validatedCount} plat(s) validé(s) avec cette URL`);
    }
    if (pendingCount > 0) {
      console.log(`       ⏳ ${pendingCount} plat(s) non validé(s) conservent cette URL`);
    }

    console.log('');
    console.log('    Impact migration :');
    if (validatedCount === 0) {
      console.log('       ✅ Aucun impact (tous pending)');
    } else if (validatedCount === dup.count) {
      console.log('       ⚠️ TOUS les plats changeront d\'URL');
    } else {
      console.log('       ⚠️ IMPACT PARTIEL: certains plats changeront, d\'autres non');
    }

    console.log('');
    console.log('───────────────────────────────────────────────────────────');
    console.log('');

    index++;
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('RÉSUMÉ DES DOUBLONS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`   Total URLs doublons        : ${duplicates.length}`);
  console.log(`   Plats concernés            : ${duplicates.reduce((sum, d) => sum + d.count, 0)}`);
  console.log('');

  // Sauvegarder rapport
  const reportPath = path.join(__dirname, '../../DUPLICATES-ANALYSIS-REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(duplicates, null, 2));
  console.log(`📄 Rapport sauvegardé : ${reportPath}`);
  console.log('');

  process.exit(0);
}

analyzeDuplicates();
