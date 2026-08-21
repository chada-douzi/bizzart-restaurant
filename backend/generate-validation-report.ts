/**
 * GÉNÉRATION RAPPORT DE VALIDATION MANUELLE
 * 
 * Transforme les résultats de l'audit Vision en rapport structuré
 * pour validation humaine avant toute modification de production
 * 
 * MODE STRICTEMENT LECTURE SEULE
 */

import * as fs from 'fs';
import * as path from 'path';

const AUDIT_JSON_PATH = path.join(__dirname, 'AUDIT-VISUEL-AI-FINAL-2026-08-19.json');
const OUTPUT_DIR = path.join(__dirname, 'validation-reports');

interface ValidationEntry {
  photoId: string;
  url: string;
  usedByCount: number;
  usedByMenuItems: string[];
  visionAnalyzed: boolean;
  detectedDish: string;
  detectedType: string;
  origin: string;
  confidence: number;
  bestMatch: string;
  bestMatchScore: number;
  matchLevel: string;
  validationStatus: 'CONFIRMED' | 'STOCK' | 'MANUAL_REVIEW' | 'UNANALYZED';
  validationGroup: 'A_CONFIRMED' | 'B_STOCK' | 'C_MANUAL_REVIEW' | 'D_UNANALYZED';
  isDuplicate: boolean;
  duplicateCriticality?: string;
  notes: string;
}

function generateValidationReport() {
  console.log('📋 GÉNÉRATION RAPPORT DE VALIDATION MANUELLE\n');
  console.log('Mode : LECTURE SEULE - Aucune modification de production\n');

  // 1. Charger l'audit JSON
  console.log('📖 Chargement de l\'audit Vision...');
  const auditData = JSON.parse(fs.readFileSync(AUDIT_JSON_PATH, 'utf-8'));
  console.log(`✅ ${auditData.photos.length} photos chargées\n`);

  // 2. Créer le répertoire de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 3. Construire les entrées de validation
  console.log('🔍 Classification des photos...\n');
  const validationEntries: ValidationEntry[] = [];
  
  const duplicatesMap = new Map();
  auditData.duplicates?.forEach((dup: any) => {
    duplicatesMap.set(dup.photoId, dup.criticality);
  });

  for (const photo of auditData.photos) {
    const analysis = photo.visionAnalysis;
    const visionAnalyzed = analysis && analysis.confidence > 0;
    
    let validationStatus: ValidationEntry['validationStatus'] = 'UNANALYZED';
    let validationGroup: ValidationEntry['validationGroup'] = 'D_UNANALYZED';
    let notes = '';

    // Classification selon les règles strictes
    if (!visionAnalyzed) {
      validationStatus = 'UNANALYZED';
      validationGroup = 'D_UNANALYZED';
      notes = 'Vision IA non disponible (quota dépassé). Validation manuelle requise.';
    } else if (analysis.origin === 'VRAIE_PHOTO_BIZZART') {
      validationStatus = 'CONFIRMED';
      validationGroup = 'A_CONFIRMED';
      notes = `Photo authentique BIZZ'ART confirmée (confiance: ${(analysis.confidence * 100).toFixed(0)}%). Logo visible dans l'image.`;
    } else if (analysis.origin === 'STOCK_GENERIQUE') {
      validationStatus = 'STOCK';
      validationGroup = 'B_STOCK';
      notes = `Photo stock/générique détectée (confiance: ${(analysis.confidence * 100).toFixed(0)}%). À supprimer du mapping ou remplacer par photo réelle.`;
    } else {
      // INCERTAINE ou PROBABLEMENT_BIZZART
      validationStatus = 'MANUAL_REVIEW';
      validationGroup = 'C_MANUAL_REVIEW';
      notes = `Origine incertaine (confiance: ${(analysis.confidence * 100).toFixed(0)}%). Plat détecté: "${analysis.detectedDish}". Validation manuelle nécessaire.`;
    }

    // Meilleur match
    const bestMatch = photo.matches && photo.matches.length > 0 ? photo.matches[0] : null;

    validationEntries.push({
      photoId: photo.photoId,
      url: photo.url,
      usedByCount: photo.usedBy?.length || 0,
      usedByMenuItems: photo.usedBy || [],
      visionAnalyzed,
      detectedDish: analysis?.detectedDish || 'Non analysé',
      detectedType: analysis?.detectedType || 'N/A',
      origin: analysis?.origin || 'N/A',
      confidence: analysis?.confidence || 0,
      bestMatch: bestMatch?.menuItemName || 'Aucun',
      bestMatchScore: bestMatch?.score || 0,
      matchLevel: bestMatch?.level || 'N/A',
      validationStatus,
      validationGroup,
      isDuplicate: duplicatesMap.has(photo.photoId),
      duplicateCriticality: duplicatesMap.get(photo.photoId),
      notes
    });
  }

  // 4. Trier par groupe puis photoId
  validationEntries.sort((a, b) => {
    if (a.validationGroup !== b.validationGroup) {
      return a.validationGroup.localeCompare(b.validationGroup);
    }
    return a.photoId.localeCompare(b.photoId);
  });

  // 5. Statistiques
  const stats = {
    total: validationEntries.length,
    confirmed: validationEntries.filter(e => e.validationGroup === 'A_CONFIRMED').length,
    stock: validationEntries.filter(e => e.validationGroup === 'B_STOCK').length,
    manualReview: validationEntries.filter(e => e.validationGroup === 'C_MANUAL_REVIEW').length,
    unanalyzed: validationEntries.filter(e => e.validationGroup === 'D_UNANALYZED').length,
    duplicatesHigh: validationEntries.filter(e => e.duplicateCriticality === 'HIGH').length,
    duplicatesMedium: validationEntries.filter(e => e.duplicateCriticality === 'MEDIUM').length,
  };

  console.log('📊 Statistiques de classification:\n');
  console.log(`   Groupe A (Confirmées BIZZ'ART): ${stats.confirmed}`);
  console.log(`   Groupe B (Stock/À supprimer): ${stats.stock}`);
  console.log(`   Groupe C (Révision manuelle): ${stats.manualReview}`);
  console.log(`   Groupe D (Non analysées): ${stats.unanalyzed}`);
  console.log(`   Doublons HIGH: ${stats.duplicatesHigh}`);
  console.log(`   Doublons MEDIUM: ${stats.duplicatesMedium}\n`);

  // 6. Générer CSV
  console.log('💾 Génération des rapports...\n');
  generateCSV(validationEntries, stats);
  generateMarkdown(validationEntries, stats);
  generateHTML(validationEntries, stats);

  console.log('✅ Rapports de validation générés avec succès\n');
  console.log('📂 Emplacement:', OUTPUT_DIR);
  console.log('\n⚠️  AUCUNE MODIFICATION DE PRODUCTION EFFECTUÉE');
  console.log('⚠️  VALIDATION MANUELLE REQUISE AVANT TOUTE MIGRATION\n');
}

