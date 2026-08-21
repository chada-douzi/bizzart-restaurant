/**
 * ============================================================================
 * PHASE 1.5 — AUDIT EXHAUSTIF DES SOURCES D'IMAGES
 * MODE READ-ONLY STRICT
 * ============================================================================
 * 
 * Mission: Inventaire exhaustif de TOUTES les sources d'images disponibles
 * avant toute validation humaine.
 * 
 * RÈGLES ABSOLUES:
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune suppression
 * ✅ Inventaire exhaustif uniquement
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface CloudinaryUrl {
  originalUrl: string;
  cloudName: string;
  resourceType: string;
  type: string;
  version?: string;
  publicId: string;
  extension?: string;
  folder?: string;
  filename: string;
}

interface ImageSource {
  url: string;
  cloudinary?: CloudinaryUrl;
  sourceFile: string;
  sourceType: 'mongodb' | 'json' | 'typescript' | 'javascript' | 'html' | 'csv' | 'markdown' | 'env' | 'other';
  context?: string;
  dishId?: string;
  dishName?: string;
  category?: string;
}

interface DishImageData {
  _id: string;
  nameFr: string;
  nameEn?: string;
  categoryName: string;
  slug: string;
  imageField: string;
  imageUrl: string;
  cloudinary?: CloudinaryUrl;
}

interface HistoricalValidation {
  menuItemId: string;
  nameFr: string;
  category: string;
  currentImage: string;
  validatedImage: string | null;
  status: 'validated' | 'pending';
  duplicate: boolean;
  professionalFilename?: string;
}

interface PhotoInventoryComplete {
  id: string;
  url: string;
  filename: string;
  cloudinary?: CloudinaryUrl;
  sources: string[];
  sourceTypes: string[];
  dishes: Array<{
    dishId: string;
    dishName: string;
    relationship: 'current' | 'historical' | 'proposed';
  }>;
  historicalValidation?: 'VALIDATED' | 'PENDING' | 'REJECTED';
  duplicateOf?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// LOGGING
// ────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  console.log(`[${phase}] ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// CLOUDINARY URL PARSER
// ────────────────────────────────────────────────────────────────────────────

function parseCloudinaryUrl(url: string): CloudinaryUrl | undefined {
  // Pattern: https://res.cloudinary.com/{cloud_name}/{resource_type}/{type}/v{version}/{public_id}.{extension}
  const cloudinaryPattern = /https?:\/\/res\.cloudinary\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/v(\d+))?\/(.+?)(?:\.(jpg|jpeg|png|gif|webp|svg|bmp))?$/i;
  
  const match = url.match(cloudinaryPattern);
  
  if (!match) return undefined;
  
  const [, cloudName, resourceType, type, version, publicIdPath, extension] = match;
  
  // Extract folder and filename from publicId
  const parts = publicIdPath.split('/');
  const filename = parts[parts.length - 1];
  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;
  
  return {
    originalUrl: url,
    cloudName,
    resourceType,
    type,
    version,
    publicId: publicIdPath,
    extension,
    folder,
    filename,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// EXTRACTION MONGODB
// ────────────────────────────────────────────────────────────────────────────

async function extractMongoDBImages(): Promise<DishImageData[]> {
  log('MONGODB', 'Extracting ALL image URLs from 114 dishes...');
  
  const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({}).populate('category').sort({ category: 1, order: 1 }).lean();
  
  log('MONGODB', `Found ${items.length} menu items`);
  
  const dishImages: DishImageData[] = [];
  
  items.forEach(item => {
    if (item.image) {
      const cloudinary = parseCloudinaryUrl(item.image);
      
      dishImages.push({
        _id: item._id.toString(),
        nameFr: item.name.fr,
        nameEn: item.name.en,
        categoryName: categoryMap.get(item.category._id.toString()) || 'Unknown',
        slug: item.slug,
        imageField: 'image',
        imageUrl: item.image,
        cloudinary,
      });
    }
  });
  
  log('MONGODB', `Extracted ${dishImages.length} image URLs`);
  
  // Count unique URLs
  const uniqueUrls = new Set(dishImages.map(d => d.imageUrl));
  log('MONGODB', `Unique URLs: ${uniqueUrls.size}`);
  
  // Count Cloudinary vs non-Cloudinary
  const cloudinaryUrls = dishImages.filter(d => d.cloudinary);
  log('MONGODB', `Cloudinary URLs: ${cloudinaryUrls.length}`);
  log('MONGODB', `Non-Cloudinary URLs: ${dishImages.length - cloudinaryUrls.length}`);
  
  // Detect duplicates
  const urlCounts = new Map<string, number>();
  dishImages.forEach(d => {
    urlCounts.set(d.imageUrl, (urlCounts.get(d.imageUrl) || 0) + 1);
  });
  
  const duplicates = Array.from(urlCounts.entries()).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    log('MONGODB', `⚠️  CURRENT_MAPPING_CONFLICTS detected:`);
    duplicates.forEach(([url, count]) => {
      log('MONGODB', `   ${url} → used by ${count} dishes`);
    });
  }
  
  return dishImages;
}

// ────────────────────────────────────────────────────────────────────────────
// EXTRACTION FICHIERS PROJET
// ────────────────────────────────────────────────────────────────────────────

function extractUrlsFromFile(filePath: string): string[] {
  const urls: string[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Pattern pour Cloudinary URLs
    const cloudinaryPattern = /https?:\/\/res\.cloudinary\.com\/[^\s"'`<>)]+/gi;
    const matches = content.match(cloudinaryPattern);
    
    if (matches) {
      urls.push(...matches);
    }
  } catch (error) {
    // Ignore binary or inaccessible files
  }
  
  return urls;
}

function scanRecursively(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules, dist, build, .angular
      if (entry.name === 'node_modules' || entry.name === 'dist' || 
          entry.name === 'build' || entry.name === '.angular') {
        continue;
      }
      
      if (entry.isDirectory()) {
        results.push(...scanRecursively(fullPath, extensions));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't access
  }
  
  return results;
}

function scanProjectForCloudinaryUrls(): ImageSource[] {
  log('SCAN', 'Scanning project files for Cloudinary URLs...');
  
  const rootDir = path.join(__dirname, '../../..');
  const sources: ImageSource[] = [];
  const seenUrls = new Set<string>();
  
  // Extensions to scan
  const extensions = ['.json', '.ts', '.js', '.html', '.csv', '.md', '.env'];
  
  // Scan backend and frontend
  const dirsToScan = [
    path.join(rootDir, 'backend'),
    path.join(rootDir, 'frontend'),
  ];
  
  let filesScanned = 0;
  let urlsFound = 0;
  
  dirsToScan.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = scanRecursively(dir, extensions);
      
      files.forEach((filePath: string) => {
        filesScanned++;
        
        const urls = extractUrlsFromFile(filePath);
        
        urls.forEach(url => {
          const normalized = url.trim();
          
          if (!seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            urlsFound++;
            
            const relativePath = path.relative(rootDir, filePath);
            const ext = path.extname(filePath).toLowerCase();
            
            let sourceType: ImageSource['sourceType'] = 'other';
            if (ext === '.json') sourceType = 'json';
            else if (ext === '.ts') sourceType = 'typescript';
            else if (ext === '.js') sourceType = 'javascript';
            else if (ext === '.html') sourceType = 'html';
            else if (ext === '.csv') sourceType = 'csv';
            else if (ext === '.md') sourceType = 'markdown';
            else if (ext === '.env') sourceType = 'env';
            
            sources.push({
              url: normalized,
              cloudinary: parseCloudinaryUrl(normalized),
              sourceFile: relativePath,
              sourceType,
            });
          }
        });
      });
    }
  });
  
  log('SCAN', `Scanned ${filesScanned} files`);
  log('SCAN', `Found ${urlsFound} unique Cloudinary URLs in project files`);
  
  return sources;
}

// ────────────────────────────────────────────────────────────────────────────
// EXTRACTION IMAGES LOCALES
// ────────────────────────────────────────────────────────────────────────────

function scanLocalImages(): ImageSource[] {
  log('SCAN', 'Scanning local image directories...');
  
  const rootDir = path.join(__dirname, '../../..');
  const sources: ImageSource[] = [];
  
  const imageDirs = [
    'menu-images',
    'backend/menu-category-images',
    'frontend/src/assets/images',
    'frontend/public/images',
  ];
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  
  imageDirs.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    
    if (fs.existsSync(fullPath)) {
      const files = scanRecursively(fullPath, imageExtensions);
      
      files.forEach((file: string) => {
        const relativePath = path.relative(rootDir, file);
        sources.push({
          url: file,
          sourceFile: relativePath,
          sourceType: 'other',
          context: 'local-file',
        });
      });
      
      log('SCAN', `Found ${files.length} local images in ${dir}`);
    }
  });
  
  log('SCAN', `Total local images: ${sources.length}`);
  
  return sources;
}

// ────────────────────────────────────────────────────────────────────────────
// EXTRACTION HISTORIQUE VALIDATIONS
// ────────────────────────────────────────────────────────────────────────────

function loadHistoricalValidations(): Map<string, HistoricalValidation> {
  log('AUDIT', 'Loading historical validations...');
  
  const validationFiles = [
    'backend/validation-exports/bizzart-photo-validation-2026-08-18.json',
    'backend/AUDIT-VISUEL-98-PLATS.json',
    'backend/AUDIT-VISUEL-AI-FINAL-2026-08-19.json',
  ];
  
  const rootDir = path.join(__dirname, '../../..');
  const historyMap = new Map<string, HistoricalValidation>();
  
  validationFiles.forEach(file => {
    const fullPath = path.join(rootDir, file);
    
    if (fs.existsSync(fullPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        
        if (data.validations && Array.isArray(data.validations)) {
          data.validations.forEach((item: HistoricalValidation) => {
            historyMap.set(item.menuItemId, item);
          });
          
          log('AUDIT', `Loaded ${data.validations.length} validations from ${path.basename(file)}`);
        }
      } catch (error) {
        log('AUDIT', `⚠️  Could not parse ${file}`);
      }
    }
  });
  
  log('AUDIT', `Total historical validations: ${historyMap.size}`);
  
  return historyMap;
}

// ────────────────────────────────────────────────────────────────────────────
// ANALYSE DOUBLONS HISTORIQUES
// ────────────────────────────────────────────────────────────────────────────

interface DuplicateAnalysis {
  url: string;
  dishes: Array<{
    dishId: string;
    dishName: string;
    category: string;
    status: string;
  }>;
  count: number;
}

function analyzeHistoricalDuplicates(history: Map<string, HistoricalValidation>): DuplicateAnalysis[] {
  log('AUDIT', 'Analyzing historical duplicates...');
  
  const duplicates = Array.from(history.values()).filter(h => h.duplicate);
  log('AUDIT', `Found ${duplicates.length} items marked as duplicate`);
  
  // Group by currentImage
  const imageGroups = new Map<string, HistoricalValidation[]>();
  
  history.forEach(item => {
    if (item.currentImage) {
      if (!imageGroups.has(item.currentImage)) {
        imageGroups.set(item.currentImage, []);
      }
      imageGroups.get(item.currentImage)!.push(item);
    }
  });
  
  const duplicateGroups: DuplicateAnalysis[] = [];
  
  imageGroups.forEach((items, url) => {
    if (items.length > 1) {
      duplicateGroups.push({
        url,
        dishes: items.map(item => ({
          dishId: item.menuItemId,
          dishName: item.nameFr,
          category: item.category,
          status: item.status,
        })),
        count: items.length,
      });
    }
  });
  
  log('AUDIT', `Found ${duplicateGroups.length} photos assigned to multiple dishes historically`);
  
  // Show top conflicts
  const sorted = duplicateGroups.sort((a, b) => b.count - a.count).slice(0, 10);
  sorted.forEach(dup => {
    log('AUDIT', `   ${path.basename(dup.url)} → ${dup.count} dishes: ${dup.dishes.map(d => d.dishName).slice(0, 3).join(', ')}${dup.count > 3 ? '...' : ''}`);
  });
  
  return duplicateGroups;
}

// ────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION INVENTAIRE COMPLET
// ────────────────────────────────────────────────────────────────────────────

function buildCompleteInventory(
  dishImages: DishImageData[],
  projectSources: ImageSource[],
  localImages: ImageSource[],
  history: Map<string, HistoricalValidation>
): PhotoInventoryComplete[] {
  log('INVENTORY', 'Building complete photo inventory...');
  
  const inventory: PhotoInventoryComplete[] = [];
  const urlToPhoto = new Map<string, PhotoInventoryComplete>();
  let photoIdCounter = 1;
  
  // Helper to add or update photo
  const addPhoto = (
    url: string,
    source: string,
    sourceType: string,
    dishId?: string,
    dishName?: string,
    relationship?: 'current' | 'historical' | 'proposed'
  ): void => {
    let photo = urlToPhoto.get(url);
    
    if (!photo) {
      const cloudinary = parseCloudinaryUrl(url);
      const filename = cloudinary?.filename || path.basename(url);
      
      photo = {
        id: `photo_${photoIdCounter++}`,
        url,
        filename,
        cloudinary,
        sources: [],
        sourceTypes: [],
        dishes: [],
      };
      
      urlToPhoto.set(url, photo);
      inventory.push(photo);
    }
    
    if (!photo.sources.includes(source)) {
      photo.sources.push(source);
    }
    
    if (!photo.sourceTypes.includes(sourceType)) {
      photo.sourceTypes.push(sourceType);
    }
    
    if (dishId && dishName && relationship) {
      const existing = photo.dishes.find(d => d.dishId === dishId);
      if (!existing) {
        photo.dishes.push({ dishId, dishName, relationship });
      }
    }
  };
  
  // 1. Add MongoDB images
  log('INVENTORY', 'Adding MongoDB images...');
  dishImages.forEach(dish => {
    addPhoto(dish.imageUrl, 'MongoDB', 'mongodb', dish._id, dish.nameFr, 'current');
  });
  
  // 2. Add historical validations
  log('INVENTORY', 'Adding historical validation images...');
  history.forEach(item => {
    if (item.currentImage) {
      addPhoto(item.currentImage, 'validation-export', 'json', item.menuItemId, item.nameFr, 'historical');
    }
    
    if (item.validatedImage) {
      addPhoto(item.validatedImage, 'validation-export', 'json', item.menuItemId, item.nameFr, 'historical');
      
      // Mark as historically validated
      const photoObj = urlToPhoto.get(item.validatedImage);
      if (photoObj && item.status === 'validated') {
        photoObj.historicalValidation = 'VALIDATED';
      }
    }
  });
  
  // 3. Add project file URLs
  log('INVENTORY', 'Adding project file URLs...');
  projectSources.forEach(source => {
    addPhoto(source.url, source.sourceFile, source.sourceType);
  });
  
  // 4. Add local images
  log('INVENTORY', 'Adding local images...');
  localImages.forEach(source => {
    addPhoto(source.url, source.sourceFile, 'local');
  });
  
  log('INVENTORY', `Complete inventory: ${inventory.length} unique photos`);
  
  // Detect duplicates by publicId
  const publicIdMap = new Map<string, PhotoInventoryComplete[]>();
  
  inventory.forEach(photo => {
    if (photo.cloudinary) {
      const publicId = photo.cloudinary.publicId;
      if (!publicIdMap.has(publicId)) {
        publicIdMap.set(publicId, []);
      }
      publicIdMap.get(publicId)!.push(photo);
    }
  });
  
  let duplicatesByPublicId = 0;
  publicIdMap.forEach((photos, publicId) => {
    if (photos.length > 1) {
      duplicatesByPublicId++;
      // Mark all but first as duplicates
      for (let i = 1; i < photos.length; i++) {
        photos[i].duplicateOf = photos[0].id;
      }
    }
  });
  
  if (duplicatesByPublicId > 0) {
    log('INVENTORY', `⚠️  Found ${duplicatesByPublicId} duplicate publicIds`);
  }
  
  return inventory;
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION RAPPORTS
// ────────────────────────────────────────────────────────────────────────────

function generateInventoryReports(
  dishImages: DishImageData[],
  inventory: PhotoInventoryComplete[],
  projectSources: ImageSource[],
  localImages: ImageSource[],
  history: Map<string, HistoricalValidation>,
  duplicates: DuplicateAnalysis[]
): void {
  const rootDir = path.join(__dirname, '../..');
  
  // 1. Photo inventory complete
  log('REPORT', 'Generating photo-inventory-complete.json...');
  fs.writeFileSync(
    path.join(rootDir, 'photo-inventory-complete.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY',
      summary: {
        totalPhotos: inventory.length,
        cloudinaryPhotos: inventory.filter(p => p.cloudinary).length,
        localPhotos: inventory.filter(p => !p.cloudinary).length,
        historicallyValidated: inventory.filter(p => p.historicalValidation === 'VALIDATED').length,
        duplicatePhotos: inventory.filter(p => p.duplicateOf).length,
      },
      photos: inventory,
    }, null, 2)
  );
  
  // 2. Cloudinary inventory
  log('REPORT', 'Generating cloudinary-inventory-complete.json...');
  const cloudinaryPhotos = inventory.filter(p => p.cloudinary);
  fs.writeFileSync(
    path.join(rootDir, 'cloudinary-inventory-complete.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY',
      totalCloudinaryPhotos: cloudinaryPhotos.length,
      photos: cloudinaryPhotos.map(p => ({
        id: p.id,
        url: p.url,
        publicId: p.cloudinary!.publicId,
        folder: p.cloudinary!.folder,
        filename: p.cloudinary!.filename,
        sources: p.sources,
        dishes: p.dishes,
        historicalValidation: p.historicalValidation,
      })),
    }, null, 2)
  );
  
  // 3. Photo source audit
  log('REPORT', 'Generating photo-source-audit.json...');
  fs.writeFileSync(
    path.join(rootDir, 'photo-source-audit.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY',
      mongodb: {
        totalDishes: dishImages.length,
        uniqueUrls: new Set(dishImages.map(d => d.imageUrl)).size,
        cloudinaryUrls: dishImages.filter(d => d.cloudinary).length,
        dishes: dishImages,
      },
      projectFiles: {
        totalSources: projectSources.length,
        uniqueUrls: new Set(projectSources.map(s => s.url)).size,
        sources: projectSources,
      },
      localImages: {
        totalImages: localImages.length,
        images: localImages,
      },
      historicalValidations: {
        total: history.size,
        validated: Array.from(history.values()).filter(h => h.status === 'validated').length,
        pending: Array.from(history.values()).filter(h => h.status === 'pending').length,
        duplicates: Array.from(history.values()).filter(h => h.duplicate).length,
        items: Array.from(history.values()),
      },
      duplicateAnalysis: {
        historicalConflicts: duplicates.length,
        details: duplicates,
      },
    }, null, 2)
  );
  
  log('REPORT', 'All inventory reports generated successfully');
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1.5 — AUDIT EXHAUSTIF DES SOURCES D\'IMAGES            ║');
  console.log('║  MODE READ-ONLY STRICT                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    log('SCAN', `Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    log('SCAN', 'MongoDB connected successfully');
    
    // Step 1: Extract MongoDB images
    const dishImages = await extractMongoDBImages();
    
    // Step 2: Scan project files for Cloudinary URLs
    const projectSources = scanProjectForCloudinaryUrls();
    
    // Step 3: Scan local images
    const localImages = scanLocalImages();
    
    // Step 4: Load historical validations
    const history = loadHistoricalValidations();
    
    // Step 5: Analyze historical duplicates
    const duplicates = analyzeHistoricalDuplicates(history);
    
    // Step 6: Build complete inventory
    const inventory = buildCompleteInventory(dishImages, projectSources, localImages, history);
    
    // Step 7: Generate reports
    generateInventoryReports(dishImages, inventory, projectSources, localImages, history, duplicates);
    
    // Final summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  RAPPORT FINAL — SOURCE INVENTORY                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log('SOURCE INVENTORY');
    console.log('----------------');
    console.log(`MongoDB image URLs: ${dishImages.length}`);
    console.log(`  • Unique URLs: ${new Set(dishImages.map(d => d.imageUrl)).size}`);
    console.log(`  • Cloudinary URLs: ${dishImages.filter(d => d.cloudinary).length}`);
    
    console.log(`\nCloudinary URLs found in project: ${projectSources.length}`);
    console.log(`  • JSON files: ${projectSources.filter(s => s.sourceType === 'json').length}`);
    console.log(`  • TypeScript files: ${projectSources.filter(s => s.sourceType === 'typescript').length}`);
    console.log(`  • JavaScript files: ${projectSources.filter(s => s.sourceType === 'javascript').length}`);
    console.log(`  • HTML files: ${projectSources.filter(s => s.sourceType === 'html').length}`);
    console.log(`  • Other files: ${projectSources.filter(s => !['json', 'typescript', 'javascript', 'html'].includes(s.sourceType)).length}`);
    
    console.log(`\nHistorical validations: ${history.size}`);
    console.log(`  • Validated: ${Array.from(history.values()).filter(h => h.status === 'validated').length}`);
    console.log(`  • Pending: ${Array.from(history.values()).filter(h => h.status === 'pending').length}`);
    
    console.log(`\nLocal images: ${localImages.length}`);
    
    console.log(`\nUnique photos in complete inventory: ${inventory.length}`);
    console.log(`  • Cloudinary: ${inventory.filter(p => p.cloudinary).length}`);
    console.log(`  • Local: ${inventory.filter(p => !p.cloudinary).length}`);
    console.log(`  • Historically validated: ${inventory.filter(p => p.historicalValidation === 'VALIDATED').length}`);
    console.log(`  • Duplicates by publicId: ${inventory.filter(p => p.duplicateOf).length}`);
    
    console.log('\nCONFLICTS');
    console.log('---------');
    
    // Current mapping conflicts
    const urlCounts = new Map<string, DishImageData[]>();
    dishImages.forEach(d => {
      if (!urlCounts.has(d.imageUrl)) {
        urlCounts.set(d.imageUrl, []);
      }
      urlCounts.get(d.imageUrl)!.push(d);
    });
    const currentConflicts = Array.from(urlCounts.values()).filter(dishes => dishes.length > 1);
    console.log(`Current mapping conflicts: ${currentConflicts.length}`);
    
    // Historical duplicates
    console.log(`Historical duplicates: ${duplicates.length}`);
    console.log(`  • Items marked duplicate in history: ${Array.from(history.values()).filter(h => h.duplicate).length}`);
    
    console.log('\nMISSING');
    console.log('-------');
    
    const dishesWithoutPhoto = dishImages.filter(d => !d.imageUrl || d.imageUrl.trim() === '');
    console.log(`Dishes without image URL: ${dishesWithoutPhoto.length}`);
    
    const photosWithoutDish = inventory.filter(p => p.dishes.length === 0);
    console.log(`Photos without dish assignment: ${photosWithoutDish.length}`);
    
    console.log('\n📁 FICHIERS CRÉÉS:');
    console.log(`   ${path.join(__dirname, '../../photo-inventory-complete.json')}`);
    console.log(`   ${path.join(__dirname, '../../cloudinary-inventory-complete.json')}`);
    console.log(`   ${path.join(__dirname, '../../photo-source-audit.json')}`);
    
    console.log('\n✅ Audit exhaustif terminé avec succès!');
    console.log('   Phase 1.5 complétée. Prêt pour reconstruction mapping v2.\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('SCAN', 'MongoDB disconnected');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// RUN
// ────────────────────────────────────────────────────────────────────────────

main();
