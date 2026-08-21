/**
 * AUDIT ET CORRECTION DU MAPPING DES PHOTOS DES 98 PLATS
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Analyse la qualité de la correspondance entre chaque plat et sa photo actuelle.
 * Identifie les photos incorrectes, génériques, de menu/flyer.
 * Propose des corrections candidates mais NE LES EXÉCUTE PAS.
 * 
 * AUCUNE MODIFICATION DE DONNÉES
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import { Media } from '../models/media.model';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type PhotoStatus =
  | '✅ CORRECT'
  | '⚠️ POSSIBLE'
  | '❌ INCORRECT'
  | '❌ GÉNÉRIQUE'
  | '❌ PHOTO DE MENU'
  | '❌ PHOTO DE GALERIE'
  | '❌ INADAPTÉE'
  | '❓ À VÉRIFIER';

type PhotoCategory =
  | 'PHOTOS DE PLATS'
  | 'PHOTOS DE GALERIE'
  | 'PHOTOS DU RESTAURANT'
  | 'PHOTOS DE MENU/FLYER'
  | 'PHOTOS NON IDENTIFIABLES'
  | 'PHOTOS INADAPTÉES';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'GOOD';

interface MenuItemAudit {
  index: number;
  id: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  category: string;
  categoryName: string;
  slug: string;
  order: number;
  currentImage: string;
  currentImageShort: string;
  status: PhotoStatus;
  priority: Priority;
  explanation: string;
  candidatePhoto1: string | null;
  candidatePhoto2: string | null;
  candidatePhoto3: string | null;
  confidence: number;
  requiresManualValidation: boolean;
}

interface MediaAudit {
  id: string;
  title: string | null;
  category: string;
  url: string;
  publicId: string | null;
  origin: 'cloudinary' | 'local';
  photoCategory: PhotoCategory;
  usedByPlats: string[];
  suitableForMenuItem: boolean;
  reason: string;
}

interface DuplicatePhotoAssignment {
  photoUrl: string;
  count: number;
  plats: string[];
  acceptable: boolean;
  reason: string;
}

interface CorrectionPlan {
  menuItemId: string;
  menuItemName: string;
  currentImage: string;
  proposedImage: string | null;
  confidence: number;
  reason: string;
  requiresManualValidation: boolean;
}

interface QualityAuditReport {
  timestamp: string;
  summary: {
    totalPlats: number;
    correct: number;
    possible: number;
    incorrect: number;
    generic: number;
    photoMenu: number;
    photoGalerie: number;
    aVerifier: number;
    sansPhotoFiable: number;
  };
  menuItems: MenuItemAudit[];
  mediaInventory: MediaAudit[];
  duplicateAssignments: DuplicatePhotoAssignment[];
  criticalIssues: MenuItemAudit[];
  reliableMatches: MenuItemAudit[];
  correctionPlan: CorrectionPlan[];
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITAIRES D'ANALYSE
// ═══════════════════════════════════════════════════════════════════════

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text: string): string[] {
  const normalized = normalizeString(text);
  const words = normalized.split(' ').filter(w => w.length > 2);
  
  // Mots-clés culinaires importants
  const culinaryKeywords = [
    'pizza', 'pates', 'paella', 'risotto', 'lasagne', 'gratin',
    'poulet', 'viande', 'poisson', 'crevette', 'fruits de mer',
    'salade', 'thon', 'fromage', 'champignon', 'tomate',
    'grille', 'frit', 'roti', 'marine', 'sauce',
    'tacos', 'burger', 'sandwich', 'wrap'
  ];
  
  return words.filter(w => culinaryKeywords.includes(w) || w.length > 4);
}

function calculateMatchScore(platName: string, photoTitle: string | null, categoryMatch: boolean): number {
  if (!photoTitle) return 0;
  
  const platKeywords = extractKeywords(platName);
  const photoKeywords = extractKeywords(photoTitle);
  
  if (platKeywords.length === 0) return categoryMatch ? 30 : 10;
  
  // Correspondance exacte des mots-clés
  const commonKeywords = platKeywords.filter(k => photoKeywords.includes(k));
  const keywordMatchRatio = commonKeywords.length / platKeywords.length;
  
  let score = keywordMatchRatio * 60;
  
  // Bonus catégorie
  if (categoryMatch) {
    score += 20;
  }
  
  // Bonus correspondance exacte
  if (normalizeString(platName) === normalizeString(photoTitle)) {
    score += 20;
  }
  
  return Math.min(100, score);
}

function classifyPhotoFromUrl(url: string, title: string | null): PhotoCategory {
  const urlLower = url.toLowerCase();
  const titleLower = (title || '').toLowerCase();
  
  // Détection photo de menu/flyer UNIQUEMENT basée sur des mots-clés explicites dans le titre
  // Ne pas se baser sur le chemin /menu/ qui est le dossier Cloudinary légitime
  if (
    titleLower.includes('menu complet') ||
    titleLower.includes('flyer') ||
    titleLower.includes('affiche') ||
    titleLower.includes('carte restaurant') ||
    urlLower.includes('flyer') ||
    urlLower.includes('affiche')
  ) {
    return 'PHOTOS DE MENU/FLYER';
  }
  
  // Détection photo de galerie UNIQUEMENT pour les médias de la collection Media
  if (urlLower.includes('/gallery/') && !urlLower.includes('/menu/')) {
    return 'PHOTOS DE GALERIE';
  }
  
  // Détection restaurant
  if (
    titleLower.includes('restaurant') ||
    titleLower.includes('salle') ||
    titleLower.includes('ambiance') ||
    titleLower.includes('decoration')
  ) {
    return 'PHOTOS DU RESTAURANT';
  }
  
  // Par défaut, les photos dans /menu/ sont des PHOTOS DE PLATS
  if (urlLower.includes('/menu/') || urlLower.includes('bizzart/menu')) {
    return 'PHOTOS DE PLATS';
  }
  
  return 'PHOTOS NON IDENTIFIABLES';
}

function analyzePhotoSuitability(
  platName: string,
  photoUrl: string,
  photoTitle: string | null,
  photoCategory: PhotoCategory
): { status: PhotoStatus; priority: Priority; explanation: string; confidence: number } {
  
  const platKeywords = extractKeywords(platName);
  const photoKeywords = photoTitle ? extractKeywords(photoTitle) : [];
  
  // Photos inadaptées par nature
  if (photoCategory === 'PHOTOS DE MENU/FLYER') {
    return {
      status: '❌ PHOTO DE MENU',
      priority: 'CRITICAL',
      explanation: 'Image de menu/flyer, inadaptée pour une carte de plat',
      confidence: 0,
    };
  }
  
  if (photoCategory === 'PHOTOS DU RESTAURANT') {
    return {
      status: '❌ INADAPTÉE',
      priority: 'CRITICAL',
      explanation: 'Photo d\'ambiance/restaurant, pas une photo de plat',
      confidence: 0,
    };
  }
  
  if (photoCategory === 'PHOTOS DE GALERIE') {
    return {
      status: '❌ PHOTO DE GALERIE',
      priority: 'HIGH',
      explanation: 'Photo de galerie générique, inadaptée pour un plat spécifique',
      confidence: 0,
    };
  }
  
  // Analyse de correspondance
  if (platKeywords.length === 0) {
    return {
      status: '❓ À VÉRIFIER',
      priority: 'MEDIUM',
      explanation: 'Impossible d\'extraire des mots-clés du nom du plat',
      confidence: 50,
    };
  }
  
  const commonKeywords = platKeywords.filter(k => photoKeywords.includes(k));
  
  if (commonKeywords.length === 0) {
    return {
      status: '❌ INCORRECT',
      priority: 'CRITICAL',
      explanation: `Aucun mot-clé commun entre "${platName}" et "${photoTitle || 'sans titre'}"`,
      confidence: 0,
    };
  }
  
  const matchRatio = commonKeywords.length / platKeywords.length;
  
  if (matchRatio >= 0.8) {
    return {
      status: '✅ CORRECT',
      priority: 'GOOD',
      explanation: `Correspondance forte : ${commonKeywords.join(', ')}`,
      confidence: 90,
    };
  }
  
  if (matchRatio >= 0.5) {
    return {
      status: '⚠️ POSSIBLE',
      priority: 'MEDIUM',
      explanation: `Correspondance partielle : ${commonKeywords.join(', ')}`,
      confidence: 60,
    };
  }
  
  return {
    status: '❌ INCORRECT',
    priority: 'HIGH',
    explanation: `Correspondance faible : seulement ${commonKeywords.join(', ')}`,
    confidence: 30,
  };
}

function findBestCandidates(
  platName: string,
  currentImage: string,
  allMedia: MediaAudit[],
  categoryId: string
): { candidate1: string | null; candidate2: string | null; candidate3: string | null } {
  
  const candidates = allMedia
    .filter(m => m.suitableForMenuItem && m.url !== currentImage)
    .map(m => ({
      url: m.url,
      score: calculateMatchScore(platName, m.title, true), // Simplifié
      title: m.title,
    }))
    .sort((a, b) => b.score - a.score);
  
  return {
    candidate1: candidates[0]?.score >= 40 ? candidates[0].url : null,
    candidate2: candidates[1]?.score >= 40 ? candidates[1].url : null,
    candidate3: candidates[2]?.score >= 40 ? candidates[2].url : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║ AUDIT QUALITÉ MAPPING PHOTOS DES 98 PLATS                     ║');
  console.log('║ MODE STRICTEMENT LECTURE SEULE                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('✓ Connecté à MongoDB\n');

  const report: QualityAuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPlats: 0,
      correct: 0,
      possible: 0,
      incorrect: 0,
      generic: 0,
      photoMenu: 0,
      photoGalerie: 0,
      aVerifier: 0,
      sansPhotoFiable: 0,
    },
    menuItems: [],
    mediaInventory: [],
    duplicateAssignments: [],
    criticalIssues: [],
    reliableMatches: [],
    correctionPlan: [],
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 1 : INVENTAIRE COMPLET
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📊 PHASE 1 : INVENTAIRE COMPLET\n');

  const categories = await MenuCategory.find({}).sort({ order: 1 });
  const menuItems = await MenuItem.find({}).populate('category').sort({ order: 1 });
  const mediaItems = await Media.find({});

  console.log(`✓ ${categories.length} catégories`);
  console.log(`✓ ${menuItems.length} plats`);
  console.log(`✓ ${mediaItems.length} médias\n`);

  report.summary.totalPlats = menuItems.length;

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2 : CLASSIFICATION DES MÉDIAS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎨 PHASE 2 : CLASSIFICATION DES IMAGES\n');

  const photoUsageMap = new Map<string, string[]>();

  for (const item of menuItems) {
    if (item.image) {
      if (!photoUsageMap.has(item.image)) {
        photoUsageMap.set(item.image, []);
      }
      photoUsageMap.get(item.image)!.push(item.name.fr || item.name.en || '');
    }
  }

  for (const media of mediaItems) {
    const photoCategory = classifyPhotoFromUrl(media.url, media.title || null);
    const suitableForMenuItem = photoCategory === 'PHOTOS DE PLATS';
    
    const audit: MediaAudit = {
      id: media._id.toString(),
      title: media.title || null,
      category: media.category,
      url: media.url,
      publicId: media.publicId || null,
      origin: media.url.startsWith('http') ? 'cloudinary' : 'local',
      photoCategory,
      usedByPlats: photoUsageMap.get(media.url) || [],
      suitableForMenuItem,
      reason: suitableForMenuItem
        ? 'Photo de plat individuel'
        : `Catégorie: ${photoCategory}`,
    };

    report.mediaInventory.push(audit);
  }

  const photosPlats = report.mediaInventory.filter(m => m.photoCategory === 'PHOTOS DE PLATS').length;
  const photosGalerie = report.mediaInventory.filter(m => m.photoCategory === 'PHOTOS DE GALERIE').length;
  const photosMenu = report.mediaInventory.filter(m => m.photoCategory === 'PHOTOS DE MENU/FLYER').length;
  const photosRestaurant = report.mediaInventory.filter(m => m.photoCategory === 'PHOTOS DU RESTAURANT').length;

  console.log(`  • Photos de plats         : ${photosPlats}`);
  console.log(`  • Photos de galerie       : ${photosGalerie}`);
  console.log(`  • Photos de menu/flyer    : ${photosMenu}`);
  console.log(`  • Photos du restaurant    : ${photosRestaurant}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 3-6 : ANALYSE DES 98 CORRESPONDANCES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔍 PHASES 3-6 : ANALYSE DES CORRESPONDANCES\n');

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const categoryName = (item.category as any)?.name?.fr || 'Unknown';
    const categoryId = (item.category as any)?._id?.toString() || '';

    const currentImageShort = item.image
      ? item.image.split('/').pop()?.substring(0, 50) || item.image.substring(0, 50)
      : 'N/A';

    // Trouver le média correspondant
    const currentMedia = report.mediaInventory.find(m => m.url === item.image);
    const photoCategory = currentMedia?.photoCategory || classifyPhotoFromUrl(item.image, null);

    // Analyser la qualité
    const analysis = analyzePhotoSuitability(
      item.name.fr || item.name.en || '',
      item.image,
      currentMedia?.title || null,
      photoCategory
    );

    // Chercher des candidats
    const candidates = findBestCandidates(
      item.name.fr || item.name.en || '',
      item.image,
      report.mediaInventory,
      categoryId
    );

    const audit: MenuItemAudit = {
      index: i + 1,
      id: item._id.toString(),
      nameFr: item.name.fr || '',
      nameEn: item.name.en || '',
      nameAr: item.name.ar || '',
      category: categoryId,
      categoryName,
      slug: item.slug,
      order: item.order,
      currentImage: item.image,
      currentImageShort,
      status: analysis.status,
      priority: analysis.priority,
      explanation: analysis.explanation,
      candidatePhoto1: candidates.candidate1,
      candidatePhoto2: candidates.candidate2,
      candidatePhoto3: candidates.candidate3,
      confidence: analysis.confidence,
      requiresManualValidation: analysis.confidence < 90,
    };

    report.menuItems.push(audit);

    // Compteurs
    switch (audit.status) {
      case '✅ CORRECT':
        report.summary.correct++;
        break;
      case '⚠️ POSSIBLE':
        report.summary.possible++;
        break;
      case '❌ INCORRECT':
        report.summary.incorrect++;
        break;
      case '❌ GÉNÉRIQUE':
        report.summary.generic++;
        break;
      case '❌ PHOTO DE MENU':
        report.summary.photoMenu++;
        break;
      case '❌ PHOTO DE GALERIE':
        report.summary.photoGalerie++;
        break;
      case '❓ À VÉRIFIER':
        report.summary.aVerifier++;
        break;
    }

    if (audit.priority === 'CRITICAL' || audit.priority === 'HIGH') {
      report.criticalIssues.push(audit);
    }

    if (audit.status === '✅ CORRECT' || (audit.status === '⚠️ POSSIBLE' && audit.confidence >= 70)) {
      report.reliableMatches.push(audit);
    }

    // Plan de correction
    if (audit.status !== '✅ CORRECT' && audit.candidatePhoto1) {
      report.correctionPlan.push({
        menuItemId: audit.id,
        menuItemName: audit.nameFr,
        currentImage: audit.currentImage,
        proposedImage: audit.candidatePhoto1,
        confidence: audit.confidence,
        reason: audit.explanation,
        requiresManualValidation: true,
      });
    }

    if ((i + 1) % 20 === 0) {
      console.log(`   Analysé ${i + 1}/${menuItems.length} plats...`);
    }
  }

  console.log(`\n✓ Analyse terminée\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 7 : DÉTECTION DES PHOTOS DUPLIQUÉES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔄 PHASE 7 : DÉTECTION DES PHOTOS DUPLIQUÉES\n');

  for (const [photoUrl, plats] of photoUsageMap.entries()) {
    if (plats.length > 1) {
      const acceptable = plats.every(p => p.includes('Fruits de Mer')) || plats.every(p => p.includes('Pizza'));
      
      report.duplicateAssignments.push({
        photoUrl,
        count: plats.length,
        plats,
        acceptable,
        reason: acceptable
          ? 'Plats similaires, acceptable'
          : 'Plats différents, photo dupliquée inadéquate',
      });
    }
  }

  console.log(`  • ${report.duplicateAssignments.length} photos utilisées par plusieurs plats\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDE DES RAPPORTS
  // ═══════════════════════════════════════════════════════════════════════

  const reportDir = path.join(__dirname, '../../audit-reports');
  await fs.mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // JSON
  const jsonPath = path.join(reportDir, `menu-photo-quality-audit-${timestamp}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  // MD
  const mdContent = generateMarkdownReport(report);
  const mdPath = path.join(reportDir, `menu-photo-quality-audit-${timestamp}.md`);
  await fs.writeFile(mdPath, mdContent, 'utf-8');

  // Plan de correction
  const correctionPath = path.join(reportDir, `menu-photo-correction-plan-${timestamp}.json`);
  await fs.writeFile(correctionPath, JSON.stringify(report.correctionPlan, null, 2), 'utf-8');

  console.log('💾 RAPPORTS SAUVEGARDÉS\n');
  console.log(`   • ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`   • ${path.relative(process.cwd(), mdPath)}`);
  console.log(`   • ${path.relative(process.cwd(), correctionPath)}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // RAPPORT FINAL
  // ═══════════════════════════════════════════════════════════════════════

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ RAPPORT FINAL                                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('TOTAL PLATS               : ' + report.summary.totalPlats);
  console.log('CORRECT                   : ' + report.summary.correct);
  console.log('POSSIBLE                  : ' + report.summary.possible);
  console.log('INCORRECT                 : ' + report.summary.incorrect);
  console.log('GÉNÉRIQUE                 : ' + report.summary.generic);
  console.log('PHOTO MENU                : ' + report.summary.photoMenu);
  console.log('PHOTO GALERIE             : ' + report.summary.photoGalerie);
  console.log('À VÉRIFIER                : ' + report.summary.aVerifier);
  console.log('SANS PHOTO FIABLE         : ' + report.summary.sansPhotoFiable);
  console.log();

  console.log('TOP 20 DES PROBLÈMES CRITIQUES');
  console.log('--------------------------------\n');
  report.criticalIssues.slice(0, 20).forEach((item, i) => {
    console.log(`${i + 1}. ${item.nameFr} (${item.categoryName})`);
    console.log(`   Statut: ${item.status}`);
    console.log(`   ${item.explanation}\n`);
  });

  console.log('TOP 20 DES CORRESPONDANCES FIABLES');
  console.log('-----------------------------------\n');
  report.reliableMatches.slice(0, 20).forEach((item, i) => {
    console.log(`${i + 1}. ${item.nameFr} (${item.categoryName})`);
    console.log(`   Statut: ${item.status} (${item.confidence}%)\n`);
  });

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SÉCURITÉ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('MongoDB modified          : NO ✓');
  console.log('Cloudinary modified       : NO ✓');
  console.log('URLs modified             : NO ✓');
  console.log('Images deleted            : NO ✓');
  console.log('Images uploaded           : NO ✓');
  console.log('Migration executed        : NO ✓');
  console.log('Data created              : NO ✓');
  console.log('Data deleted              : NO ✓');
  console.log('MODE                      : STRICT READ ONLY ✓\n');

  await mongoose.disconnect();
  console.log('✓ Déconnecté de MongoDB\n');
}

function generateMarkdownReport(report: QualityAuditReport): string {
  let md = `# 📸 AUDIT QUALITÉ MAPPING PHOTOS DES 98 PLATS\n\n`;
  md += `**Généré le :** ${new Date(report.timestamp).toLocaleString('fr-FR')}\n\n`;
  md += `## 📊 RÉSUMÉ\n\n`;
  md += `| Statut | Nombre |\n`;
  md += `|--------|--------|\n`;
  md += `| Total plats | ${report.summary.totalPlats} |\n`;
  md += `| ✅ CORRECT | ${report.summary.correct} |\n`;
  md += `| ⚠️ POSSIBLE | ${report.summary.possible} |\n`;
  md += `| ❌ INCORRECT | ${report.summary.incorrect} |\n`;
  md += `| ❌ GÉNÉRIQUE | ${report.summary.generic} |\n`;
  md += `| ❌ PHOTO MENU | ${report.summary.photoMenu} |\n`;
  md += `| ❌ PHOTO GALERIE | ${report.summary.photoGalerie} |\n`;
  md += `| ❓ À VÉRIFIER | ${report.summary.aVerifier} |\n\n`;

  md += `## 📋 TABLEAU DES 98 PLATS\n\n`;
  md += `| # | Plat | Catégorie | Photo actuelle | Statut | Explication |\n`;
  md += `|---|------|-----------|----------------|--------|-------------|\n`;

  report.menuItems.forEach(item => {
    md += `| ${item.index} | ${item.nameFr} | ${item.categoryName} | ${item.currentImageShort} | ${item.status} | ${item.explanation} |\n`;
  });

  md += `\n## 🚨 PROBLÈMES CRITIQUES (${report.criticalIssues.length})\n\n`;
  report.criticalIssues.slice(0, 30).forEach((item, i) => {
    md += `### ${i + 1}. ${item.nameFr}\n`;
    md += `- **Catégorie :** ${item.categoryName}\n`;
    md += `- **Statut :** ${item.status}\n`;
    md += `- **Explication :** ${item.explanation}\n`;
    md += `- **Photo actuelle :** \`${item.currentImageShort}\`\n\n`;
  });

  return md;
}

main().catch(console.error);
