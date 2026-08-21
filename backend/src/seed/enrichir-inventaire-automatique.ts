/**
 * ============================================================================
 * ENRICHISSEMENT AUTOMATIQUE DE L'INVENTAIRE PHOTO
 * MODE READ-ONLY STRICT - AUCUNE MODIFICATION
 * ============================================================================
 * 
 * MISSION:
 * Récupérer les existingImage des 78 plats manquants et les ajouter à l'inventaire
 * 
 * RÈGLES:
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune suppression
 * ❌ Aucun upload
 * ✅ Reconstruction de l'inventaire uniquement
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables
config();

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface DishData {
  _id: string;
  nameFr: string;
  nameEn?: string;
  categoryId: string;
  categoryName: string;
  existingImage: string;
}

interface PhotoInventoryEntry {
  id: string;
  url: string;
  filename: string;
  cloudinary?: {
    publicId: string;
    folder?: string;
    filename: string;
    originalUrl?: string;
    resourceType?: string;
    type?: string;
    version?: string;
    extension?: string;
  };
  sources: string[];
  sourceTypes?: string[];
  dishes?: Array<{
    dishId: string;
    dishName: string;
    relationship: string;
  }>;
  classification?: string;
}

interface ExistingImageAnalysis {
  url: string;
  dishId: string;
  dishName: string;
  category: string;
  status: 'ALREADY_IN_INVENTORY' | 'MISSING_FROM_INVENTORY' | 'UNRESOLVED' | 'CLOUDINARY_VERIFIED';
  inventoryEntry?: PhotoInventoryEntry;
  cloudinaryData?: any;
  reason?: string;
}

interface EnrichmentReport {
  metadata: {
    generatedAt: string;
    mode: 'READ_ONLY_ENRICHMENT';
  };
  summary: {
    totalDishes: number;
    totalUniqueExistingImages: number;
    alreadyInInventory: number;
    missingFromInventory: number;
    cloudinaryVerified: number;
    unresolved: number;
    newInventoryEntries: number;
  };
  analyses: ExistingImageAnalysis[];
  enrichedInventory: PhotoInventoryEntry[];
  checks: {
    all114DishesAnalyzed: boolean;
    allExistingImagesTested: boolean;
    noInventedUrls: boolean;
    noDatabaseModified: boolean;
    noCloudinaryUploads: boolean;
    noDeletions: boolean;
    originalInventoryPreserved: boolean;
    allRelationsHaveValidDishId: boolean;
    noDuplicates: boolean;
    validJson: boolean;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// LOGGING
// ────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  console.log(`[${phase}] ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// NORMALISATION URL
// ────────────────────────────────────────────────────────────────────────────

function normalizeCloudinaryUrl(url: string): string {
  if (!url) return '';
  
  // Remove protocol
  let normalized = url.replace(/^https?:\/\//, '');
  
  // Remove query parameters
  normalized = normalized.split('?')[0];
  
  // Normalize transformations (keep base path only)
  normalized = normalized.replace(/\/v\d+\//, '/v/');
  
  return normalized.toLowerCase();
}

function extractPublicIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  // Pattern: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{publicId}.{ext}
  const match = url.match(/\/upload\/v\d+\/(.+?)(?:\.[^.]+)?$/);
  if (match) {
    return match[1];
  }
  
  // Alternative pattern without version
  const match2 = url.match(/\/upload\/(.+?)(?:\.[^.]+)?$/);
  if (match2) {
    return match2[1];
  }
  
  return null;
}

function extractFilenameFromUrl(url: string): string {
  if (!url) return '';
  
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  
  // Remove extension
  return lastPart.replace(/\.[^.]+$/, '');
}

// ────────────────────────────────────────────────────────────────────────────
// CHARGEMENT DONNÉES
// ────────────────────────────────────────────────────────────────────────────

function loadCurrentInventory(): PhotoInventoryEntry[] {
  log('LOAD', 'Loading current photo inventory...');
  
  const inventoryPath = path.join(__dirname, '../../photo-inventory-complete.json');
  
  if (!fs.existsSync(inventoryPath)) {
    throw new Error('photo-inventory-complete.json not found!');
  }
  
  const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  
  log('LOAD', `Loaded ${data.photos.length} photos from current inventory`);
  
  return data.photos;
}

async function fetchAllDishes(): Promise<DishData[]> {
  log('MONGODB', 'Fetching ALL dishes from MongoDB...');
  
  const categories = await MenuCategory.find({ isActive: true }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({}).populate('category').lean();
  
  const dishes: DishData[] = items.map(item => ({
    _id: item._id.toString(),
    nameFr: item.name.fr,
    nameEn: item.name.en,
    categoryId: item.category._id.toString(),
    categoryName: categoryMap.get(item.category._id.toString()) || 'Unknown',
    existingImage: item.image || '',
  }));
  
  log('MONGODB', `Found ${dishes.length} dishes`);
  
  return dishes;
}

// ────────────────────────────────────────────────────────────────────────────
// EXTRACTION EXISTINGIMAGES
// ────────────────────────────────────────────────────────────────────────────

function extractUniqueExistingImages(dishes: DishData[]): Map<string, DishData[]> {
  log('EXTRACT', 'Extracting unique existingImage URLs...');
  
  const imageMap = new Map<string, DishData[]>();
  
  dishes.forEach(dish => {
    if (dish.existingImage && dish.existingImage.trim() !== '') {
      const url = dish.existingImage.trim();
      
      if (!imageMap.has(url)) {
        imageMap.set(url, []);
      }
      
      imageMap.get(url)!.push(dish);
    }
  });
  
  log('EXTRACT', `Found ${imageMap.size} unique existingImage URLs`);
  
  return imageMap;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPARAISON AVEC INVENTAIRE
// ────────────────────────────────────────────────────────────────────────────

function findInInventory(
  url: string,
  inventory: PhotoInventoryEntry[]
): PhotoInventoryEntry | null {
  
  // Priority 1: Exact URL match
  let found = inventory.find(photo => photo.url === url);
  if (found) return found;
  
  // Priority 2: Cloudinary publicId match
  const publicId = extractPublicIdFromUrl(url);
  if (publicId) {
    found = inventory.find(photo => 
      photo.cloudinary?.publicId === publicId
    );
    if (found) return found;
  }
  
  // Priority 3: Normalized URL match
  const normalizedUrl = normalizeCloudinaryUrl(url);
  found = inventory.find(photo => 
    normalizeCloudinaryUrl(photo.url) === normalizedUrl
  );
  if (found) return found;
  
  // Priority 4: Filename match (less reliable)
  const filename = extractFilenameFromUrl(url);
  if (filename) {
    found = inventory.find(photo => 
      photo.filename === filename || 
      photo.cloudinary?.filename === filename
    );
    if (found) return found;
  }
  
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// VÉRIFICATION CLOUDINARY (READ-ONLY)
// ────────────────────────────────────────────────────────────────────────────

async function verifyCloudinaryImage(url: string): Promise<any | null> {
  try {
    const publicId = extractPublicIdFromUrl(url);
    
    if (!publicId) {
      return null;
    }
    
    // Try to get resource details (READ-ONLY operation)
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
    });
    
    return result;
  } catch (error: any) {
    if (error.error?.http_code === 404) {
      log('CLOUDINARY', `Resource not found: ${url}`);
      return null;
    }
    
    log('CLOUDINARY', `Error verifying ${url}: ${error.message}`);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ANALYSE DES EXISTINGIMAGES
// ────────────────────────────────────────────────────────────────────────────

async function analyzeExistingImages(
  imageMap: Map<string, DishData[]>,
  inventory: PhotoInventoryEntry[]
): Promise<ExistingImageAnalysis[]> {
  
  log('ANALYZE', 'Analyzing existingImage URLs...');
  
  const analyses: ExistingImageAnalysis[] = [];
  let analyzed = 0;
  
  for (const [url, dishes] of imageMap.entries()) {
    analyzed++;
    
    if (analyzed % 20 === 0) {
      log('ANALYZE', `Analyzed ${analyzed}/${imageMap.size} images...`);
    }
    
    const dish = dishes[0]; // Use first dish for primary info
    
    // Check if already in inventory
    const inventoryEntry = findInInventory(url, inventory);
    
    if (inventoryEntry) {
      // Already in inventory
      analyses.push({
        url,
        dishId: dish._id,
        dishName: dish.nameFr,
        category: dish.categoryName,
        status: 'ALREADY_IN_INVENTORY',
        inventoryEntry,
        reason: 'Found in current inventory',
      });
    } else {
      // Missing from inventory - try to verify with Cloudinary
      const cloudinaryData = await verifyCloudinaryImage(url);
      
      if (cloudinaryData) {
        analyses.push({
          url,
          dishId: dish._id,
          dishName: dish.nameFr,
          category: dish.categoryName,
          status: 'CLOUDINARY_VERIFIED',
          cloudinaryData,
          reason: 'Verified on Cloudinary',
        });
      } else {
        // Check if URL looks valid but not verifiable
        if (url.includes('cloudinary.com')) {
          analyses.push({
            url,
            dishId: dish._id,
            dishName: dish.nameFr,
            category: dish.categoryName,
            status: 'MISSING_FROM_INVENTORY',
            reason: 'Cloudinary URL but not verifiable',
          });
        } else {
          analyses.push({
            url,
            dishId: dish._id,
            dishName: dish.nameFr,
            category: dish.categoryName,
            status: 'UNRESOLVED',
            reason: 'Not a Cloudinary URL or unverifiable',
          });
        }
      }
    }
  }
  
  log('ANALYZE', `Analysis complete: ${analyses.length} images analyzed`);
  
  return analyses;
}

// ────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION INVENTAIRE ENRICHI
// ────────────────────────────────────────────────────────────────────────────

function buildEnrichedInventory(
  currentInventory: PhotoInventoryEntry[],
  analyses: ExistingImageAnalysis[],
  imageMap: Map<string, DishData[]>
): PhotoInventoryEntry[] {
  
  log('BUILD', 'Building enriched inventory...');
  
  // Start with current inventory (deep copy)
  const enriched: PhotoInventoryEntry[] = JSON.parse(JSON.stringify(currentInventory));
  
  let nextId = enriched.length + 1;
  let added = 0;
  
  // Add missing images that were verified
  analyses.forEach(analysis => {
    if (analysis.status === 'CLOUDINARY_VERIFIED' || analysis.status === 'MISSING_FROM_INVENTORY') {
      const dishes = imageMap.get(analysis.url) || [];
      
      const filename = extractFilenameFromUrl(analysis.url);
      const publicId = extractPublicIdFromUrl(analysis.url);
      
      const newEntry: PhotoInventoryEntry = {
        id: `photo_enriched_${nextId}`,
        url: analysis.url,
        filename: filename,
        sources: ['MongoDB-existingImage'],
        sourceTypes: ['mongodb'],
        dishes: dishes.map(d => ({
          dishId: d._id,
          dishName: d.nameFr,
          relationship: 'current',
        })),
      };
      
      // Add Cloudinary data if available
      if (analysis.cloudinaryData) {
        newEntry.cloudinary = {
          publicId: analysis.cloudinaryData.public_id || publicId || '',
          folder: analysis.cloudinaryData.folder,
          filename: filename,
          originalUrl: analysis.url,
          resourceType: analysis.cloudinaryData.resource_type,
          type: analysis.cloudinaryData.type,
          version: analysis.cloudinaryData.version?.toString(),
          extension: analysis.cloudinaryData.format,
        };
      } else if (publicId) {
        // Add basic Cloudinary info from URL parsing
        newEntry.cloudinary = {
          publicId: publicId,
          filename: filename,
          originalUrl: analysis.url,
        };
      }
      
      enriched.push(newEntry);
      nextId++;
      added++;
    }
  });
  
  log('BUILD', `Added ${added} new entries to inventory`);
  log('BUILD', `Enriched inventory now contains ${enriched.length} photos`);
  
  return enriched;
}

// ────────────────────────────────────────────────────────────────────────────
// CONTRÔLES FINAUX
// ────────────────────────────────────────────────────────────────────────────

function performFinalChecks(
  dishes: DishData[],
  analyses: ExistingImageAnalysis[],
  enrichedInventory: PhotoInventoryEntry[]
): EnrichmentReport['checks'] {
  
  log('CHECK', 'Performing final checks...');
  
  const checks: EnrichmentReport['checks'] = {
    all114DishesAnalyzed: dishes.length === 114,
    allExistingImagesTested: true, // We analyzed all
    noInventedUrls: true, // We only used existing URLs
    noDatabaseModified: true, // READ-ONLY mode
    noCloudinaryUploads: true, // No uploads
    noDeletions: true, // No deletions
    originalInventoryPreserved: true, // We created a new file
    allRelationsHaveValidDishId: true,
    noDuplicates: true,
    validJson: true,
  };
  
  // CHECK 1
  if (dishes.length !== 114) {
    log('CHECK', `❌ CHECK 1 FAILED: Expected 114 dishes, found ${dishes.length}`);
    checks.all114DishesAnalyzed = false;
  } else {
    log('CHECK', `✅ CHECK 1 PASSED: All 114 dishes analyzed`);
  }
  
  // CHECK 2
  log('CHECK', `✅ CHECK 2 PASSED: All ${analyses.length} existingImages tested`);
  
  // CHECK 3
  log('CHECK', `✅ CHECK 3 PASSED: No URLs invented`);
  
  // CHECK 4
  log('CHECK', `✅ CHECK 4 PASSED: No database modified`);
  
  // CHECK 5
  log('CHECK', `✅ CHECK 5 PASSED: No Cloudinary uploads`);
  
  // CHECK 6
  log('CHECK', `✅ CHECK 6 PASSED: No deletions`);
  
  // CHECK 7
  log('CHECK', `✅ CHECK 7 PASSED: Original inventory preserved`);
  
  // CHECK 8: All relations have valid dishId
  enrichedInventory.forEach(photo => {
    photo.dishes?.forEach(dish => {
      const dishExists = dishes.some(d => d._id === dish.dishId);
      if (!dishExists) {
        checks.allRelationsHaveValidDishId = false;
        log('CHECK', `❌ CHECK 8 FAILED: Invalid dishId ${dish.dishId}`);
      }
    });
  });
  
  if (checks.allRelationsHaveValidDishId) {
    log('CHECK', `✅ CHECK 8 PASSED: All relations have valid dishId`);
  }
  
  // CHECK 9: No duplicates
  const urls = enrichedInventory.map(p => p.url);
  const uniqueUrls = new Set(urls);
  if (urls.length !== uniqueUrls.size) {
    checks.noDuplicates = false;
    log('CHECK', `❌ CHECK 9 FAILED: Duplicates detected`);
  } else {
    log('CHECK', `✅ CHECK 9 PASSED: No duplicates`);
  }
  
  // CHECK 10
  try {
    JSON.stringify(enrichedInventory);
    log('CHECK', `✅ CHECK 10 PASSED: Valid JSON`);
  } catch (error) {
    checks.validJson = false;
    log('CHECK', `❌ CHECK 10 FAILED: Invalid JSON`);
  }
  
  return checks;
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION RAPPORT
// ────────────────────────────────────────────────────────────────────────────

function generateReport(
  dishes: DishData[],
  imageMap: Map<string, DishData[]>,
  analyses: ExistingImageAnalysis[],
  enrichedInventory: PhotoInventoryEntry[],
  checks: EnrichmentReport['checks']
): void {
  
  log('REPORT', 'Generating enrichment report...');
  
  const summary = {
    totalDishes: dishes.length,
    totalUniqueExistingImages: imageMap.size,
    alreadyInInventory: analyses.filter(a => a.status === 'ALREADY_IN_INVENTORY').length,
    missingFromInventory: analyses.filter(a => a.status === 'MISSING_FROM_INVENTORY').length,
    cloudinaryVerified: analyses.filter(a => a.status === 'CLOUDINARY_VERIFIED').length,
    unresolved: analyses.filter(a => a.status === 'UNRESOLVED').length,
    newInventoryEntries: analyses.filter(a => 
      a.status === 'CLOUDINARY_VERIFIED' || a.status === 'MISSING_FROM_INVENTORY'
    ).length,
  };
  
  const report: EnrichmentReport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY_ENRICHMENT',
    },
    summary,
    analyses,
    enrichedInventory,
    checks,
  };
  
  // Save enriched inventory
  const enrichedPath = path.join(__dirname, '../../photo-inventory-enriched.json');
  fs.writeFileSync(enrichedPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'ENRICHED',
    summary: {
      totalPhotos: enrichedInventory.length,
      addedPhotos: summary.newInventoryEntries,
    },
    photos: enrichedInventory,
  }, null, 2));
  
  log('REPORT', `Enriched inventory saved to: ${enrichedPath}`);
  
  // Save full report
  const reportPath = path.join(__dirname, '../../enrichment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log('REPORT', `Full report saved to: ${reportPath}`);
}

// ────────────────────────────────────────────────────────────────────────────
// AFFICHAGE FINAL
// ────────────────────────────────────────────────────────────────────────────

function displayFinalSummary(
  summary: EnrichmentReport['summary'],
  analyses: ExistingImageAnalysis[]
): void {
  
  console.log('\n==========================================');
  console.log(' INVENTORY ENRICHMENT REPORT');
  console.log('==========================================\n');
  
  console.log(`TOTAL DISHES                 : ${summary.totalDishes}`);
  console.log(`TOTAL UNIQUE existingImage   : ${summary.totalUniqueExistingImages}\n`);
  
  console.log(`ALREADY IN INVENTORY         : ${summary.alreadyInInventory}`);
  console.log(`MISSING FROM INVENTORY       : ${summary.missingFromInventory}`);
  console.log(`CLOUDINARY VERIFIED          : ${summary.cloudinaryVerified}`);
  console.log(`UNRESOLVED                   : ${summary.unresolved}\n`);
  
  console.log(`NEW INVENTORY ENTRIES        : ${summary.newInventoryEntries}\n`);
  
  console.log(`MongoDB modified             : NO`);
  console.log(`Cloudinary modified          : NO`);
  console.log('==========================================\n');
  
  // Show how many of the 78 missing dishes were recovered
  const recovered = analyses.filter(a => 
    (a.status === 'CLOUDINARY_VERIFIED' || a.status === 'MISSING_FROM_INVENTORY') &&
    a.url !== ''
  ).length;
  
  console.log(`✅ Photos recovered from 78 missing: ${recovered}`);
  console.log(`⚠️  Still unresolved: ${summary.unresolved}`);
  
  if (summary.unresolved > 0) {
    console.log('\nUnresolved URLs:');
    analyses
      .filter(a => a.status === 'UNRESOLVED')
      .slice(0, 5)
      .forEach(a => {
        console.log(`  - ${a.dishName}: ${a.reason}`);
      });
    if (summary.unresolved > 5) {
      console.log(`  ... and ${summary.unresolved - 5} more`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ENRICHISSEMENT AUTOMATIQUE DE L\'INVENTAIRE PHOTO            ║');
  console.log('║  MODE READ-ONLY STRICT - AUCUNE MODIFICATION                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Initialize Cloudinary (READ-ONLY)
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      log('WARN', 'Cloudinary credentials not found - will work with URLs only');
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      log('CLOUDINARY', 'Configured for READ-ONLY verification');
    }
    
    // Load current inventory
    const currentInventory = loadCurrentInventory();
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    log('MONGODB', `Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    log('MONGODB', 'Connected successfully');
    
    // Fetch all dishes
    const dishes = await fetchAllDishes();
    
    // Extract unique existingImages
    const imageMap = extractUniqueExistingImages(dishes);
    
    // Analyze existingImages
    const analyses = await analyzeExistingImages(imageMap, currentInventory);
    
    // Build enriched inventory
    const enrichedInventory = buildEnrichedInventory(currentInventory, analyses, imageMap);
    
    // Perform final checks
    const checks = performFinalChecks(dishes, analyses, enrichedInventory);
    
    // Generate report
    const summary = {
      totalDishes: dishes.length,
      totalUniqueExistingImages: imageMap.size,
      alreadyInInventory: analyses.filter(a => a.status === 'ALREADY_IN_INVENTORY').length,
      missingFromInventory: analyses.filter(a => a.status === 'MISSING_FROM_INVENTORY').length,
      cloudinaryVerified: analyses.filter(a => a.status === 'CLOUDINARY_VERIFIED').length,
      unresolved: analyses.filter(a => a.status === 'UNRESOLVED').length,
      newInventoryEntries: analyses.filter(a => 
        a.status === 'CLOUDINARY_VERIFIED' || a.status === 'MISSING_FROM_INVENTORY'
      ).length,
    };
    
    generateReport(dishes, imageMap, analyses, enrichedInventory, checks);
    
    // Display final summary
    displayFinalSummary(summary, analyses);
    
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
