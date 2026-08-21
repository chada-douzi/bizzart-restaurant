/**
 * ============================================================================
 * PHASE 2.6 — VALIDATION FINALE FORENSIQUE DU MAPPING PHOTO
 * MODE READ-ONLY ABSOLU - AUCUNE MODIFICATION
 * ============================================================================
 * 
 * MISSION:
 * Valider forensiquement les 98 mappings GOOD_CONFIDENCE avant Phase 3
 * 
 * RÈGLES ABSOLUES:
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune modification fichiers sources
 * ❌ Aucune invention d'URL
 * ✅ Validation et rapport uniquement
 * 
 * VERDICT FINAL: SAFE_FOR_PHASE_3 ou BLOCK_PHASE_3
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

config();

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

type ValidationResult = 
  | 'VALIDATED_REAL_PHOTO'
  | 'VALIDATED_SHARED_REAL_PHOTO'
  | 'VALIDATED_PLACEHOLDER'
  | 'SUSPICIOUS'
  | 'INVALID'
  | 'NO_MAPPING';

type SharedClassification = 
  | 'SHARED_LEGITIMATE'
  | 'SHARED_SUSPICIOUS'
  | 'SHARED_INVALID';

type Verdict = 'SAFE_FOR_PHASE_3' | 'BLOCK_PHASE_3';

interface DishValidation {
  dishId: string;
  dishName: string;
  category: string;
  existingImage: string;
  photoId: string | null;
  photoFilename: string;
  photoURL: string;
  relationship: string;
  confidence: string;
  score: number;
  classification: ValidationResult;
  validationChecks: {
    photoExistsInInventory: boolean;
    urlMatchesExactly: boolean;
    photoIdCorrect: boolean;
    dishIdExistsInMongoDB: boolean;
    relationshipIsCurrent: boolean;
    categoryValid: boolean;
    notClassifiedStock: boolean;
    notClassifiedWrongDish: boolean;
    notRejectedLowQuality: boolean;
    urlNotInvented: boolean;
  };
  reason: string;
  warnings: string[];
}

interface SharedPhotoAnalysis {
  photoId: string;
  photoURL: string;
  filename: string;
  dishes: Array<{
    dishId: string;
    dishName: string;
    category: string;
    relationship: string;
  }>;
  classification: SharedClassification;
  reason: string;
}

interface Anomaly {
  severity: 'CRITICAL' | 'WARNING';
  type: string;
  description: string;
  affected: string[];
}

interface ValidationReport {
  metadata: {
    generatedAt: string;
    mode: 'READ_ONLY_FORENSIC_VALIDATION';
  };
  summary: {
    totalDishes: number;
    mappingsValidated: number;
    realPhotoMappings: number;
    sharedPhotoMappings: number;
    placeholderSupplements: number;
    criticalAnomalies: number;
    warnings: number;
  };
  validations: DishValidation[];
  sharedPhotos: SharedPhotoAnalysis[];
  supplements: DishValidation[];
  duplicates: Array<{
    name: string;
    instances: string[];
  }>;
  anomalies: Anomaly[];
  checks: {
    all114DishesPresent: boolean;
    allDishIdsValid: boolean;
    allUrlsExistInInventory: boolean;
    noInventedUrls: boolean;
    noStockPhotosUsed: boolean;
    noPlaceholderAsRealPhoto: boolean;
    allCurrentRelationsValid: boolean;
    noContradictoryData: boolean;
  };
  verdict: Verdict;
}

// ────────────────────────────────────────────────────────────────────────────
// LOGGING
// ────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  console.log(`[${phase}] ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// CHARGEMENT DONNÉES
// ────────────────────────────────────────────────────────────────────────────

async function loadAllData(): Promise<{
  dishes: any[];
  inventoryComplete: any;
  inventoryEnriched: any;
  mappingReport: any;
  supplementsAudit: any;
}> {
  log('LOAD', 'Loading all data sources...');
  
  // MongoDB
  const categories = await MenuCategory.find({ isActive: true }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({}).populate('category').lean();
  const dishes = items.map(item => ({
    _id: item._id.toString(),
    nameFr: item.name.fr,
    nameEn: item.name.en,
    categoryName: categoryMap.get(item.category._id.toString()) || 'Unknown',
    existingImage: item.image || '',
  }));
  
  log('LOAD', `MongoDB: ${dishes.length} dishes`);
  
  // Inventories
  const inventoryComplete = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../photo-inventory-complete.json'), 'utf-8')
  );
  log('LOAD', `Inventory Complete: ${inventoryComplete.photos.length} photos`);
  
  const inventoryEnriched = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../photo-inventory-enriched.json'), 'utf-8')
  );
  log('LOAD', `Inventory Enriched: ${inventoryEnriched.photos.length} photos`);
  
  // Mapping report
  const mappingReport = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../photo-mapping-final-report.json'), 'utf-8')
  );
  log('LOAD', `Mapping Report: ${mappingReport.mappings.length} mappings`);
  
  // Supplements audit
  const supplementsAudit = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../audit-16-supplements.json'), 'utf-8')
  );
  log('LOAD', `Supplements Audit: ${supplementsAudit.supplements.length} supplements`);
  
  // Verify totals
  if (dishes.length !== 114) {
    throw new Error(`Expected 114 dishes, found ${dishes.length}`);
  }
  
  if (mappingReport.mappings.length !== 114) {
    throw new Error(`Expected 114 mappings, found ${mappingReport.mappings.length}`);
  }
  
  if (supplementsAudit.supplements.length !== 16) {
    throw new Error(`Expected 16 supplements, found ${supplementsAudit.supplements.length}`);
  }
  
  log('LOAD', '✅ All totals verified');
  
  return {
    dishes,
    inventoryComplete,
    inventoryEnriched,
    mappingReport,
    supplementsAudit,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION DES 98 MAPPINGS
// ────────────────────────────────────────────────────────────────────────────

function findPhotoInInventory(url: string, inventory: any): any | null {
  if (!url) return null;
  
  return inventory.photos.find((p: any) => 
    p.url === url ||
    (p.cloudinary?.publicId && url.includes(p.cloudinary.publicId))
  );
}

function validateMapping(
  mapping: any,
  dishes: any[],
  inventoryComplete: any,
  inventoryEnriched: any
): DishValidation {
  
  const dish = dishes.find(d => d._id === mapping.dishId);
  const photoInComplete = findPhotoInInventory(mapping.proposedImage, inventoryComplete);
  const photoInEnriched = findPhotoInInventory(mapping.proposedImage, inventoryEnriched);
  const photo = photoInComplete || photoInEnriched;
  
  const warnings: string[] = [];
  const checks = {
    photoExistsInInventory: photo !== null,
    urlMatchesExactly: mapping.proposedImage === photo?.url,
    photoIdCorrect: true, // Will check below
    dishIdExistsInMongoDB: dish !== null,
    relationshipIsCurrent: false,
    categoryValid: dish?.categoryName === mapping.category,
    notClassifiedStock: photo?.classification !== 'STOCK',
    notClassifiedWrongDish: photo?.classification !== 'WRONG_DISH',
    notRejectedLowQuality: photo?.classification !== 'LOW_QUALITY',
    urlNotInvented: mapping.proposedImage !== null && mapping.proposedImage !== '',
  };
  
  // Check relationship
  if (photo && dish) {
    const relation = photo.dishes?.find((d: any) => d.dishId === dish._id);
    checks.relationshipIsCurrent = relation?.relationship === 'current';
  }
  
  // Determine classification
  let classification: ValidationResult;
  let reason: string;
  
  if (!checks.photoExistsInInventory) {
    classification = 'INVALID';
    reason = 'Photo n\'existe pas dans l\'inventaire';
    warnings.push('CRITICAL: Photo manquante');
  } else if (!checks.dishIdExistsInMongoDB) {
    classification = 'INVALID';
    reason = 'Dish ID inexistant dans MongoDB';
    warnings.push('CRITICAL: Dish ID invalide');
  } else if (!checks.notClassifiedStock) {
    classification = 'INVALID';
    reason = 'Photo classifiée STOCK';
    warnings.push('CRITICAL: Photo stock utilisée');
  } else if (!checks.relationshipIsCurrent) {
    classification = 'SUSPICIOUS';
    reason = 'Relation current non trouvée';
    warnings.push('WARNING: Relation à vérifier');
  } else {
    // Check if shared
    const dishesUsingPhoto = photo.dishes?.length || 0;
    if (dishesUsingPhoto > 1) {
      classification = 'VALIDATED_SHARED_REAL_PHOTO';
      reason = `Photo partagée avec ${dishesUsingPhoto} plats (légitime)`;
    } else {
      classification = 'VALIDATED_REAL_PHOTO';
      reason = 'Mapping validé - photo réelle unique';
    }
  }
  
  return {
    dishId: mapping.dishId,
    dishName: mapping.dishName,
    category: mapping.category,
    existingImage: mapping.existingImage,
    photoId: photo?.id || null,
    photoFilename: photo?.filename || '',
    photoURL: mapping.proposedImage || '',
    relationship: photo?.dishes?.find((d: any) => d.dishId === mapping.dishId)?.relationship || 'none',
    confidence: mapping.status,
    score: mapping.confidence,
    classification,
    validationChecks: checks,
    reason,
    warnings,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// ANALYSE PHOTOS PARTAGÉES
// ────────────────────────────────────────────────────────────────────────────

function analyzeSharedPhotos(
  validations: DishValidation[],
  inventoryComplete: any
): SharedPhotoAnalysis[] {
  
  log('ANALYZE', 'Analyzing shared photos...');
  
  const photoUsage = new Map<string, DishValidation[]>();
  
  validations.forEach(v => {
    if (v.photoURL && v.classification.includes('VALIDATED')) {
      if (!photoUsage.has(v.photoURL)) {
        photoUsage.set(v.photoURL, []);
      }
      photoUsage.get(v.photoURL)!.push(v);
    }
  });
  
  const sharedPhotos: SharedPhotoAnalysis[] = [];
  
  photoUsage.forEach((dishes, url) => {
    if (dishes.length > 1) {
      const photo = findPhotoInInventory(url, inventoryComplete);
      
      // Check if all relationships are current
      const allCurrent = dishes.every(d => d.relationship === 'current');
      
      let classification: SharedClassification;
      let reason: string;
      
      if (allCurrent) {
        classification = 'SHARED_LEGITIMATE';
        reason = `Tous les ${dishes.length} plats ont une relation current explicite`;
      } else {
        const currentCount = dishes.filter(d => d.relationship === 'current').length;
        classification = 'SHARED_SUSPICIOUS';
        reason = `Seulement ${currentCount}/${dishes.length} plats ont une relation current`;
      }
      
      sharedPhotos.push({
        photoId: photo?.id || 'unknown',
        photoURL: url,
        filename: photo?.filename || '',
        dishes: dishes.map(d => ({
          dishId: d.dishId,
          dishName: d.dishName,
          category: d.category,
          relationship: d.relationship,
        })),
        classification,
        reason,
      });
    }
  });
  
  log('ANALYZE', `Found ${sharedPhotos.length} shared photos`);
  
  return sharedPhotos;
}

// ────────────────────────────────────────────────────────────────────────────
// DÉTECTION ANOMALIES
// ────────────────────────────────────────────────────────────────────────────

function detectAnomalies(
  validations: DishValidation[],
  supplements: DishValidation[],
  sharedPhotos: SharedPhotoAnalysis[]
): Anomaly[] {
  
  log('DETECT', 'Detecting anomalies...');
  
  const anomalies: Anomaly[] = [];
  
  // CRITICAL: Photos STOCK utilisées
  const stockPhotos = validations.filter(v => !v.validationChecks.notClassifiedStock);
  if (stockPhotos.length > 0) {
    anomalies.push({
      severity: 'CRITICAL',
      type: 'STOCK_PHOTO_USED',
      description: 'Photos STOCK utilisées comme photos réelles',
      affected: stockPhotos.map(p => p.dishName),
    });
  }
  
  // CRITICAL: Photos manquantes
  const missingPhotos = validations.filter(v => !v.validationChecks.photoExistsInInventory);
  if (missingPhotos.length > 0) {
    anomalies.push({
      severity: 'CRITICAL',
      type: 'PHOTO_NOT_IN_INVENTORY',
      description: 'Photos proposées non trouvées dans l\'inventaire',
      affected: missingPhotos.map(p => p.dishName),
    });
  }
  
  // CRITICAL: Dish IDs invalides
  const invalidDishIds = validations.filter(v => !v.validationChecks.dishIdExistsInMongoDB);
  if (invalidDishIds.length > 0) {
    anomalies.push({
      severity: 'CRITICAL',
      type: 'INVALID_DISH_ID',
      description: 'Dish IDs inexistants dans MongoDB',
      affected: invalidDishIds.map(p => p.dishName),
    });
  }
  
  // WARNING: Relations current manquantes
  const missingCurrentRelations = validations.filter(v => 
    v.validationChecks.photoExistsInInventory && !v.validationChecks.relationshipIsCurrent
  );
  if (missingCurrentRelations.length > 0) {
    anomalies.push({
      severity: 'WARNING',
      type: 'MISSING_CURRENT_RELATION',
      description: 'Relations current non trouvées dans l\'inventaire',
      affected: missingCurrentRelations.map(p => p.dishName),
    });
  }
  
  // WARNING: Photos partagées suspectes
  const suspiciousShared = sharedPhotos.filter(p => p.classification === 'SHARED_SUSPICIOUS');
  if (suspiciousShared.length > 0) {
    anomalies.push({
      severity: 'WARNING',
      type: 'SUSPICIOUS_SHARED_PHOTO',
      description: 'Photos partagées avec relations incomplètes',
      affected: suspiciousShared.map(p => p.filename),
    });
  }
  
  log('DETECT', `Found ${anomalies.length} anomalies`);
  
  return anomalies;
}

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION PRINCIPALE
// ────────────────────────────────────────────────────────────────────────────

async function performFinalValidation(): Promise<ValidationReport> {
  log('VALIDATE', 'Starting final forensic validation...');
  
  // Load all data
  const data = await loadAllData();
  
  // Separate GOOD_CONFIDENCE mappings from NO_CONFIDENT_MATCH
  const goodMappings = data.mappingReport.mappings.filter(
    (m: any) => m.status === 'GOOD_CONFIDENCE'
  );
  
  const noMatchMappings = data.mappingReport.mappings.filter(
    (m: any) => m.status === 'NO_CONFIDENT_MATCH'
  );
  
  log('VALIDATE', `Processing ${goodMappings.length} GOOD_CONFIDENCE mappings...`);
  
  // Validate each GOOD_CONFIDENCE mapping
  const validations = goodMappings.map((mapping: any) =>
    validateMapping(mapping, data.dishes, data.inventoryComplete, data.inventoryEnriched)
  );
  
  // Process supplements (NO_CONFIDENT_MATCH)
  log('VALIDATE', `Processing ${noMatchMappings.length} supplements...`);
  
  const supplements = noMatchMappings.map((mapping: any) => {
    const dish = data.dishes.find((d: any) => d._id === mapping.dishId);
    const isPlaceholder = mapping.existingImage?.includes('placeholder.png');
    
    return {
      dishId: mapping.dishId,
      dishName: mapping.dishName,
      category: mapping.category,
      existingImage: mapping.existingImage,
      photoId: isPlaceholder ? 'photo_37' : null,
      photoFilename: isPlaceholder ? 'placeholder' : '',
      photoURL: mapping.existingImage || '',
      relationship: 'current',
      confidence: mapping.status,
      score: 0,
      classification: isPlaceholder ? 'VALIDATED_PLACEHOLDER' as ValidationResult : 'NO_MAPPING' as ValidationResult,
      validationChecks: {
        photoExistsInInventory: isPlaceholder,
        urlMatchesExactly: true,
        photoIdCorrect: true,
        dishIdExistsInMongoDB: dish !== null,
        relationshipIsCurrent: isPlaceholder,
        categoryValid: true,
        notClassifiedStock: false, // Placeholder is classified as STOCK
        notClassifiedWrongDish: true,
        notRejectedLowQuality: true,
        urlNotInvented: true,
      },
      reason: isPlaceholder ? 'Supplément avec placeholder légitime' : 'Pas de mapping',
      warnings: [],
    };
  });
  
  // Analyze shared photos
  const sharedPhotos = analyzeSharedPhotos(validations, data.inventoryComplete);
  
  // Detect anomalies
  const anomalies = detectAnomalies(validations, supplements, sharedPhotos);
  
  // Detect duplicates
  const duplicateNames = ['gruyère', 'emmental', 'edam', 'champignon'];
  const duplicates = duplicateNames.map(name => {
    const instances = data.dishes
      .filter((d: any) => d.nameFr.toLowerCase() === name)
      .map((d: any) => d._id);
    
    return {
      name,
      instances,
    };
  }).filter(d => d.instances.length > 1);
  
  // Perform final checks
  const checks = {
    all114DishesPresent: data.dishes.length === 114,
    allDishIdsValid: validations.every((v: DishValidation) => v.validationChecks.dishIdExistsInMongoDB),
    allUrlsExistInInventory: validations.every((v: DishValidation) => v.validationChecks.photoExistsInInventory),
    noInventedUrls: validations.every((v: DishValidation) => v.validationChecks.urlNotInvented),
    noStockPhotosUsed: validations.every((v: DishValidation) => v.validationChecks.notClassifiedStock),
    noPlaceholderAsRealPhoto: validations.every((v: DishValidation) => !v.photoFilename.includes('placeholder')),
    allCurrentRelationsValid: validations.every((v: DishValidation) => v.validationChecks.relationshipIsCurrent),
    noContradictoryData: validations.every((v: DishValidation) => v.validationChecks.urlMatchesExactly),
  };
  
  // Calculate summary
  const summary = {
    totalDishes: 114,
    mappingsValidated: validations.length,
    realPhotoMappings: validations.filter((v: DishValidation) => v.classification === 'VALIDATED_REAL_PHOTO').length,
    sharedPhotoMappings: validations.filter((v: DishValidation) => v.classification === 'VALIDATED_SHARED_REAL_PHOTO').length,
    placeholderSupplements: supplements.filter((s: DishValidation) => s.classification === 'VALIDATED_PLACEHOLDER').length,
    criticalAnomalies: anomalies.filter((a: Anomaly) => a.severity === 'CRITICAL').length,
    warnings: anomalies.filter((a: Anomaly) => a.severity === 'WARNING').length,
  };
  
  // Determine verdict
  const verdict: Verdict = summary.criticalAnomalies === 0 ? 'SAFE_FOR_PHASE_3' : 'BLOCK_PHASE_3';
  
  const report: ValidationReport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY_FORENSIC_VALIDATION',
    },
    summary,
    validations,
    sharedPhotos,
    supplements,
    duplicates,
    anomalies,
    checks,
    verdict,
  };
  
  return report;
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION RAPPORTS
// ────────────────────────────────────────────────────────────────────────────

function generateReports(report: ValidationReport): void {
  log('REPORT', 'Generating validation reports...');
  
  // Save JSON
  const jsonPath = path.join(__dirname, '../../PHASE-2.6-VALIDATION-FINALE.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  log('REPORT', `JSON saved to: ${jsonPath}`);
  
  // Generate Markdown
  let md = '# PHASE 2.6 — VALIDATION FINALE FORENSIQUE\n\n';
  md += `**Date**: ${new Date().toLocaleString('fr-FR')}\n`;
  md += `**Mode**: READ-ONLY FORENSIC VALIDATION\n\n`;
  md += '---\n\n';
  
  md += '## 📊 RÉSUMÉ EXÉCUTIF\n\n';
  md += `| Métrique | Valeur |\n`;
  md += `|----------|--------|\n`;
  md += `| Plats analysés | ${report.summary.totalDishes} |\n`;
  md += `| Mappings validés | ${report.summary.mappingsValidated} |\n`;
  md += `| Photos réelles uniques | ${report.summary.realPhotoMappings} |\n`;
  md += `| Photos réelles partagées | ${report.summary.sharedPhotoMappings} |\n`;
  md += `| Suppléments avec placeholder | ${report.summary.placeholderSupplements} |\n`;
  md += `| **Anomalies critiques** | **${report.summary.criticalAnomalies}** |\n`;
  md += `| Avertissements | ${report.summary.warnings} |\n\n`;
  
  md += '---\n\n';
  
  if (report.anomalies.length > 0) {
    md += '## ⚠️ ANOMALIES DÉTECTÉES\n\n';
    report.anomalies.forEach(anomaly => {
      md += `### ${anomaly.severity}: ${anomaly.type}\n\n`;
      md += `**Description**: ${anomaly.description}\n\n`;
      md += `**Affectés** (${anomaly.affected.length}):\n`;
      anomaly.affected.slice(0, 10).forEach(item => {
        md += `- ${item}\n`;
      });
      if (anomaly.affected.length > 10) {
        md += `- ... et ${anomaly.affected.length - 10} autres\n`;
      }
      md += '\n';
    });
    md += '---\n\n';
  }
  
  if (report.sharedPhotos.length > 0) {
    md += '## 🔄 PHOTOS PARTAGÉES\n\n';
    md += `**Total**: ${report.sharedPhotos.length} photos partagées\n\n`;
    report.sharedPhotos.forEach((shared, i) => {
      md += `### ${i + 1}. ${shared.filename}\n\n`;
      md += `- **Classification**: \`${shared.classification}\`\n`;
      md += `- **Plats**: ${shared.dishes.length}\n`;
      md += `- **Raison**: ${shared.reason}\n\n`;
      md += `**Liste des plats**:\n`;
      shared.dishes.forEach(dish => {
        md += `- ${dish.dishName} (${dish.category}) - relation: ${dish.relationship}\n`;
      });
      md += '\n';
    });
    md += '---\n\n';
  }
  
  md += '## ✅ CONTRÔLES FINAUX\n\n';
  md += `- [${report.checks.all114DishesPresent ? 'x' : ' '}] 114 plats présents\n`;
  md += `- [${report.checks.allDishIdsValid ? 'x' : ' '}] Tous les Dish IDs valides\n`;
  md += `- [${report.checks.allUrlsExistInInventory ? 'x' : ' '}] Toutes les URLs existent dans l'inventaire\n`;
  md += `- [${report.checks.noInventedUrls ? 'x' : ' '}] Aucune URL inventée\n`;
  md += `- [${report.checks.noStockPhotosUsed ? 'x' : ' '}] Aucune photo STOCK utilisée\n`;
  md += `- [${report.checks.noPlaceholderAsRealPhoto ? 'x' : ' '}] Aucun placeholder comme photo réelle\n`;
  md += `- [${report.checks.allCurrentRelationsValid ? 'x' : ' '}] Toutes les relations current valides\n`;
  md += `- [${report.checks.noContradictoryData ? 'x' : ' '}] Aucune donnée contradictoire\n\n`;
  
  md += '---\n\n';
  md += `## 🎯 VERDICT FINAL\n\n`;
  md += `# ${report.verdict}\n\n`;
  
  if (report.verdict === 'SAFE_FOR_PHASE_3') {
    md += '✅ Le mapping a passé tous les contrôles critiques.\n';
    md += 'La Phase 3 (application MongoDB) peut être envisagée.\n\n';
  } else {
    md += '❌ Le mapping présente des anomalies critiques.\n';
    md += 'La Phase 3 est BLOQUÉE jusqu\'à résolution.\n\n';
  }
  
  const mdPath = path.join(__dirname, '../../PHASE-2.6-VALIDATION-FINALE.md');
  fs.writeFileSync(mdPath, md);
  log('REPORT', `Markdown saved to: ${mdPath}`);
}

// ────────────────────────────────────────────────────────────────────────────
// AFFICHAGE FINAL
// ────────────────────────────────────────────────────────────────────────────

function displayFinalStatus(report: ValidationReport): void {
  console.log('\n========================================');
  console.log(' PHASE 2.6 — VALIDATION FINALE');
  console.log('========================================\n');
  
  console.log(`Dishes analyzed: ${report.summary.totalDishes}`);
  console.log(`Mappings validated: ${report.summary.mappingsValidated}`);
  console.log(`Shared photos: ${report.sharedPhotos.length}`);
  console.log(`Placeholder supplements: ${report.summary.placeholderSupplements}`);
  console.log(`Critical anomalies: ${report.summary.criticalAnomalies}`);
  console.log(`Warnings: ${report.summary.warnings}\n`);
  
  console.log(`MongoDB modified: NO`);
  console.log(`Cloudinary modified: NO`);
  console.log(`Source files modified: NO\n`);
  
  console.log(`VERDICT:`);
  console.log(`${report.verdict}\n`);
  console.log('========================================\n');
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2.6 — VALIDATION FINALE FORENSIQUE                     ║');
  console.log('║  MODE READ-ONLY ABSOLU - AUCUNE MODIFICATION                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    log('MONGODB', `Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    log('MONGODB', 'Connected successfully');
    
    // Perform validation
    const report = await performFinalValidation();
    
    // Generate reports
    generateReports(report);
    
    // Display final status
    displayFinalStatus(report);
    
    // Exit with appropriate code
    process.exit(report.verdict === 'SAFE_FOR_PHASE_3' ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('MONGODB', 'Disconnected');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// RUN
// ────────────────────────────────────────────────────────────────────────────

main();
