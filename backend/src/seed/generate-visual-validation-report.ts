/**
 * GÉNÉRATION RAPPORT DE VALIDATION VISUELLE DES 98 PHOTOS
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Objectif : Préparer un rapport pour validation visuelle humaine
 * Aucune validation automatique de la correspondance plat/photo
 * 
 * AUCUNE MODIFICATION DE DONNÉES
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

dotenv.config();

interface PlatInfo {
  index: number;
  id: string;
  nameFr: string;
  categoryName: string;
  imageUrl: string;
  imageFileName: string;
  slug: string;
  urlAccessible: boolean;
  httpStatus: number;
  usageCount: number;
  status: '⏳ À VÉRIFIER VISUELLEMENT' | '🔴 URL INACCESSIBLE';
}

interface DuplicatePhoto {
  url: string;
  count: number;
  plats: string[];
}

async function testUrlAccessibility(url: string): Promise<{ accessible: boolean; status: number }> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { timeout: 5000 }, (res) => {
      const status = res.statusCode || 0;
      const accessible = status >= 200 && status < 400;
      res.resume();
      resolve({ accessible, status });
    });

    request.on('error', () => {
      resolve({ accessible: false, status: 0 });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ accessible: false, status: 0 });
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║ GÉNÉRATION RAPPORT VALIDATION VISUELLE - 98 PHOTOS            ║');
  console.log('║ MODE STRICTEMENT LECTURE SEULE                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('✓ Connecté à MongoDB\n');

  // ═══════════════════════════════════════════════════════════════════════
  // RÉCUPÉRATION DES DONNÉES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📊 RÉCUPÉRATION DES 98 PLATS\n');

  const menuItems = await MenuItem.find({})
    .populate('category')
    .sort({ order: 1 })
    .lean();

  console.log(`✓ ${menuItems.length} plats récupérés\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // ANALYSE DES URLS ET DOUBLONS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔍 ANALYSE DES URLs ET DÉTECTION DES DOUBLONS\n');

  const urlUsageMap = new Map<string, string[]>();
  const platsInfo: PlatInfo[] = [];

  // Première passe : compter les usages
  for (const item of menuItems) {
    if (item.image) {
      if (!urlUsageMap.has(item.image)) {
        urlUsageMap.set(item.image, []);
      }
      urlUsageMap.get(item.image)!.push(item.name.fr || item.name.en || '');
    }
  }

  console.log(`✓ ${urlUsageMap.size} URLs uniques détectées\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // TEST DES URLs
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🌐 TEST D\'ACCESSIBILITÉ DES URLs\n');
  console.log('⏳ Test en cours (peut prendre quelques minutes)...\n');

  const urlAccessibilityCache = new Map<string, { accessible: boolean; status: number }>();

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const categoryName = (item.category as any)?.name?.fr || 'Unknown';

    let urlAccessible = true;
    let httpStatus = 200;

    if (item.image) {
      // Cache pour éviter de tester plusieurs fois la même URL
      if (!urlAccessibilityCache.has(item.image)) {
        const result = await testUrlAccessibility(item.image);
        urlAccessibilityCache.set(item.image, result);
        urlAccessible = result.accessible;
        httpStatus = result.status;
      } else {
        const cached = urlAccessibilityCache.get(item.image)!;
        urlAccessible = cached.accessible;
        httpStatus = cached.status;
      }
    }

    const fileName = item.image ? item.image.split('/').pop() || 'N/A' : 'N/A';
    const usageCount = urlUsageMap.get(item.image || '')?.length || 1;
    
    const platInfo: PlatInfo = {
      index: i + 1,
      id: item._id.toString(),
      nameFr: item.name.fr || item.name.en || '',
      categoryName,
      imageUrl: item.image || '',
      imageFileName: fileName,
      slug: item.slug,
      urlAccessible,
      httpStatus,
      usageCount,
      status: urlAccessible ? '⏳ À VÉRIFIER VISUELLEMENT' : '🔴 URL INACCESSIBLE',
    };

    platsInfo.push(platInfo);

    if ((i + 1) % 10 === 0 || i === menuItems.length - 1) {
      console.log(`   Testé ${i + 1}/${menuItems.length} URLs...`);
    }
  }

  console.log('\n✓ Test des URLs terminé\n');

  // ═══════════════════════════════════════════════════════════════════════
  // IDENTIFICATION DES DOUBLONS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔄 IDENTIFICATION DES PHOTOS DUPLIQUÉES\n');

  const duplicates: DuplicatePhoto[] = [];

  for (const [url, plats] of urlUsageMap.entries()) {
    if (plats.length > 1) {
      duplicates.push({
        url,
        count: plats.length,
        plats,
      });
    }
  }

  console.log(`✓ ${duplicates.length} photos utilisées par plusieurs plats\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // GÉNÉRATION DES RAPPORTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('💾 GÉNÉRATION DES RAPPORTS\n');

  const reportDir = path.join(__dirname, '../../audit-reports');
  await fs.mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // ───────────────────────────────────────────────────────────────────────
  // RAPPORT MARKDOWN PRINCIPAL
  // ───────────────────────────────────────────────────────────────────────

  let markdown = `# 📸 VALIDATION VISUELLE DES 98 PHOTOS - BIZZ'ART\n\n`;
  markdown += `**Généré le :** ${new Date().toLocaleString('fr-FR')}\n\n`;
  markdown += `---\n\n`;
  markdown += `## ⚠️ IMPORTANT\n\n`;
  markdown += `**CE RAPPORT NE VALIDE PAS AUTOMATIQUEMENT LA CORRESPONDANCE PLAT/PHOTO.**\n\n`;
  markdown += `Chaque photo doit être vérifiée visuellement par un humain pour confirmer qu'elle correspond bien au plat indiqué.\n\n`;
  markdown += `Le statut "⏳ À VÉRIFIER VISUELLEMENT" signifie :\n`;
  markdown += `- ✅ L'URL est accessible\n`;
  markdown += `- ✅ L'image se charge correctement\n`;
  markdown += `- ❓ La correspondance visuelle plat/photo N'EST PAS confirmée\n\n`;
  markdown += `---\n\n`;

  markdown += `## 📊 STATISTIQUES GLOBALES\n\n`;
  const urlsAccessibles = platsInfo.filter(p => p.urlAccessible).length;
  const urlsInaccessibles = platsInfo.filter(p => !p.urlAccessible).length;
  const photosUniques = urlUsageMap.size - duplicates.length;
  const photosDupliquees = duplicates.length;

  markdown += `| Métrique | Valeur |\n`;
  markdown += `|----------|--------|\n`;
  markdown += `| **Total plats** | ${platsInfo.length} |\n`;
  markdown += `| **URLs accessibles** | ${urlsAccessibles} |\n`;
  markdown += `| **URLs inaccessibles** | ${urlsInaccessibles} |\n`;
  markdown += `| **Photos uniques** | ${photosUniques} |\n`;
  markdown += `| **Photos dupliquées** | ${photosDupliquees} |\n`;
  markdown += `| **Plats nécessitant validation visuelle** | ${platsInfo.length} |\n\n`;

  markdown += `---\n\n`;

  // ───────────────────────────────────────────────────────────────────────
  // TABLEAU DES 98 PLATS
  // ───────────────────────────────────────────────────────────────────────

  markdown += `## 📋 TABLEAU DES 98 PLATS\n\n`;
  markdown += `| # | Catégorie | Plat | Fichier Image | Doublon | Statut |\n`;
  markdown += `|---|-----------|------|---------------|---------|--------|\n`;

  for (const plat of platsInfo) {
    const doublonText = plat.usageCount > 1 ? `⚠️ ${plat.usageCount}x` : '—';
    markdown += `| ${plat.index} | ${plat.categoryName} | ${plat.nameFr} | \`${plat.imageFileName}\` | ${doublonText} | ${plat.status} |\n`;
  }

  markdown += `\n---\n\n`;

  // ───────────────────────────────────────────────────────────────────────
  // PHOTOS UTILISÉES PAR PLUSIEURS PLATS
  // ───────────────────────────────────────────────────────────────────────

  if (duplicates.length > 0) {
    markdown += `## 🔄 PHOTOS UTILISÉES PAR PLUSIEURS PLATS (${duplicates.length})\n\n`;
    markdown += `**⚠️ ATTENTION :** Ces photos doivent être vérifiées en priorité.\n\n`;

    duplicates.sort((a, b) => b.count - a.count);

    for (let i = 0; i < duplicates.length; i++) {
      const dup = duplicates[i];
      const fileName = dup.url.split('/').pop() || 'N/A';
      
      markdown += `### ${i + 1}. \`${fileName}\`\n\n`;
      markdown += `- **Nombre d'utilisations :** ${dup.count}\n`;
      markdown += `- **URL :** \`${dup.url}\`\n`;
      markdown += `- **Plats concernés :**\n`;
      dup.plats.forEach((plat, idx) => {
        markdown += `  ${idx + 1}. ${plat}\n`;
      });
      markdown += `\n**Action requise :** Vérifier visuellement si cette photo convient pour tous les plats ou si certains nécessitent une photo unique.\n\n`;
    }

    markdown += `---\n\n`;
  }

  // ───────────────────────────────────────────────────────────────────────
  // PHOTOS INACCESSIBLES
  // ───────────────────────────────────────────────────────────────────────

  const inaccessibles = platsInfo.filter(p => !p.urlAccessible);

  if (inaccessibles.length > 0) {
    markdown += `## 🔴 PHOTOS INACCESSIBLES (${inaccessibles.length})\n\n`;
    markdown += `**⚠️ CRITIQUE :** Ces URLs ne répondent pas ou renvoient une erreur.\n\n`;

    markdown += `| # | Plat | Catégorie | HTTP Status | URL |\n`;
    markdown += `|---|------|-----------|-------------|-----|\n`;

    for (const plat of inaccessibles) {
      const statusText = plat.httpStatus === 0 ? 'Timeout' : plat.httpStatus;
      markdown += `| ${plat.index} | ${plat.nameFr} | ${plat.categoryName} | ${statusText} | \`${plat.imageUrl}\` |\n`;
    }

    markdown += `\n**Action requise :** Vérifier ces URLs et remplacer par de nouvelles photos si nécessaire.\n\n`;
    markdown += `---\n\n`;
  }

  // ───────────────────────────────────────────────────────────────────────
  // CHECKLIST DE VALIDATION
  // ───────────────────────────────────────────────────────────────────────

  markdown += `## ✅ CHECKLIST DE VALIDATION\n\n`;
  markdown += `**Instructions :**\n`;
  markdown += `1. Ouvrir l'application : \`http://localhost:4200/menu\`\n`;
  markdown += `2. Pour chaque plat ci-dessous, vérifier visuellement que la photo correspond\n`;
  markdown += `3. Cocher les cases au fur et à mesure\n`;
  markdown += `4. Noter les problèmes dans la colonne "Remarques"\n\n`;

  markdown += `| ✓ | # | Plat | Catégorie | Remarques |\n`;
  markdown += `|---|---|------|-----------|----------|\n`;

  for (const plat of platsInfo) {
    const checkmark = plat.urlAccessible ? '[ ]' : '[❌]';
    markdown += `| ${checkmark} | ${plat.index} | ${plat.nameFr} | ${plat.categoryName} | |\n`;
  }

  markdown += `\n---\n\n`;

  // ───────────────────────────────────────────────────────────────────────
  // INSTRUCTIONS DE VALIDATION
  // ───────────────────────────────────────────────────────────────────────

  markdown += `## 📖 INSTRUCTIONS DE VALIDATION VISUELLE\n\n`;
  markdown += `### Étape 1 : Lancer l'Application\n\n`;
  markdown += `\`\`\`powershell\n`;
  markdown += `# Terminal 1 : Backend\n`;
  markdown += `cd backend\n`;
  markdown += `npm run dev\n\n`;
  markdown += `# Terminal 2 : Frontend\n`;
  markdown += `cd frontend\n`;
  markdown += `npm start\n`;
  markdown += `\`\`\`\n\n`;
  markdown += `### Étape 2 : Ouvrir le Menu\n\n`;
  markdown += `Naviguer vers : \`http://localhost:4200/menu\`\n\n`;
  markdown += `### Étape 3 : Vérifier Chaque Plat\n\n`;
  markdown += `Pour chaque plat :\n`;
  markdown += `1. Lire le nom du plat\n`;
  markdown += `2. Regarder la photo affichée\n`;
  markdown += `3. Vérifier la correspondance :\n`;
  markdown += `   - ✅ **CORRECT** : La photo correspond au plat\n`;
  markdown += `   - ❌ **INCORRECT** : La photo ne correspond pas\n`;
  markdown += `   - ❓ **INCERTAIN** : Difficile à déterminer\n`;
  markdown += `4. Cocher la case dans la checklist\n`;
  markdown += `5. Noter les problèmes\n\n`;
  markdown += `### Étape 4 : Priorités de Vérification\n\n`;
  markdown += `1. **Photos dupliquées** (${duplicates.length} cas) - vérifier en priorité\n`;
  markdown += `2. **Photos inaccessibles** (${inaccessibles.length} cas) - remplacer obligatoirement\n`;
  markdown += `3. **Autres plats** - vérification systématique\n\n`;

  markdown += `---\n\n`;

  // ───────────────────────────────────────────────────────────────────────
  // SÉCURITÉ
  // ───────────────────────────────────────────────────────────────────────

  markdown += `## 🔐 CONFIRMATION DE SÉCURITÉ\n\n`;
  markdown += `**MODE LECTURE SEULE STRICTEMENT RESPECTÉ**\n\n`;
  markdown += `- ✅ MongoDB modifié : **NON**\n`;
  markdown += `- ✅ Cloudinary modifié : **NON**\n`;
  markdown += `- ✅ URLs modifiées : **NON**\n`;
  markdown += `- ✅ Images supprimées : **NON**\n`;
  markdown += `- ✅ Images uploadées : **NON**\n`;
  markdown += `- ✅ Migration exécutée : **NON**\n`;
  markdown += `- ✅ Données créées : **NON**\n`;
  markdown += `- ✅ Données supprimées : **NON**\n\n`;

  markdown += `---\n\n`;
  markdown += `*Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')}*\n`;

  // Sauvegarde Markdown
  const mdPath = path.join(reportDir, `validation-visuelle-98-photos-${timestamp}.md`);
  await fs.writeFile(mdPath, markdown, 'utf-8');

  // ───────────────────────────────────────────────────────────────────────
  // RAPPORT JSON
  // ───────────────────────────────────────────────────────────────────────

  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPlats: platsInfo.length,
      urlsAccessibles,
      urlsInaccessibles,
      photosUniques,
      photosDupliquees,
      platsNecessitantValidation: platsInfo.length,
    },
    plats: platsInfo,
    duplicates,
    inaccessibles,
  };

  const jsonPath = path.join(reportDir, `validation-visuelle-98-photos-${timestamp}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf-8');

  console.log(`✓ Rapport Markdown : ${path.relative(process.cwd(), mdPath)}`);
  console.log(`✓ Rapport JSON : ${path.relative(process.cwd(), jsonPath)}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // AFFICHAGE RÉSUMÉ
  // ═══════════════════════════════════════════════════════════════════════

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ RÉSUMÉ FINAL                                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`Nombre total de plats                        : ${platsInfo.length}`);
  console.log(`Nombre d'URLs accessibles                    : ${urlsAccessibles}`);
  console.log(`Nombre d'URLs inaccessibles                  : ${urlsInaccessibles}`);
  console.log(`Nombre de photos uniques                     : ${photosUniques}`);
  console.log(`Nombre de photos utilisées plusieurs fois    : ${photosDupliquees}`);
  console.log(`Nombre de plats nécessitant validation       : ${platsInfo.length}`);
  console.log();

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SÉCURITÉ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('MongoDB modifié               : NON ✓');
  console.log('Cloudinary modifié            : NON ✓');
  console.log('URLs modifiées                : NON ✓');
  console.log('Images supprimées             : NON ✓');
  console.log('Images uploadées              : NON ✓');
  console.log('Migration exécutée            : NON ✓');
  console.log('Données créées                : NON ✓');
  console.log('Données supprimées            : NON ✓');
  console.log('MODE LECTURE SEULE            : RESPECTÉ ✓\n');

  await mongoose.disconnect();
  console.log('✓ Déconnecté de MongoDB\n');
}

main().catch(console.error);