function generateCSV(entries: ValidationEntry[], stats: any) {
  const timestamp = new Date().toISOString().split('T')[0];
  const csvPath = path.join(OUTPUT_DIR, `VALIDATION-PHOTOS-BIZZART-${timestamp}.csv`);
  
  const headers = [
    'PhotoID',
    'URL',
    'UsedByCount',
    'VisionAnalyzed',
    'DetectedDish',
    'DetectedType',
    'Origin',
    'Confidence',
    'BestMatch',
    'MatchScore',
    'MatchLevel',
    'ValidationStatus',
    'ValidationGroup',
    'IsDuplicate',
    'DuplicateCriticality',
    'Notes'
  ];

  const rows = entries.map(e => [
    e.photoId,
    e.url,
    e.usedByCount,
    e.visionAnalyzed ? 'Yes' : 'No',
    `"${e.detectedDish}"`,
    e.detectedType,
    e.origin,
    (e.confidence * 100).toFixed(0) + '%',
    `"${e.bestMatch}"`,
    e.bestMatchScore.toFixed(2),
    e.matchLevel,
    e.validationStatus,
    e.validationGroup,
    e.isDuplicate ? 'Yes' : 'No',
    e.duplicateCriticality || 'N/A',
    `"${e.notes}"`
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(csvPath, csv);
  console.log(`   ✅ ${path.basename(csvPath)}`);
}

function generateMarkdown(entries: ValidationEntry[], stats: any) {
  const timestamp = new Date().toISOString().split('T')[0];
  const mdPath = path.join(OUTPUT_DIR, `VALIDATION-PHOTOS-BIZZART-${timestamp}.md`);
  
  let md = `# 📋 Rapport de Validation Photos BIZZ'ART\n\n`;
  md += `**Date:** ${timestamp}\n`;
  md += `**Restaurant:** BIZZ'ART Monastir\n`;
  md += `**Total Photos:** ${stats.total}\n\n`;
  
  md += `## 📊 Résumé de Classification\n\n`;
  md += `| Groupe | Nombre | Description |\n`;
  md += `|--------|--------|-------------|\n`;
  md += `| **A - Confirmées BIZZ'ART** | ${stats.confirmed} | Photos authentiques avec logo visible |\n`;
  md += `| **B - Stock/Générique** | ${stats.stock} | À supprimer ou remplacer |\n`;
  md += `| **C - Révision Manuelle** | ${stats.manualReview} | Origine incertaine, validation requise |\n`;
  md += `| **D - Non Analysées** | ${stats.unanalyzed} | Quota dépassé, analyse manuelle |\n`;
  md += `| **Doublons HIGH** | ${stats.duplicatesHigh} | Priorité critique |\n`;
  md += `| **Doublons MEDIUM** | ${stats.duplicatesMedium} | Priorité moyenne |\n\n`;
  
  md += `## ⚠️ RÈGLES IMPORTANTES\n\n`;
  md += `- **NE PAS** considérer un score LOW comme une validation automatique\n`;
  md += `- **NE PAS** associer automatiquement une photo stock à un plat\n`;
  md += `- **NE PAS** modifier MongoDB/Cloudinary sans validation manuelle\n`;
  md += `- **VALIDER** manuellement toutes les photos du groupe C\n`;
  md += `- **ANALYSER** manuellement toutes les photos du groupe D\n\n`;
  
  // Groupe A
  const groupA = entries.filter(e => e.validationGroup === 'A_CONFIRMED');
  if (groupA.length > 0) {
    md += `## ✅ Groupe A - Photos Confirmées BIZZ'ART (${groupA.length})\n\n`;
    for (const entry of groupA) {
      md += `### ${entry.photoId}\n`;
      md += `- **URL:** ${entry.url}\n`;
      md += `- **Utilisée par:** ${entry.usedByCount} plat(s)\n`;
      md += `- **Plat détecté:** ${entry.detectedDish}\n`;
      md += `- **Confiance:** ${(entry.confidence * 100).toFixed(0)}%\n`;
      md += `- **Meilleur match:** ${entry.bestMatch} (score: ${entry.bestMatchScore.toFixed(2)})\n`;
      if (entry.isDuplicate) md += `- **⚠️ Doublon:** ${entry.duplicateCriticality}\n`;
      md += `- **Notes:** ${entry.notes}\n\n`;
    }
  }
  
  // Groupe B
  const groupB = entries.filter(e => e.validationGroup === 'B_STOCK');
  if (groupB.length > 0) {
    md += `## 🚫 Groupe B - Photos Stock/Génériques (${groupB.length})\n\n`;
    md += `**Action recommandée:** Supprimer ces associations ou remplacer par de vraies photos BIZZ'ART\n\n`;
    for (const entry of groupB) {
      md += `### ${entry.photoId}\n`;
      md += `- **URL:** ${entry.url}\n`;
      md += `- **Utilisée par:** ${entry.usedByCount} plat(s)\n`;
      md += `- **Plat détecté:** ${entry.detectedDish}\n`;
      md += `- **Confiance:** ${(entry.confidence * 100).toFixed(0)}%\n`;
      if (entry.isDuplicate) md += `- **⚠️ Doublon:** ${entry.duplicateCriticality}\n`;
      md += `- **Notes:** ${entry.notes}\n\n`;
    }
  }
  
  // Groupe C
  const groupC = entries.filter(e => e.validationGroup === 'C_MANUAL_REVIEW');
  if (groupC.length > 0) {
    md += `## ❓ Groupe C - Révision Manuelle Requise (${groupC.length})\n\n`;
    md += `**Action requise:** Valider manuellement chaque photo\n\n`;
    for (const entry of groupC) {
      md += `### ${entry.photoId}\n`;
      md += `- **URL:** ${entry.url}\n`;
      md += `- **Utilisée par:** ${entry.usedByCount} plat(s)\n`;
      md += `- **Plat détecté:** ${entry.detectedDish}\n`;
      md += `- **Type:** ${entry.detectedType}\n`;
      md += `- **Origine détectée:** ${entry.origin}\n`;
      md += `- **Confiance:** ${(entry.confidence * 100).toFixed(0)}%\n`;
      md += `- **Meilleur match:** ${entry.bestMatch} (score: ${entry.bestMatchScore.toFixed(2)}, niveau: ${entry.matchLevel})\n`;
      if (entry.isDuplicate) md += `- **⚠️ Doublon:** ${entry.duplicateCriticality}\n`;
      md += `- **Notes:** ${entry.notes}\n\n`;
    }
  }
  
  // Groupe D
  const groupD = entries.filter(e => e.validationGroup === 'D_UNANALYZED');
  if (groupD.length > 0) {
    md += `## ⏸️ Groupe D - Non Analysées (${groupD.length})\n\n`;
    md += `**Action requise:** Analyse manuelle complète nécessaire\n\n`;
    for (const entry of groupD) {
      md += `### ${entry.photoId}\n`;
      md += `- **URL:** ${entry.url}\n`;
      md += `- **Utilisée par:** ${entry.usedByCount} plat(s)\n`;
      if (entry.isDuplicate) md += `- **⚠️ Doublon:** ${entry.duplicateCriticality}\n`;
      md += `- **Notes:** ${entry.notes}\n\n`;
    }
  }
  
  md += `---\n\n`;
  md += `**Généré le:** ${new Date().toISOString()}\n`;
  md += `**Mode:** Lecture seule stricte - Aucune modification de production\n`;
  
  fs.writeFileSync(mdPath, md);
  console.log(`   ✅ ${path.basename(mdPath)}`);
}

function generateHTML(entries: ValidationEntry[], stats: any) {
  const timestamp = new Date().toISOString().split('T')[0];
  const htmlPath = path.join(OUTPUT_DIR, `VALIDATION-PHOTOS-BIZZART-${timestamp}.html`);
  
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validation Photos BIZZ'ART</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; color: #333; margin-bottom: 10px; }
    .header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; }
    .stat-card h3 { font-size: 12px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
    .stat-card p { font-size: 24px; font-weight: bold; }
    .stat-card.confirmed p { color: #4CAF50; }
    .stat-card.stock p { color: #f44336; }
    .stat-card.review p { color: #FF9800; }
    .stat-card.unanalyzed p { color: #9E9E9E; }
    .tabs { display: flex; gap: 10px; margin: 20px 0; border-bottom: 1px solid #ddd; }
    .tab { padding: 10px 20px; cursor: pointer; background: none; border: none; font-size: 16px; color: #666; border-bottom: 3px solid transparent; }
    .tab.active { color: #2196F3; border-bottom-color: #2196F3; font-weight: 600; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .photo-card { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ddd; }
    .photo-card.confirmed { border-left-color: #4CAF50; }
    .photo-card.stock { border-left-color: #f44336; }
    .photo-card.review { border-left-color: #FF9800; }
    .photo-card.unanalyzed { border-left-color: #9E9E9E; }
    .photo-card h3 { margin-bottom: 10px; }
    .photo-card img { max-width: 300px; height: auto; border-radius: 4px; margin: 10px 0; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin: 5px 5px 5px 0; }
    .badge-confirmed { background: #E8F5E9; color: #4CAF50; }
    .badge-stock { background: #FFEBEE; color: #f44336; }
    .badge-review { background: #FFF3E0; color: #F57C00; }
    .badge-unanalyzed { background: #F5F5F5; color: #666; }
    .badge-high { background: #FFEBEE; color: #f44336; }
    .badge-medium { background: #FFF3E0; color: #F57C00; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 10px 0; }
    .info-item { font-size: 14px; }
    .info-item strong { color: #555; }
    .alert { padding: 15px; border-radius: 6px; margin: 20px 0; }
    .alert-warning { background: #FFF3E0; color: #E65100; border-left: 4px solid #FF9800; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Validation Photos BIZZ'ART</h1>
      <p style="color: #666; margin-top: 10px;">Restaurant BIZZ'ART Monastir - ${timestamp}</p>
      
      <div class="stats-grid">
        <div class="stat-card confirmed">
          <h3>Groupe A - Confirmées</h3>
          <p>${stats.confirmed}</p>
        </div>
        <div class="stat-card stock">
          <h3>Groupe B - Stock</h3>
          <p>${stats.stock}</p>
        </div>
        <div class="stat-card review">
          <h3>Groupe C - Révision</h3>
          <p>${stats.manualReview}</p>
        </div>
        <div class="stat-card unanalyzed">
          <h3>Groupe D - Non analysées</h3>
          <p>${stats.unanalyzed}</p>
        </div>
      </div>
      
      <div class="alert alert-warning">
        <strong>⚠️ VALIDATION MANUELLE REQUISE</strong><br>
        Ne pas modifier MongoDB/Cloudinary avant validation complète. Scores LOW ne constituent pas une validation automatique.
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="showTab('confirmed')">✅ Confirmées (${stats.confirmed})</button>
      <button class="tab" onclick="showTab('stock')">🚫 Stock (${stats.stock})</button>
      <button class="tab" onclick="showTab('review')">❓ Révision (${stats.manualReview})</button>
      <button class="tab" onclick="showTab('unanalyzed')">⏸️ Non analysées (${stats.unanalyzed})</button>
    </div>

    <div id="confirmed-tab" class="tab-content active">
      ${entries.filter(e => e.validationGroup === 'A_CONFIRMED').map(e => `
        <div class="photo-card confirmed">
          <h3>${e.photoId}</h3>
          <img src="${e.url}" alt="${e.photoId}" onerror="this.style.display='none'">
          <div class="info-grid">
            <div class="info-item"><strong>Utilisée par:</strong> ${e.usedByCount} plat(s)</div>
            <div class="info-item"><strong>Confiance:</strong> ${(e.confidence * 100).toFixed(0)}%</div>
            <div class="info-item"><strong>Plat détecté:</strong> ${e.detectedDish}</div>
            <div class="info-item"><strong>Meilleur match:</strong> ${e.bestMatch}</div>
          </div>
          ${e.isDuplicate ? `<span class="badge badge-${e.duplicateCriticality?.toLowerCase()}">Doublon ${e.duplicateCriticality}</span>` : ''}
          <p style="margin-top: 10px; color: #666;">${e.notes}</p>
        </div>
      `).join('')}
    </div>

    <div id="stock-tab" class="tab-content">
      ${entries.filter(e => e.validationGroup === 'B_STOCK').map(e => `
        <div class="photo-card stock">
          <h3>${e.photoId}</h3>
          <img src="${e.url}" alt="${e.photoId}" onerror="this.style.display='none'">
          <div class="info-grid">
            <div class="info-item"><strong>Utilisée par:</strong> ${e.usedByCount} plat(s)</div>
            <div class="info-item"><strong>Confiance:</strong> ${(e.confidence * 100).toFixed(0)}%</div>
            <div class="info-item"><strong>Plat détecté:</strong> ${e.detectedDish}</div>
            <div class="info-item"><strong>Action:</strong> Supprimer ou remplacer</div>
          </div>
          ${e.isDuplicate ? `<span class="badge badge-${e.duplicateCriticality?.toLowerCase()}">Doublon ${e.duplicateCriticality}</span>` : ''}
          <p style="margin-top: 10px; color: #666;">${e.notes}</p>
        </div>
      `).join('')}
    </div>

    <div id="review-tab" class="tab-content">
      ${entries.filter(e => e.validationGroup === 'C_MANUAL_REVIEW').map(e => `
        <div class="photo-card review">
          <h3>${e.photoId}</h3>
          <img src="${e.url}" alt="${e.photoId}" onerror="this.style.display='none'">
          <div class="info-grid">
            <div class="info-item"><strong>Utilisée par:</strong> ${e.usedByCount} plat(s)</div>
            <div class="info-item"><strong>Confiance:</strong> ${(e.confidence * 100).toFixed(0)}%</div>
            <div class="info-item"><strong>Plat détecté:</strong> ${e.detectedDish}</div>
            <div class="info-item"><strong>Type:</strong> ${e.detectedType}</div>
            <div class="info-item"><strong>Origine:</strong> ${e.origin}</div>
            <div class="info-item"><strong>Meilleur match:</strong> ${e.bestMatch} (${e.matchLevel})</div>
          </div>
          ${e.isDuplicate ? `<span class="badge badge-${e.duplicateCriticality?.toLowerCase()}">Doublon ${e.duplicateCriticality}</span>` : ''}
          <p style="margin-top: 10px; color: #666;">${e.notes}</p>
        </div>
      `).join('')}
    </div>

    <div id="unanalyzed-tab" class="tab-content">
      ${entries.filter(e => e.validationGroup === 'D_UNANALYZED').map(e => `
        <div class="photo-card unanalyzed">
          <h3>${e.photoId}</h3>
          <img src="${e.url}" alt="${e.photoId}" onerror="this.style.display='none'">
          <div class="info-grid">
            <div class="info-item"><strong>Utilisée par:</strong> ${e.usedByCount} plat(s)</div>
            <div class="info-item"><strong>Status:</strong> Non analysée (quota)</div>
          </div>
          ${e.isDuplicate ? `<span class="badge badge-${e.duplicateCriticality?.toLowerCase()}">Doublon ${e.duplicateCriticality}</span>` : ''}
          <p style="margin-top: 10px; color: #666;">${e.notes}</p>
        </div>
      `).join('')}
    </div>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; text-align: center;">
      Généré le ${new Date().toISOString()} - Mode lecture seule stricte
    </p>
  </div>

  <script>
    function showTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    }
  </script>
</body>
</html>`;
  
  fs.writeFileSync(htmlPath, html);
  console.log(`   ✅ ${path.basename(htmlPath)}`);
}

generateValidationReport();
