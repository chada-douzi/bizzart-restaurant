/**
 * PHASES 4-8 : ANALYSE COMPLÈTE DES MÉDIAS ET MAPPING
 * 
 * MODE LECTURE SEULE - AUCUNE MODIFICATION DE DONNÉES
 * 
 * Phase 4: Analyse des 56 médias existants
 * Phase 5: Analyse des plats/menu
 * Phase 6: Mapping plats → images (non destructif)
 * Phase 7: Détection des problèmes
 * Phase 8: Rapport final de validation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { Media } from '../models/media.model';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

dotenv.config();

interface MediaAnalysis {
  index: number;
  id: string;
  title: string | null;
  category: string;
  url: string;
  publicId: string | null;
  extension: string;
  dimensions: { width: number | null; height: number | null };
  isVisible: boolean;
  displayOrder: number;
  origin: 'cloudinary' | 'local';
  localFilePath: string | null;
  fileExists: boolean;
}

interface MenuItemAnalysis {
  id: string;
  name: string;
  nameFr: string;
  category: string;
  categoryName: string;
  currentImage: string | null;
  imageOrigin: 'cloudinary' | 'local' | 'none';
  imagePublicId: string | null;
}

interface MappingProposal {
  menuItemId: string;
  menuItemName: string;
  menuItemNameFr: string;
  category: string;
  currentImage: string | null;
  proposedMediaId: string | null;
  proposedMediaTitle: string | null;
  proposedMediaUrl: string | null;
  proposedMediaPublicId: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH';
  reason: string;
  matchScore: number;
}

interface Anomaly {
  type: 'duplicate' | 'multiple_usage' | 'no_match' | 'missing_file' | 'invalid_url' | 'dimension_issue' | 'ambiguous_name';
  severity: 'critical' | 'warning' | 'info';
  entity: string;
  description: string;
  affectedItems: string[];
}

interface FinalReport {
  timestamp: string;
  summary: {
    totalMedia: number;
    cloudinaryMedia: number;
    localMedia: number;
    totalMenuItems: number;
    totalCategories: number;
    mappingsHighConfidence: number;
    mappingsMediumConfidence: number;
    mappingsLowConfidence: number;
    mappingsNoMatch: number;
    totalAnomalies: number;
    unusedMedia: number;
    itemsWithoutImage: number;
  };
  mediaInventory: MediaAnalysis[];
  menuItemsInventory: MenuItemAnalysis[];
  mappingProposals: MappingProposal[];
  anomalies: Anomaly[];
  unusedMedia: MediaAnalysis[];
  itemsWithoutImage: MenuItemAnalysis[];
  recommendations: string[];
}

// Utilitaires de matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateMatchScore(menuItemName: string, mediaTitle: string, category: string, mediaCategory: string): number {
  const normMenuItem = normalizeString(menuItemName);
  const normMediaTitle = normalizeString(mediaTitle);
  const normCategory = normalizeString(category);
  const normMediaCategory = normalizeString(mediaCategory);

  let score = 0;

  // Exact match du nom (50 points)
  if (normMenuItem === normMediaTitle) {
    score += 50;
  } else {
    // Partial match (mots communs)
    const menuWords = normMenuItem.split(' ').filter(w => w.length > 2);
    const mediaWords = normMediaTitle.split(' ').filter(w => w.length > 2);
    const commonWords = menuWords.filter(w => mediaWords.includes(w));
    score += (commonWords.length / Math.max(menuWords.length, mediaWords.length)) * 30;
  }

  // Match de catégorie (30 points)
  if (normCategory === normMediaCategory) {
    score += 30;
  } else {
    // Catégories similaires
    if (normCategory.includes(normMediaCategory) || normMediaCategory.includes(normCategory)) {
      score += 15;
    }
  }

  // Bonus si le titre contient des mots-clés du plat (20 points)
  const menuKeywords = normMenuItem.split(' ');
  const containsKeywords = menuKeywords.some(keyword => 
    keyword.length > 3 && normMediaTitle.includes(keyword)
  );
  if (containsKeywords) {
    score += 20;
  }

  return Math.min(100, score);
}

function determineConfidence(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH' {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'NO_MATCH';
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASES 4-8 : ANALYSE COMPLÈTE DES MÉDIAS ET MAPPING          ║');
  console.log('║  MODE LECTURE SEULE - AUCUNE MODIFICATION                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Connexion MongoDB
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('✓ Connecté à MongoDB\n');

  const report: FinalReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalMedia: 0,
      cloudinaryMedia: 0,
      localMedia: 0,
      totalMenuItems: 0,
      totalCategories: 0,
      mappingsHighConfidence: 0,
      mappingsMediumConfidence: 0,
      mappingsLowConfidence: 0,
      mappingsNoMatch: 0,
      totalAnomalies: 0,
      unusedMedia: 0,
      itemsWithoutImage: 0,
    },
    mediaInventory: [],
    menuItemsInventory: [],
    mappingProposals: [],
    anomalies: [],
    unusedMedia: [],
    itemsWithoutImage: [],
    recommendations: [],
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 4 : ANALYSE DES 56 MÉDIAS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📊 PHASE 4 : ANALYSE DES MÉDIAS\n');

  const allMedia = await Media.find({}).sort({ displayOrder: 1 });
  console.log(`✓ ${allMedia.length} médias récupérés\n`);

  const cloudinaryDir = path.join(__dirname, '../../menu-images/cloudinary-existing');

  for (let i = 0; i < allMedia.length; i++) {
    const media = allMedia[i];
    const isCloudinary = media.url.startsWith('http');
    let localFilePath: string | null = null;
    let fileExists = false;

    if (isCloudinary && media.publicId) {
      // Chercher le fichier local correspondant
      const filename = media.publicId.split('/').pop() || '';
      localFilePath = path.join(cloudinaryDir, filename + '.jpg'); // On suppose .jpg par défaut
      try {
        await fs.access(localFilePath);
        fileExists = true;
      } catch {
        // Essayer avec d'autres extensions
        for (const ext of ['.png', '.webp', '.jpeg']) {
          const altPath = path.join(cloudinaryDir, filename + ext);
          try {
            await fs.access(altPath);
            localFilePath = altPath;
            fileExists = true;
            break;
          } catch {
            // Continue
          }
        }
      }
    } else {
      // Média local
      localFilePath = path.join(__dirname, '../../frontend/public', media.url);
      try {
        await fs.access(localFilePath);
        fileExists = true;
      } catch {
        fileExists = false;
      }
    }

    const analysis: MediaAnalysis = {
      index: i + 1,
      id: media._id.toString(),
      title: media.title || null,
      category: media.category,
      url: media.url,
      publicId: media.publicId || null,
      extension: path.extname(media.url).toLowerCase(),
      dimensions: {
        width: media.width || null,
        height: media.height || null,
      },
      isVisible: media.isVisible,
      displayOrder: media.order,
      origin: isCloudinary ? 'cloudinary' : 'local',
      localFilePath,
      fileExists,
    };

    report.mediaInventory.push(analysis);

    if (isCloudinary) {
      report.summary.cloudinaryMedia++;
    } else {
      report.summary.localMedia++;
    }
  }

  report.summary.totalMedia = allMedia.length;

  console.log(`  • Total médias : ${report.summary.totalMedia}`);
  console.log(`  • Cloudinary : ${report.summary.cloudinaryMedia}`);
  console.log(`  • Local : ${report.summary.localMedia}`);
  console.log(`  • Fichiers locaux disponibles : ${report.mediaInventory.filter(m => m.fileExists).length}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 5 : ANALYSE DES PLATS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🍽️  PHASE 5 : ANALYSE DES PLATS\n');

  const categories = await MenuCategory.find({}).sort({ displayOrder: 1 });
  const menuItems = await MenuItem.find({}).populate('category').sort({ displayOrder: 1 });

  console.log(`✓ ${categories.length} catégories récupérées`);
  console.log(`✓ ${menuItems.length} plats récupérés\n`);

  report.summary.totalCategories = categories.length;
  report.summary.totalMenuItems = menuItems.length;

  for (const item of menuItems) {
    const categoryName = (item.category as any)?.name?.fr || (item.category as any)?.name?.en || 'Unknown';
    const isCloudinary = item.image ? item.image.startsWith('http') : false;
    const imageOrigin: 'cloudinary' | 'local' | 'none' = item.image 
      ? (isCloudinary ? 'cloudinary' : 'local')
      : 'none';

    // Extraire publicId si Cloudinary
    let imagePublicId: string | null = null;
    if (isCloudinary && item.image) {
      const match = item.image.match(/\/([^/]+)\.[^.]+$/);
      if (match) {
        imagePublicId = match[1];
      }
    }

    const analysis: MenuItemAnalysis = {
      id: item._id.toString(),
      name: item.name.en || '',
      nameFr: item.name.fr || '',
      category: (item.category as any)?._id?.toString() || '',
      categoryName,
      currentImage: item.image || null,
      imageOrigin,
      imagePublicId,
    };

    report.menuItemsInventory.push(analysis);

    if (!item.image) {
      report.summary.itemsWithoutImage++;
      report.itemsWithoutImage.push(analysis);
    }
  }

  console.log(`  • Total plats : ${report.summary.totalMenuItems}`);
  console.log(`  • Plats avec image : ${report.summary.totalMenuItems - report.summary.itemsWithoutImage}`);
  console.log(`  • Plats sans image : ${report.summary.itemsWithoutImage}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 6 : MAPPING NON DESTRUCTIF
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔗 PHASE 6 : MAPPING PLATS → IMAGES\n');

  const usedMediaIds = new Set<string>();

  for (const menuItem of report.menuItemsInventory) {
    let bestMatch: MappingProposal | null = null;
    let bestScore = 0;

    // Chercher parmi tous les médias
    for (const media of report.mediaInventory) {
      const score = calculateMatchScore(
        menuItem.name + ' ' + menuItem.nameFr,
        media.title || '',
        menuItem.categoryName,
        media.category
      );

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          menuItemNameFr: menuItem.nameFr,
          category: menuItem.categoryName,
          currentImage: menuItem.currentImage,
          proposedMediaId: media.id,
          proposedMediaTitle: media.title,
          proposedMediaUrl: media.url,
          proposedMediaPublicId: media.publicId,
          confidence: determineConfidence(score),
          reason: score >= 70 
            ? 'Correspondance forte nom/catégorie'
            : score >= 40
            ? 'Correspondance partielle'
            : score >= 20
            ? 'Correspondance faible'
            : 'Aucune correspondance évidente',
          matchScore: score,
        };
      }
    }

    if (bestMatch) {
      report.mappingProposals.push(bestMatch);
      if (bestMatch.proposedMediaId) {
        usedMediaIds.add(bestMatch.proposedMediaId);
      }

      // Compter par niveau de confiance
      switch (bestMatch.confidence) {
        case 'HIGH':
          report.summary.mappingsHighConfidence++;
          break;
        case 'MEDIUM':
          report.summary.mappingsMediumConfidence++;
          break;
        case 'LOW':
          report.summary.mappingsLowConfidence++;
          break;
        case 'NO_MATCH':
          report.summary.mappingsNoMatch++;
          break;
      }
    }
  }

  console.log(`  • HIGH CONFIDENCE : ${report.summary.mappingsHighConfidence}`);
  console.log(`  • MEDIUM CONFIDENCE : ${report.summary.mappingsMediumConfidence}`);
  console.log(`  • LOW CONFIDENCE : ${report.summary.mappingsLowConfidence}`);
  console.log(`  • NO MATCH : ${report.summary.mappingsNoMatch}\n`);

  // Médias non utilisés
  report.unusedMedia = report.mediaInventory.filter(m => !usedMediaIds.has(m.id));
  report.summary.unusedMedia = report.unusedMedia.length;

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 7 : DÉTECTION DES PROBLÈMES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔍 PHASE 7 : DÉTECTION DES ANOMALIES\n');

  // 1. Doublons de titres
  const titleMap = new Map<string, string[]>();
  for (const media of report.mediaInventory) {
    if (!media.title) continue; // Ignorer les médias sans titre
    const normTitle = normalizeString(media.title);
    if (!titleMap.has(normTitle)) {
      titleMap.set(normTitle, []);
    }
    titleMap.get(normTitle)!.push(media.id);
  }

  for (const [title, ids] of titleMap.entries()) {
    if (ids.length > 1) {
      report.anomalies.push({
        type: 'duplicate',
        severity: 'warning',
        entity: 'media',
        description: `Titre en double : "${title}"`,
        affectedItems: ids,
      });
    }
  }

  // 2. Images utilisées par plusieurs plats
  const imageUsageMap = new Map<string, string[]>();
  for (const proposal of report.mappingProposals) {
    if (proposal.proposedMediaId) {
      if (!imageUsageMap.has(proposal.proposedMediaId)) {
        imageUsageMap.set(proposal.proposedMediaId, []);
      }
      imageUsageMap.get(proposal.proposedMediaId)!.push(proposal.menuItemId);
    }
  }

  for (const [mediaId, itemIds] of imageUsageMap.entries()) {
    if (itemIds.length > 1) {
      const media = report.mediaInventory.find(m => m.id === mediaId);
      report.anomalies.push({
        type: 'multiple_usage',
        severity: 'warning',
        entity: 'media',
        description: `Image "${media?.title}" proposée pour ${itemIds.length} plats`,
        affectedItems: itemIds,
      });
    }
  }

  // 3. Fichiers manquants
  for (const media of report.mediaInventory) {
    if (media.origin === 'local' && !media.fileExists) {
      report.anomalies.push({
        type: 'missing_file',
        severity: 'critical',
        entity: 'media',
        description: `Fichier local introuvable : ${media.url}`,
        affectedItems: [media.id],
      });
    }
  }

  // 4. URLs Cloudinary invalides
  for (const media of report.mediaInventory) {
    if (media.origin === 'cloudinary' && !media.publicId) {
      report.anomalies.push({
        type: 'invalid_url',
        severity: 'warning',
        entity: 'media',
        description: `URL Cloudinary sans publicId : ${media.url}`,
        affectedItems: [media.id],
      });
    }
  }

  // 5. Problèmes de dimensions
  for (const media of report.mediaInventory) {
    if (!media.dimensions.width || !media.dimensions.height) {
      report.anomalies.push({
        type: 'dimension_issue',
        severity: 'info',
        entity: 'media',
        description: `Dimensions manquantes pour : ${media.title}`,
        affectedItems: [media.id],
      });
    }
  }

  report.summary.totalAnomalies = report.anomalies.length;

  console.log(`  • Total anomalies : ${report.summary.totalAnomalies}`);
  console.log(`    - Critiques : ${report.anomalies.filter(a => a.severity === 'critical').length}`);
  console.log(`    - Warnings : ${report.anomalies.filter(a => a.severity === 'warning').length}`);
  console.log(`    - Info : ${report.anomalies.filter(a => a.severity === 'info').length}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 8 : RECOMMANDATIONS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('💡 PHASE 8 : RECOMMANDATIONS\n');

  if (report.summary.mappingsHighConfidence > 0) {
    report.recommendations.push(
      `✓ ${report.summary.mappingsHighConfidence} mappings HIGH CONFIDENCE peuvent être appliqués automatiquement après validation`
    );
  }

  if (report.summary.mappingsMediumConfidence > 0) {
    report.recommendations.push(
      `⚠ ${report.summary.mappingsMediumConfidence} mappings MEDIUM CONFIDENCE nécessitent une révision manuelle`
    );
  }

  if (report.summary.mappingsLowConfidence > 0) {
    report.recommendations.push(
      `⚠ ${report.summary.mappingsLowConfidence} mappings LOW CONFIDENCE nécessitent une vérification approfondie`
    );
  }

  if (report.summary.mappingsNoMatch > 0) {
    report.recommendations.push(
      `❌ ${report.summary.mappingsNoMatch} plats n'ont aucune correspondance évidente`
    );
  }

  if (report.summary.unusedMedia > 0) {
    report.recommendations.push(
      `📦 ${report.summary.unusedMedia} médias ne sont associés à aucun plat`
    );
  }

  if (report.summary.itemsWithoutImage > 0) {
    report.recommendations.push(
      `🖼️ ${report.summary.itemsWithoutImage} plats n'ont actuellement aucune image`
    );
  }

  if (report.summary.localMedia > 0) {
    report.recommendations.push(
      `⬆️ ${report.summary.localMedia} médias locaux peuvent être migrés vers Cloudinary`
    );
  }

  const criticalAnomalies = report.anomalies.filter(a => a.severity === 'critical').length;
  if (criticalAnomalies > 0) {
    report.recommendations.push(
      `🚨 ${criticalAnomalies} anomalies critiques doivent être corrigées avant migration`
    );
  }

  report.recommendations.forEach(rec => console.log(`  ${rec}`));
  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDE DES RAPPORTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('💾 SAUVEGARDE DES RAPPORTS\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(__dirname, '../../audit-reports');
  
  try {
    await fs.mkdir(reportDir, { recursive: true });
  } catch (err) {
    // Dossier existe déjà
  }

  // Rapport JSON complet
  const jsonPath = path.join(reportDir, `complete-audit-${timestamp}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✓ Rapport JSON : ${path.relative(process.cwd(), jsonPath)}`);

  // Plan de migration (NON EXÉCUTABLE)
  const migrationPlan = {
    generated: report.timestamp,
    warning: '⚠️ CE FICHIER EST UN PLAN DE MIGRATION - NE PAS EXÉCUTER AUTOMATIQUEMENT',
    requiresManualValidation: true,
    summary: report.summary,
    highConfidenceMappings: report.mappingProposals.filter(m => m.confidence === 'HIGH'),
    mediumConfidenceMappings: report.mappingProposals.filter(m => m.confidence === 'MEDIUM'),
    lowConfidenceMappings: report.mappingProposals.filter(m => m.confidence === 'LOW'),
    noMatchItems: report.mappingProposals.filter(m => m.confidence === 'NO_MATCH'),
    unusedMedia: report.unusedMedia,
    anomalies: report.anomalies,
  };

  const migrationPath = path.join(reportDir, `migration-plan-${timestamp}.json`);
  await fs.writeFile(migrationPath, JSON.stringify(migrationPlan, null, 2), 'utf-8');
  console.log(`✓ Plan de migration : ${path.relative(process.cwd(), migrationPath)}`);

  // Rapport HTML lisible
  const htmlReport = generateHTMLReport(report);
  const htmlPath = path.join(reportDir, `audit-report-${timestamp}.html`);
  await fs.writeFile(htmlPath, htmlReport, 'utf-8');
  console.log(`✓ Rapport HTML : ${path.relative(process.cwd(), htmlPath)}`);

  // Rapport texte résumé
  const textReport = generateTextReport(report);
  const textPath = path.join(reportDir, `audit-summary-${timestamp}.txt`);
  await fs.writeFile(textPath, textReport, 'utf-8');
  console.log(`✓ Résumé texte : ${path.relative(process.cwd(), textPath)}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // RÉSUMÉ FINAL
  // ═══════════════════════════════════════════════════════════════════════
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RÉSUMÉ FINAL                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 MÉDIAS ANALYSÉS :`);
  console.log(`   • Total : ${report.summary.totalMedia}`);
  console.log(`   • Cloudinary : ${report.summary.cloudinaryMedia}`);
  console.log(`   • Local : ${report.summary.localMedia}`);
  console.log();
  
  console.log(`🍽️  PLATS ANALYSÉS :`);
  console.log(`   • Total : ${report.summary.totalMenuItems}`);
  console.log(`   • Catégories : ${report.summary.totalCategories}`);
  console.log();
  
  console.log(`🔗 MAPPINGS PROPOSÉS :`);
  console.log(`   • HIGH CONFIDENCE : ${report.summary.mappingsHighConfidence}`);
  console.log(`   • MEDIUM CONFIDENCE : ${report.summary.mappingsMediumConfidence}`);
  console.log(`   • LOW CONFIDENCE : ${report.summary.mappingsLowConfidence}`);
  console.log(`   • NO MATCH : ${report.summary.mappingsNoMatch}`);
  console.log();
  
  console.log(`⚠️  ANOMALIES DÉTECTÉES :`);
  console.log(`   • Total : ${report.summary.totalAnomalies}`);
  console.log(`   • Critiques : ${report.anomalies.filter(a => a.severity === 'critical').length}`);
  console.log(`   • Warnings : ${report.anomalies.filter(a => a.severity === 'warning').length}`);
  console.log();
  
  console.log(`📦 MÉDIAS INUTILISÉS : ${report.summary.unusedMedia}`);
  console.log(`🖼️  PLATS SANS IMAGE : ${report.summary.itemsWithoutImage}`);
  console.log();
  
  console.log('✅ CONFIRMATION DE SÉCURITÉ :');
  console.log('   • Aucune donnée MongoDB modifiée ✓');
  console.log('   • Aucun média Cloudinary supprimé ✓');
  console.log('   • Aucune URL remplacée automatiquement ✓');
  console.log('   • Mode lecture seule respecté ✓');
  console.log();
  
  console.log('⏸️  EN ATTENTE DE VALIDATION MANUELLE');
  console.log('   Consultez les rapports générés avant toute migration.\n');

  await mongoose.disconnect();
  console.log('✓ Déconnecté de MongoDB\n');
}

function generateHTMLReport(report: FinalReport): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Audit Complet - ${report.timestamp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #f5f5f5; 
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #3498db; padding-left: 10px; }
    h3 { color: #7f8c8d; margin-top: 20px; margin-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .summary-card.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .summary-card.orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .summary-card.blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .summary-card h3 { color: white; font-size: 0.9em; margin-bottom: 5px; }
    .summary-card .value { font-size: 2em; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.9em; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
    th { background: #3498db; color: white; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; }
    .badge.high { background: #2ecc71; color: white; }
    .badge.medium { background: #f39c12; color: white; }
    .badge.low { background: #e74c3c; color: white; }
    .badge.no-match { background: #95a5a6; color: white; }
    .badge.cloudinary { background: #3498db; color: white; }
    .badge.local { background: #9b59b6; color: white; }
    .badge.critical { background: #c0392b; color: white; }
    .badge.warning { background: #e67e22; color: white; }
    .badge.info { background: #3498db; color: white; }
    .anomaly { padding: 10px; margin: 5px 0; border-left: 4px solid #e74c3c; background: #ffeaea; border-radius: 4px; }
    .recommendation { padding: 10px; margin: 5px 0; border-left: 4px solid #3498db; background: #e8f4f8; border-radius: 4px; }
    .timestamp { color: #7f8c8d; font-size: 0.9em; }
    img { max-width: 100px; max-height: 100px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Rapport d'Audit Complet - Médias & Plats</h1>
    <p class="timestamp">Généré le : ${new Date(report.timestamp).toLocaleString('fr-FR')}</p>

    <h2>📈 Résumé Global</h2>
    <div class="summary">
      <div class="summary-card blue">
        <h3>Total Médias</h3>
        <div class="value">${report.summary.totalMedia}</div>
        <small>${report.summary.cloudinaryMedia} Cloudinary + ${report.summary.localMedia} Local</small>
      </div>
      <div class="summary-card green">
        <h3>Total Plats</h3>
        <div class="value">${report.summary.totalMenuItems}</div>
        <small>${report.summary.totalCategories} catégories</small>
      </div>
      <div class="summary-card orange">
        <h3>Mappings HIGH</h3>
        <div class="value">${report.summary.mappingsHighConfidence}</div>
        <small>Haute confiance</small>
      </div>
      <div class="summary-card">
        <h3>Anomalies</h3>
        <div class="value">${report.summary.totalAnomalies}</div>
        <small>À résoudre</small>
      </div>
    </div>

    <h2>🔗 Mappings Proposés (HIGH CONFIDENCE)</h2>
    <table>
      <thead>
        <tr>
          <th>Plat</th>
          <th>Catégorie</th>
          <th>Image Proposée</th>
          <th>Score</th>
          <th>Raison</th>
        </tr>
      </thead>
      <tbody>
        ${report.mappingProposals
          .filter(m => m.confidence === 'HIGH')
          .map(m => `
            <tr>
              <td><strong>${m.menuItemName}</strong><br><small>${m.menuItemNameFr}</small></td>
              <td>${m.category}</td>
              <td>${m.proposedMediaTitle || 'N/A'}</td>
              <td><span class="badge high">${m.matchScore}</span></td>
              <td>${m.reason}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>

    <h2>⚠️ Mappings MEDIUM CONFIDENCE</h2>
    <table>
      <thead>
        <tr>
          <th>Plat</th>
          <th>Catégorie</th>
          <th>Image Proposée</th>
          <th>Score</th>
          <th>Raison</th>
        </tr>
      </thead>
      <tbody>
        ${report.mappingProposals
          .filter(m => m.confidence === 'MEDIUM')
          .map(m => `
            <tr>
              <td><strong>${m.menuItemName}</strong><br><small>${m.menuItemNameFr}</small></td>
              <td>${m.category}</td>
              <td>${m.proposedMediaTitle || 'N/A'}</td>
              <td><span class="badge medium">${m.matchScore}</span></td>
              <td>${m.reason}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>

    <h2>🚨 Anomalies Détectées</h2>
    ${report.anomalies.map(a => `
      <div class="anomaly">
        <span class="badge ${a.severity}">${a.severity.toUpperCase()}</span>
        <strong>${a.type}</strong>: ${a.description}
        <br><small>Éléments affectés : ${a.affectedItems.length}</small>
      </div>
    `).join('')}

    <h2>📦 Médias Inutilisés (${report.summary.unusedMedia})</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Titre</th>
          <th>Catégorie</th>
          <th>Origine</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        ${report.unusedMedia.map(m => `
          <tr>
            <td>${m.index}</td>
            <td>${m.title}</td>
            <td>${m.category}</td>
            <td><span class="badge ${m.origin}">${m.origin}</span></td>
            <td><small>${m.url}</small></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>🖼️ Plats Sans Image (${report.summary.itemsWithoutImage})</h2>
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Nom FR</th>
          <th>Catégorie</th>
        </tr>
      </thead>
      <tbody>
        ${report.itemsWithoutImage.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.nameFr}</td>
            <td>${item.categoryName}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>💡 Recommandations</h2>
    ${report.recommendations.map(rec => `
      <div class="recommendation">${rec}</div>
    `).join('')}

    <h2>✅ Confirmation de Sécurité</h2>
    <div class="recommendation">
      <strong>✓ Aucune donnée MongoDB modifiée</strong><br>
      <strong>✓ Aucun média Cloudinary supprimé</strong><br>
      <strong>✓ Aucune URL remplacée automatiquement</strong><br>
      <strong>✓ Mode lecture seule respecté</strong>
    </div>
  </div>
</body>
</html>`;
}

function generateTextReport(report: FinalReport): string {
  return `
╔════════════════════════════════════════════════════════════════╗
║  RAPPORT D'AUDIT COMPLET - MÉDIAS & PLATS                      ║
╚════════════════════════════════════════════════════════════════╝

Généré le : ${new Date(report.timestamp).toLocaleString('fr-FR')}

═══════════════════════════════════════════════════════════════════
RÉSUMÉ GLOBAL
═══════════════════════════════════════════════════════════════════

Médias :
  • Total : ${report.summary.totalMedia}
  • Cloudinary : ${report.summary.cloudinaryMedia}
  • Local : ${report.summary.localMedia}

Plats :
  • Total : ${report.summary.totalMenuItems}
  • Catégories : ${report.summary.totalCategories}
  • Sans image : ${report.summary.itemsWithoutImage}

Mappings :
  • HIGH CONFIDENCE : ${report.summary.mappingsHighConfidence}
  • MEDIUM CONFIDENCE : ${report.summary.mappingsMediumConfidence}
  • LOW CONFIDENCE : ${report.summary.mappingsLowConfidence}
  • NO MATCH : ${report.summary.mappingsNoMatch}

Anomalies :
  • Total : ${report.summary.totalAnomalies}
  • Critiques : ${report.anomalies.filter(a => a.severity === 'critical').length}
  • Warnings : ${report.anomalies.filter(a => a.severity === 'warning').length}
  • Info : ${report.anomalies.filter(a => a.severity === 'info').length}

Autres :
  • Médias inutilisés : ${report.summary.unusedMedia}

═══════════════════════════════════════════════════════════════════
RECOMMANDATIONS
═══════════════════════════════════════════════════════════════════

${report.recommendations.map(rec => `  ${rec}`).join('\n')}

═══════════════════════════════════════════════════════════════════
CONFIRMATION DE SÉCURITÉ
═══════════════════════════════════════════════════════════════════

✓ Aucune donnée MongoDB modifiée
✓ Aucun média Cloudinary supprimé
✓ Aucune URL remplacée automatiquement
✓ Mode lecture seule respecté

⏸️  EN ATTENTE DE VALIDATION MANUELLE

Consultez les rapports détaillés avant toute migration.
`;
}

main().catch(console.error);
