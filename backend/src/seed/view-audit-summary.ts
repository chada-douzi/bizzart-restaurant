/**
 * UTILITAIRE : AFFICHAGE RAPIDE DES RÉSULTATS D'AUDIT
 * Lit le dernier rapport JSON et affiche un résumé interactif
 */

import fs from 'fs/promises';
import path from 'path';

interface AuditReport {
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
  mappingProposals: any[];
  anomalies: any[];
  unusedMedia: any[];
  mediaInventory: any[];
  menuItemsInventory: any[];
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  VISUALISATION RAPIDE - RÉSULTATS D\'AUDIT                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const reportsDir = path.join(__dirname, '../../audit-reports');
  
  // Trouver le dernier rapport
  const files = await fs.readdir(reportsDir);
  const reportFiles = files.filter(f => f.startsWith('complete-audit-') && f.endsWith('.json'));
  
  if (reportFiles.length === 0) {
    console.log('❌ Aucun rapport trouvé. Exécutez d\'abord complete-audit-analysis.ts\n');
    return;
  }

  const latestReport = reportFiles.sort().reverse()[0];
  console.log(`📂 Rapport utilisé : ${latestReport}\n`);

  const reportPath = path.join(reportsDir, latestReport);
  const reportData = JSON.parse(await fs.readFile(reportPath, 'utf-8')) as AuditReport;

  // Affichage du résumé
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('STATISTIQUES GLOBALES');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('📊 MÉDIAS :');
  console.log(`   Total       : ${reportData.summary.totalMedia}`);
  console.log(`   Cloudinary  : ${reportData.summary.cloudinaryMedia}`);
  console.log(`   Local       : ${reportData.summary.localMedia}`);
  console.log(`   Inutilisés  : ${reportData.summary.unusedMedia}`);
  console.log();

  console.log('🍽️  PLATS :');
  console.log(`   Total       : ${reportData.summary.totalMenuItems}`);
  console.log(`   Catégories  : ${reportData.summary.totalCategories}`);
  console.log(`   Sans image  : ${reportData.summary.itemsWithoutImage}`);
  console.log();

  console.log('🔗 MAPPINGS :');
  console.log(`   HIGH        : ${reportData.summary.mappingsHighConfidence} ✓`);
  console.log(`   MEDIUM      : ${reportData.summary.mappingsMediumConfidence} ⚠️`);
  console.log(`   LOW         : ${reportData.summary.mappingsLowConfidence} ⚠️`);
  console.log(`   NO MATCH    : ${reportData.summary.mappingsNoMatch} ❌`);
  console.log();

  console.log('⚠️  ANOMALIES :');
  const critical = reportData.anomalies.filter(a => a.severity === 'critical').length;
  const warning = reportData.anomalies.filter(a => a.severity === 'warning').length;
  const info = reportData.anomalies.filter(a => a.severity === 'info').length;
  console.log(`   Critiques   : ${critical} 🚨`);
  console.log(`   Warnings    : ${warning} ⚠️`);
  console.log(`   Info        : ${info} ℹ️`);
  console.log(`   Total       : ${reportData.summary.totalAnomalies}`);
  console.log();

  // TOP 10 Mappings MEDIUM
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('TOP 10 MAPPINGS MEDIUM CONFIDENCE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const mediumMappings = reportData.mappingProposals
    .filter(m => m.confidence === 'MEDIUM')
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  if (mediumMappings.length === 0) {
    console.log('  Aucun mapping MEDIUM trouvé.\n');
  } else {
    mediumMappings.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.menuItemName} (${m.category})`);
      console.log(`     → ${m.proposedMediaTitle || 'N/A'}`);
      console.log(`     Score: ${m.matchScore} | ${m.reason}`);
      console.log();
    });
  }

  // Anomalies Critiques
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('ANOMALIES CRITIQUES (Fichiers Manquants)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const criticalAnomalies = reportData.anomalies
    .filter(a => a.severity === 'critical' && a.type === 'missing_file')
    .slice(0, 10);

  if (criticalAnomalies.length === 0) {
    console.log('  ✓ Aucune anomalie critique.\n');
  } else {
    criticalAnomalies.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.description}`);
    });
    if (critical > 10) {
      console.log(`  ... et ${critical - 10} autres\n`);
    } else {
      console.log();
    }
  }

  // Médias Inutilisés (échantillon)
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('MÉDIAS INUTILISÉS (Échantillon)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const unusedSample = reportData.unusedMedia.slice(0, 10);
  
  if (unusedSample.length === 0) {
    console.log('  ✓ Tous les médias sont utilisés.\n');
  } else {
    unusedSample.forEach((m, i) => {
      const origin = m.origin === 'cloudinary' ? '☁️' : '💾';
      console.log(`  ${i + 1}. [${origin}] ${m.title || 'Sans titre'} (${m.category})`);
    });
    if (reportData.summary.unusedMedia > 10) {
      console.log(`  ... et ${reportData.summary.unusedMedia - 10} autres\n`);
    } else {
      console.log();
    }
  }

  // Répartition des médias par catégorie
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('RÉPARTITION DES MÉDIAS PAR CATÉGORIE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const categoryCount: Record<string, number> = {};
  reportData.mediaInventory.forEach(m => {
    categoryCount[m.category] = (categoryCount[m.category] || 0) + 1;
  });

  Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`  ${cat.padEnd(15)} : ${bar} ${count}`);
    });
  console.log();

  // Répartition des plats par catégorie
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('RÉPARTITION DES PLATS PAR CATÉGORIE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const platCategoryCount: Record<string, number> = {};
  reportData.menuItemsInventory.forEach(m => {
    platCategoryCount[m.categoryName] = (platCategoryCount[m.categoryName] || 0) + 1;
  });

  Object.entries(platCategoryCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const bar = '█'.repeat(Math.ceil(count / 3));
      console.log(`  ${cat.padEnd(20)} : ${bar} ${count}`);
    });
  console.log();

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('RECOMMANDATIONS PRIORITAIRES');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (critical > 0) {
    console.log(`  🚨 Résoudre ${critical} fichiers locaux manquants`);
  }

  if (reportData.summary.mappingsMediumConfidence > 0) {
    console.log(`  ⚠️  Réviser ${reportData.summary.mappingsMediumConfidence} mappings MEDIUM`);
  }

  if (reportData.summary.unusedMedia > 0) {
    console.log(`  📦 Décider du sort de ${reportData.summary.unusedMedia} médias inutilisés`);
  }

  if (reportData.summary.localMedia > 0) {
    console.log(`  ⬆️  Envisager la migration de ${reportData.summary.localMedia} médias locaux vers Cloudinary`);
  }

  console.log();
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('FICHIERS DISPONIBLES POUR ANALYSE DÉTAILLÉE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log(`  • audit-reports/${latestReport}`);
  console.log(`  • audit-reports/audit-report-[timestamp].html (ouvrir dans navigateur)`);
  console.log(`  • audit-reports/migration-plan-[timestamp].json`);
  console.log(`  • audit-reports/RAPPORT-FINAL-VALIDATION.md`);
  console.log();

  console.log('✅ Visualisation terminée.\n');
}

main().catch(console.error);
