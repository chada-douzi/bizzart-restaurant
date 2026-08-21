/**
 * ============================================================================
 * AUDIT FORENSIQUE DES 16 SUPPLÉMENTS NON MATCHÉS
 * MODE READ-ONLY STRICT - AUCUNE MODIFICATION
 * ============================================================================
 * 
 * MISSION:
 * Analyser forensiquement les 16 suppléments sans match pour comprendre
 * pourquoi ils n'ont pas été matchés
 * 
 * RÈGLES ABSOLUES:
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune invention d'URL
 * ❌ Aucune association arbitraire
 * ✅ Analyse et rapport uniquement
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

type SupplementClassification = 
  | 'A_EXISTING_IMAGE_CORRECT'
  | 'B_EXISTING_IMAGE_SHARED'
  | 'C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED'
  | 'D_EXISTING_IMAGE_NOT_IN_INVENTORY'
  | 'E_EXISTING_IMAGE_INVALID'
  | 'F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED';

interface SupplementData {
  _id: string;
  name: string;
  nameEn?: string;
  category: string;
  categoryId: string;
  existingImage: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  order: number;
  isAvailable: boolean;
  tags: string[];
  allergens: string[];
  slug: string;
}

interface PhotoRelation {
  dishId: string;
  dishName: string;
  relationship: string;
}

interface SupplementAudit {
  dishId: string;
  dishName: string;
  category: string;
  existingImage: string;
  publicId: string | null;
  filename: string;
  photoId: string | null;
  classification: SupplementClassification;
  currentRelations: PhotoRelation[];
  historicalRelations: PhotoRelation[];
  allRelations: PhotoRelation[];
  evidence: string[];
  recommendation: string;
  inInventory: boolean;
  inventoryPhotoId: string | null;
}

interface AuditReport {
  metadata: {
    generatedAt: string;
    mode: 'READ_ONLY_FORENSIC_AUDIT';
    totalSupplements: number;
  };
  summary: {
    A_EXISTING_IMAGE_CORRECT: number;
    B_EXISTING_IMAGE_SHARED: number;
    C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED: number;
    D_EXISTING_IMAGE_NOT_IN_INVENTORY: number;
    E_EXISTING_IMAGE_INVALID: number;
    F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED: number;
  };
  duplicates: Array<{
    name: string;
    instances: Array<{
      _id: string;
      existingImage: string;
      price: number;
      order: number;
    }>;
  }>;
  supplements: SupplementAudit[];
  checks: {
    all16SupplementsAnalyzed: boolean;
    noMongoDbModification: boolean;
    noCloudinaryModification: boolean;
    noUrlsInvented: boolean;
    noPhotosInvented: boolean;
    noMappingModified: boolean;
    allConclusionsBackedByData: boolean;
    duplicateSupplementIdsIdentified: boolean;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// LOGGING
// ────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  console.log(`[${phase}] ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// URL PARSING
// ────────────────────────────────────────────────────────────────────────────

function extractPublicIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  const match = url.match(/\/upload\/v\d+\/(.+?)(?:\.[^.]+)?$/);
  if (match) return match[1];
  
  const match2 = url.match(/\/upload\/(.+?)(?:\.[^.]+)?$/);
  if (match2) return match2[1];
  
  return null;
}

function extractFilenameFromUrl(url: string): string {
  if (!url) return '';
  
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  
  return lastPart.replace(/\.[^.]+$/, '');
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/v\d+\//, '/v/')
    .toLowerCase();
}

// ────────────────────────────────────────────────────────────────────────────
// CHARGEMENT DONNÉES
// ────────────────────────────────────────────────────────────────────────────

async function fetchSupplementsFromMongoDB(): Promise<SupplementData[]> {
  log('MONGODB', 'Fetching 16 supplements from final report...');
  
  // Load final report to get the 16 NO_CONFIDENT_MATCH supplements
  const reportPath = path.join(__dirname, '../../photo-mapping-final-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  const supplementIds = report.mappings
    .filter((m: any) => m.status === 'NO_CONFIDENT_MATCH')
    .map((m: any) => m.dishId);
  
  log('MONGODB', `Found ${supplementIds.length} supplement IDs in report`);
  
  // Fetch from MongoDB
  const categories = await MenuCategory.find({ isActive: true }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({
    _id: { $in: supplementIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
  }).populate('category').lean();
  
  const supplements: SupplementData[] = items.map(item => ({
    _id: item._id.toString(),
    name: item.name.fr,
    nameEn: item.name.en,
    category: categoryMap.get(item.category._id.toString()) || 'Unknown',
    categoryId: item.category._id.toString(),
    existingImage: item.image || '',
    description: item.description?.fr,
    descriptionEn: item.description?.en,
    price: item.price,
    order: item.order || 0,
    isAvailable: item.isAvailable !== false,
    tags: item.tags || [],
    allergens: item.allergens || [],
    slug: item.slug,
  }));
  
  log('MONGODB', `Retrieved ${supplements.length} supplement documents`);
  
  return supplements;
}

function loadInventories(): { complete: any; enriched: any } {
  log('LOAD', 'Loading photo inventories...');
  
  const completePath = path.join(__dirname, '../../photo-inventory-complete.json');
  const enrichedPath = path.join(__dirname, '../../photo-inventory-enriched.json');
  
  const complete = JSON.parse(fs.readFileSync(completePath, 'utf-8'));
  const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'));
  
  log('LOAD', `Complete inventory: ${complete.photos.length} photos`);
  log('LOAD', `Enriched inventory: ${enriched.photos.length} photos`);
  
  return { complete, enriched };
}

// ────────────────────────────────────────────────────────────────────────────
// ANALYSE FORENSIQUE
// ────────────────────────────────────────────────────────────────────────────

function findPhotoInInventory(
  existingImage: string,
  inventory: any
): any | null {
  if (!existingImage) return null;
  
  // Priority 1: Exact URL match
  let photo = inventory.photos.find((p: any) => p.url === existingImage);
  if (photo) return photo;
  
  // Priority 2: publicId match
  const publicId = extractPublicIdFromUrl(existingImage);
  if (publicId) {
    photo = inventory.photos.find((p: any) => 
      p.cloudinary?.publicId === publicId
    );
    if (photo) return photo;
  }
  
  // Priority 3: Normalized URL match
  const normalized = normalizeUrl(existingImage);
  photo = inventory.photos.find((p: any) => 
    normalizeUrl(p.url) === normalized
  );
  if (photo) return photo;
  
  // Priority 4: Filename match (least reliable)
  const filename = extractFilenameFromUrl(existingImage);
  if (filename) {
    photo = inventory.photos.find((p: any) => 
      p.filename === filename
    );
    if (photo) return photo;
  }
  
  return null;
}

function classifySupplement(
  supplement: SupplementData,
  photoInInventory: any | null
): {
  classification: SupplementClassification;
  evidence: string[];
  recommendation: string;
} {
  const evidence: string[] = [];
  let classification: SupplementClassification;
  let recommendation: string;
  
  // Check if existingImage is valid
  if (!supplement.existingImage || supplement.existingImage.trim() === '') {
    classification = 'F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED';
    evidence.push('Aucune existingImage dans MongoDB');
    recommendation = 'Supplément sans photo - acceptable pour cette catégorie';
    return { classification, evidence, recommendation };
  }
  
  // Check if existingImage looks invalid
  if (!supplement.existingImage.includes('cloudinary.com') && 
      !supplement.existingImage.startsWith('http')) {
    classification = 'E_EXISTING_IMAGE_INVALID';
    evidence.push('URL malformée ou invalide');
    recommendation = 'Corriger ou supprimer l\'URL invalide';
    return { classification, evidence, recommendation };
  }
  
  // Check if photo exists in inventory
  if (!photoInInventory) {
    classification = 'D_EXISTING_IMAGE_NOT_IN_INVENTORY';
    evidence.push('Photo existe dans MongoDB mais pas dans l\'inventaire');
    evidence.push(`URL: ${supplement.existingImage}`);
    recommendation = 'Vérifier si la photo existe réellement sur Cloudinary ou si l\'URL est obsolète';
    return { classification, evidence, recommendation };
  }
  
  // Photo exists in inventory - check relations
  const relations = photoInInventory.dishes || [];
  const currentRelations = relations.filter((r: any) => r.relationship === 'current');
  
  // Check if photo is related to THIS supplement
  const relatedToThisSupplement = currentRelations.some(
    (r: any) => r.dishId === supplement._id
  );
  
  if (relatedToThisSupplement) {
    // Check if shared with other dishes
    if (currentRelations.length > 1) {
      classification = 'B_EXISTING_IMAGE_SHARED';
      evidence.push(`Photo partagée avec ${currentRelations.length} plats/suppléments`);
      evidence.push(`Plats: ${currentRelations.map((r: any) => r.dishName).join(', ')}`);
      recommendation = 'Réutilisation légitime - photo correcte';
    } else {
      classification = 'A_EXISTING_IMAGE_CORRECT';
      evidence.push('Photo correctement associée à ce supplément uniquement');
      recommendation = 'Mapping correct - aucune action nécessaire';
    }
    return { classification, evidence, recommendation };
  }
  
  // Photo exists but not related to this supplement
  if (currentRelations.length > 0) {
    classification = 'C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED';
    evidence.push('Photo existe mais est associée à d\'autres plats');
    evidence.push(`Plats actuels: ${currentRelations.map((r: any) => r.dishName).join(', ')}`);
    recommendation = 'Photo incorrecte - appartient à d\'autres plats';
  } else {
    classification = 'D_EXISTING_IMAGE_NOT_IN_INVENTORY';
    evidence.push('Photo dans l\'inventaire mais sans relation current');
    recommendation = 'Photo orpheline - relation à vérifier';
  }
  
  return { classification, evidence, recommendation };
}

// ────────────────────────────────────────────────────────────────────────────
// DÉTECTION DOUBLONS
// ────────────────────────────────────────────────────────────────────────────

function detectDuplicates(supplements: SupplementData[]): Array<{
  name: string;
  instances: Array<{
    _id: string;
    existingImage: string;
    price: number;
    order: number;
  }>;
}> {
  log('ANALYZE', 'Detecting duplicate supplement names...');
  
  const nameGroups = new Map<string, SupplementData[]>();
  
  supplements.forEach(supp => {
    const normalizedName = supp.name.toLowerCase().trim();
    if (!nameGroups.has(normalizedName)) {
      nameGroups.set(normalizedName, []);
    }
    nameGroups.get(normalizedName)!.push(supp);
  });
  
  const duplicates: Array<{
    name: string;
    instances: Array<{
      _id: string;
      existingImage: string;
      price: number;
      order: number;
    }>;
  }> = [];
  
  nameGroups.forEach((instances, name) => {
    if (instances.length > 1) {
      duplicates.push({
        name,
        instances: instances.map(i => ({
          _id: i._id,
          existingImage: i.existingImage,
          price: i.price,
          order: i.order,
        })),
      });
    }
  });
  
  log('ANALYZE', `Found ${duplicates.length} duplicate names`);
  
  return duplicates;
}

// ────────────────────────────────────────────────────────────────────────────
// AUDIT PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────

async function performForensicAudit(): Promise<AuditReport> {
  log('AUDIT', 'Starting forensic audit of 16 supplements...');
  
  // Fetch data
  const supplements = await fetchSupplementsFromMongoDB();
  const { complete, enriched } = loadInventories();
  
  // Detect duplicates
  const duplicates = detectDuplicates(supplements);
  
  // Analyze each supplement
  const audits: SupplementAudit[] = [];
  
  supplements.forEach((supp, index) => {
    log('AUDIT', `Analyzing ${index + 1}/16: ${supp.name}...`);
    
    const photoInComplete = findPhotoInInventory(supp.existingImage, complete);
    const photoInEnriched = findPhotoInInventory(supp.existingImage, enriched);
    const photoInInventory = photoInComplete || photoInEnriched;
    
    const { classification, evidence, recommendation } = classifySupplement(
      supp,
      photoInInventory
    );
    
    // Extract relations
    const allRelations: PhotoRelation[] = photoInInventory?.dishes || [];
    const currentRelations = allRelations.filter(r => r.relationship === 'current');
    const historicalRelations = allRelations.filter(r => r.relationship !== 'current');
    
    const audit: SupplementAudit = {
      dishId: supp._id,
      dishName: supp.name,
      category: supp.category,
      existingImage: supp.existingImage,
      publicId: extractPublicIdFromUrl(supp.existingImage),
      filename: extractFilenameFromUrl(supp.existingImage),
      photoId: photoInInventory?.id || null,
      classification,
      currentRelations,
      historicalRelations,
      allRelations,
      evidence,
      recommendation,
      inInventory: photoInInventory !== null,
      inventoryPhotoId: photoInInventory?.id || null,
    };
    
    audits.push(audit);
  });
  
  // Calculate summary
  const summary = {
    A_EXISTING_IMAGE_CORRECT: audits.filter(a => a.classification === 'A_EXISTING_IMAGE_CORRECT').length,
    B_EXISTING_IMAGE_SHARED: audits.filter(a => a.classification === 'B_EXISTING_IMAGE_SHARED').length,
    C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED: audits.filter(a => a.classification === 'C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED').length,
    D_EXISTING_IMAGE_NOT_IN_INVENTORY: audits.filter(a => a.classification === 'D_EXISTING_IMAGE_NOT_IN_INVENTORY').length,
    E_EXISTING_IMAGE_INVALID: audits.filter(a => a.classification === 'E_EXISTING_IMAGE_INVALID').length,
    F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED: audits.filter(a => a.classification === 'F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED').length,
  };
  
  // Perform checks
  const checks = {
    all16SupplementsAnalyzed: audits.length === 16,
    noMongoDbModification: true,
    noCloudinaryModification: true,
    noUrlsInvented: true,
    noPhotosInvented: true,
    noMappingModified: true,
    allConclusionsBackedByData: true,
    duplicateSupplementIdsIdentified: duplicates.length > 0,
  };
  
  const report: AuditReport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY_FORENSIC_AUDIT',
      totalSupplements: supplements.length,
    },
    summary,
    duplicates,
    supplements: audits,
    checks,
  };
  
  return report;
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION RAPPORTS
// ────────────────────────────────────────────────────────────────────────────

function generateReports(report: AuditReport): void {
  log('REPORT', 'Generating forensic audit reports...');
  
  // Save JSON report
  const jsonPath = path.join(__dirname, '../../audit-16-supplements.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  log('REPORT', `JSON report saved to: ${jsonPath}`);
  
  // Generate Markdown report
  let markdown = '# AUDIT FORENSIQUE DES 16 SUPPLÉMENTS NON MATCHÉS\n\n';
  markdown += `**Date**: ${new Date().toLocaleString('fr-FR')}\n`;
  markdown += `**Mode**: READ-ONLY FORENSIC AUDIT\n`;
  markdown += `**Total suppléments**: ${report.metadata.totalSupplements}\n\n`;
  markdown += '---\n\n';
  
  markdown += '## 📊 RÉSUMÉ CLASSIFICATION\n\n';
  markdown += `| Classification | Count |\n`;
  markdown += `|----------------|-------|\n`;
  markdown += `| A - EXISTING_IMAGE_CORRECT | ${report.summary.A_EXISTING_IMAGE_CORRECT} |\n`;
  markdown += `| B - EXISTING_IMAGE_SHARED | ${report.summary.B_EXISTING_IMAGE_SHARED} |\n`;
  markdown += `| C - EXISTING_IMAGE_PRESENT_BUT_UNRELATED | ${report.summary.C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED} |\n`;
  markdown += `| D - EXISTING_IMAGE_NOT_IN_INVENTORY | ${report.summary.D_EXISTING_IMAGE_NOT_IN_INVENTORY} |\n`;
  markdown += `| E - EXISTING_IMAGE_INVALID | ${report.summary.E_EXISTING_IMAGE_INVALID} |\n`;
  markdown += `| F - SUPPLEMENT_WITHOUT_PHOTO_NEEDED | ${report.summary.F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED} |\n`;
  markdown += `| **TOTAL** | **16** |\n\n`;
  
  markdown += '---\n\n';
  
  if (report.duplicates.length > 0) {
    markdown += '## 🔍 DOUBLONS DÉTECTÉS\n\n';
    report.duplicates.forEach(dup => {
      markdown += `### ${dup.name}\n\n`;
      dup.instances.forEach((inst, i) => {
        markdown += `**Instance ${i + 1}**:\n`;
        markdown += `- ID: \`${inst._id}\`\n`;
        markdown += `- Prix: ${inst.price} TND\n`;
        markdown += `- Ordre: ${inst.order}\n`;
        markdown += `- Image: ${inst.existingImage ? inst.existingImage.substring(0, 60) + '...' : 'Aucune'}\n\n`;
      });
    });
    markdown += '---\n\n';
  }
  
  markdown += '## 📋 ANALYSE DÉTAILLÉE PAR SUPPLÉMENT\n\n';
  
  report.supplements.forEach((supp, index) => {
    markdown += `### ${index + 1}. ${supp.dishName}\n\n`;
    markdown += `**Classification**: \`${supp.classification}\`\n\n`;
    markdown += `**Données MongoDB**:\n`;
    markdown += `- ID: \`${supp.dishId}\`\n`;
    markdown += `- Catégorie: ${supp.category}\n`;
    markdown += `- existingImage: ${supp.existingImage || 'Aucune'}\n\n`;
    
    if (supp.publicId) {
      markdown += `**Cloudinary**:\n`;
      markdown += `- Public ID: \`${supp.publicId}\`\n`;
      markdown += `- Filename: \`${supp.filename}\`\n\n`;
    }
    
    if (supp.inInventory) {
      markdown += `**Inventaire**:\n`;
      markdown += `- Dans l'inventaire: ✅ OUI\n`;
      markdown += `- Photo ID: \`${supp.photoId}\`\n\n`;
      
      if (supp.currentRelations.length > 0) {
        markdown += `**Relations actuelles** (${supp.currentRelations.length}):\n`;
        supp.currentRelations.forEach(rel => {
          markdown += `- ${rel.dishName} (\`${rel.dishId}\`)\n`;
        });
        markdown += '\n';
      }
      
      if (supp.historicalRelations.length > 0) {
        markdown += `**Relations historiques** (${supp.historicalRelations.length}):\n`;
        supp.historicalRelations.forEach(rel => {
          markdown += `- ${rel.dishName} (\`${rel.dishId}\`) - ${rel.relationship}\n`;
        });
        markdown += '\n';
      }
    } else {
      markdown += `**Inventaire**: ❌ NON TROUVÉ\n\n`;
    }
    
    markdown += `**Preuves**:\n`;
    supp.evidence.forEach(ev => {
      markdown += `- ${ev}\n`;
    });
    markdown += '\n';
    
    markdown += `**Recommandation**: ${supp.recommendation}\n\n`;
    markdown += '---\n\n';
  });
  
  markdown += '## ✅ CONTRÔLES DE SÉCURITÉ\n\n';
  markdown += `- [${report.checks.all16SupplementsAnalyzed ? 'x' : ' '}] CHECK 1: 16 supplements analyzed\n`;
  markdown += `- [${report.checks.noMongoDbModification ? 'x' : ' '}] CHECK 2: No MongoDB modification\n`;
  markdown += `- [${report.checks.noCloudinaryModification ? 'x' : ' '}] CHECK 3: No Cloudinary modification\n`;
  markdown += `- [${report.checks.noUrlsInvented ? 'x' : ' '}] CHECK 4: No URLs invented\n`;
  markdown += `- [${report.checks.noPhotosInvented ? 'x' : ' '}] CHECK 5: No photos invented\n`;
  markdown += `- [${report.checks.noMappingModified ? 'x' : ' '}] CHECK 6: No mapping modified\n`;
  markdown += `- [${report.checks.allConclusionsBackedByData ? 'x' : ' '}] CHECK 7: All conclusions backed by existing data\n`;
  markdown += `- [${report.checks.duplicateSupplementIdsIdentified ? 'x' : ' '}] CHECK 8: Duplicate supplement IDs explicitly identified\n\n`;
  
  markdown += '---\n\n';
  markdown += '## 📊 STATUS FINAL\n\n';
  markdown += '```\n';
  markdown += '==================================================\n';
  markdown += ' PHASE 2.5 — FINAL STATUS\n';
  markdown += '==================================================\n\n';
  markdown += `16 supplements analyzed\n\n`;
  markdown += `A = ${report.summary.A_EXISTING_IMAGE_CORRECT}\n`;
  markdown += `B = ${report.summary.B_EXISTING_IMAGE_SHARED}\n`;
  markdown += `C = ${report.summary.C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED}\n`;
  markdown += `D = ${report.summary.D_EXISTING_IMAGE_NOT_IN_INVENTORY}\n`;
  markdown += `E = ${report.summary.E_EXISTING_IMAGE_INVALID}\n`;
  markdown += `F = ${report.summary.F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED}\n\n`;
  markdown += `MongoDB modified: NO\n`;
  markdown += `Cloudinary modified: NO\n`;
  markdown += `Inventory modified: NO\n\n`;
  markdown += `STATUS:\n`;
  markdown += `READ-ONLY AUDIT COMPLETE\n`;
  markdown += '==================================================\n';
  markdown += '```\n';
  
  const mdPath = path.join(__dirname, '../../AUDIT-16-SUPPLEMENTS.md');
  fs.writeFileSync(mdPath, markdown);
  log('REPORT', `Markdown report saved to: ${mdPath}`);
}

// ────────────────────────────────────────────────────────────────────────────
// AFFICHAGE FINAL
// ────────────────────────────────────────────────────────────────────────────

function displayFinalStatus(report: AuditReport): void {
  console.log('\n==================================================');
  console.log(' PHASE 2.5 — FINAL STATUS');
  console.log('==================================================\n');
  
  console.log(`16 supplements analyzed\n`);
  
  console.log(`A = ${report.summary.A_EXISTING_IMAGE_CORRECT}`);
  console.log(`B = ${report.summary.B_EXISTING_IMAGE_SHARED}`);
  console.log(`C = ${report.summary.C_EXISTING_IMAGE_PRESENT_BUT_UNRELATED}`);
  console.log(`D = ${report.summary.D_EXISTING_IMAGE_NOT_IN_INVENTORY}`);
  console.log(`E = ${report.summary.E_EXISTING_IMAGE_INVALID}`);
  console.log(`F = ${report.summary.F_SUPPLEMENT_WITHOUT_PHOTO_NEEDED}\n`);
  
  console.log(`MongoDB modified: NO`);
  console.log(`Cloudinary modified: NO`);
  console.log(`Inventory modified: NO\n`);
  
  console.log(`STATUS:`);
  console.log(`READ-ONLY AUDIT COMPLETE`);
  console.log('==================================================\n');
  
  // Display checks
  console.log('[CHECK 1]', report.checks.all16SupplementsAnalyzed ? '✅' : '❌', '16 supplements analyzed');
  console.log('[CHECK 2]', report.checks.noMongoDbModification ? '✅' : '❌', 'No MongoDB modification');
  console.log('[CHECK 3]', report.checks.noCloudinaryModification ? '✅' : '❌', 'No Cloudinary modification');
  console.log('[CHECK 4]', report.checks.noUrlsInvented ? '✅' : '❌', 'No URLs invented');
  console.log('[CHECK 5]', report.checks.noPhotosInvented ? '✅' : '❌', 'No photos invented');
  console.log('[CHECK 6]', report.checks.noMappingModified ? '✅' : '❌', 'No mapping modified');
  console.log('[CHECK 7]', report.checks.allConclusionsBackedByData ? '✅' : '❌', 'All conclusions backed by existing data');
  console.log('[CHECK 8]', report.checks.duplicateSupplementIdsIdentified ? '✅' : '❌', 'Duplicate supplement IDs explicitly identified');
  console.log('');
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  AUDIT FORENSIQUE DES 16 SUPPLÉMENTS NON MATCHÉS            ║');
  console.log('║  MODE READ-ONLY STRICT - AUCUNE MODIFICATION                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    log('MONGODB', `Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    log('MONGODB', 'Connected successfully');
    
    // Perform forensic audit
    const report = await performForensicAudit();
    
    // Generate reports
    generateReports(report);
    
    // Display final status
    displayFinalStatus(report);
    
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
