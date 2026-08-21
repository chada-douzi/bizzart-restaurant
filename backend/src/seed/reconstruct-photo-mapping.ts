/**
 * ============================================================================
 * RECONSTRUCTION AUTOMATIQUE DU MAPPING PHOTOS ↔ PLATS BIZZ'ART
 * MODE READ-ONLY STRICT
 * ============================================================================
 * 
 * Mission: Reconstruire le mapping entre les plats MongoDB et les photos
 * disponibles avec scoring de confiance et validation humaine.
 * 
 * RÈGLES ABSOLUES:
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune suppression d'image
 * ✅ Analyse READ-ONLY uniquement
 * ✅ Export pour validation humaine
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface PhotoInventory {
  id: string;
  filename: string;
  url: string;
  source: 'cloudinary' | 'local' | 'validation';
  folder?: string;
  format?: string;
  publicId?: string;
  bytes?: number;
  width?: number;
  height?: number;
  createdAt?: string;
}

interface DishData {
  _id: string;
  nameFr: string;
  nameEn?: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  currentImage: string;
  slug: string;
  tags: string[];
  allergens: string[];
}

interface ValidationHistoryItem {
  menuItemId: string;
  nameFr: string;
  category: string;
  currentImage: string;
  validatedImage: string | null;
  status: 'validated' | 'pending';
  duplicate: boolean;
}

interface MatchScore {
  photo: PhotoInventory;
  totalScore: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH';
  details: {
    nameScore: number;
    categoryScore: number;
    descriptionScore: number;
    metadataScore: number;
    historyScore: number;
  };
  reasons: string[];
}

interface DishMapping {
  dish: DishData;
  currentPhoto?: PhotoInventory;
  proposedMatches: MatchScore[];
  bestMatch?: MatchScore;
  status: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'NO_MATCH' | 'CONFLICT';
  conflicts?: string[];
}

interface PhotoConflict {
  photo: PhotoInventory;
  dishes: Array<{
    dishId: string;
    dishName: string;
    score: number;
  }>;
  scoreDifference: number;
}

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  NAME: 0.30,        // 30%
  CATEGORY: 0.20,    // 20%
  DESCRIPTION: 0.15, // 15%
  METADATA: 0.10,    // 10%
  HISTORY: 0.25,     // 25%
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 65,
  LOW: 40,
};

// ────────────────────────────────────────────────────────────────────────────
// NORMALISATION
// ────────────────────────────────────────────────────────────────────────────

const ALIASES: Record<string, string[]> = {
  'pizza': ['pizza', 'pizzas'],
  'pates': ['pates', 'pasta', 'pâtes', 'spaghetti', 'tagliatelle'],
  'poulet': ['poulet', 'chicken', 'pollo', 'escalope'],
  'viande': ['viande', 'meat', 'steak', 'boeuf', 'beef'],
  'poisson': ['poisson', 'fish', 'saumon', 'salmon', 'thon', 'tuna'],
  'crevettes': ['crevettes', 'shrimp', 'gambas', 'chevrettes'],
  'fruits-mer': ['fruits', 'mer', 'seafood', 'frutti', 'mare'],
  'salade': ['salade', 'salad', 'insalata'],
  'tacos': ['tacos', 'taco'],
  'paella': ['paella', 'paëlla'],
  'risotto': ['risotto'],
  'bolognaise': ['bolognaise', 'bolognese'],
  'margherita': ['margherita', 'margarita'],
  'fromage': ['fromage', 'cheese', 'formaggio', 'fromages'],
  'tomate': ['tomate', 'tomato', 'pomodoro'],
  'grille': ['grille', 'grillé', 'grilled'],
  'frites': ['frites', 'fries', 'patate'],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(text: string): string[] {
  return normalize(text).split(/\s+/).filter(t => t.length > 2);
}

function expandWithAliases(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  
  tokens.forEach(token => {
    Object.entries(ALIASES).forEach(([key, variants]) => {
      if (variants.some(v => token.includes(v) || v.includes(token))) {
        variants.forEach(v => expanded.add(v));
      }
    });
  });
  
  return Array.from(expanded);
}

// ────────────────────────────────────────────────────────────────────────────
// LOGGING
// ────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  console.log(`[${phase}] ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// INVENTAIRE PHOTOS
// ────────────────────────────────────────────────────────────────────────────

async function buildPhotoInventory(dishes?: DishData[]): Promise<PhotoInventory[]> {
  log('SCAN', 'Building photo inventory...');
  const photos: PhotoInventory[] = [];
  let photoIdCounter = 1;
  const seenUrls = new Set<string>();

  // 1. Photos depuis validation exports
  const validationExportPath = path.join(__dirname, '../../validation-exports/bizzart-photo-validation-2026-08-18.json');
  
  if (fs.existsSync(validationExportPath)) {
    log('SCAN', 'Reading validation export...');
    const validationData = JSON.parse(fs.readFileSync(validationExportPath, 'utf-8'));
    
    if (validationData.validations) {
      validationData.validations.forEach((item: ValidationHistoryItem) => {
        if (item.currentImage && !seenUrls.has(item.currentImage)) {
          seenUrls.add(item.currentImage);
          const filename = item.currentImage.split('/').pop() || '';
          photos.push({
            id: `photo_${photoIdCounter++}`,
            filename,
            url: item.currentImage,
            source: 'validation',
          });
        }
        
        if (item.validatedImage && !seenUrls.has(item.validatedImage)) {
          seenUrls.add(item.validatedImage);
          const filename = item.validatedImage.split('/').pop() || '';
          photos.push({
            id: `photo_${photoIdCounter++}`,
            filename,
            url: item.validatedImage,
            source: 'validation',
          });
        }
      });
      
      log('SCAN', `Found ${photos.length} photos from validation export`);
    }
  }

  // 2. Photos depuis les plats existants (current images)
  if (dishes) {
    log('SCAN', 'Extracting photos from current dish assignments...');
    dishes.forEach(dish => {
      if (dish.currentImage && !seenUrls.has(dish.currentImage)) {
        seenUrls.add(dish.currentImage);
        const filename = dish.currentImage.split('/').pop() || '';
        photos.push({
          id: `photo_${photoIdCounter++}`,
          filename,
          url: dish.currentImage,
          source: 'cloudinary',
        });
      }
    });
    log('SCAN', `Extracted ${seenUrls.size - photos.length} additional photos from dish assignments`);
  }

  // 3. Photos locales (menu-images)
  const localImageDirs = [
    path.join(__dirname, '../../../menu-images'),
    path.join(__dirname, '../../menu-category-images'),
  ];

  localImageDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
          const fullPath = path.join(dir, file);
          if (!seenUrls.has(fullPath)) {
            photos.push({
              id: `photo_${photoIdCounter++}`,
              filename: file,
              url: fullPath,
              source: 'local',
              folder: path.basename(dir),
            });
          }
        }
      });
      log('SCAN', `Found ${files.length} files in ${path.basename(dir)}`);
    }
  });

  log('SCAN', `Total photos in inventory: ${photos.length}`);
  return photos;
}

// ────────────────────────────────────────────────────────────────────────────
// RÉCUPÉRATION PLATS MONGODB
// ────────────────────────────────────────────────────────────────────────────

async function fetchDishes(): Promise<DishData[]> {
  log('SCAN', 'Fetching dishes from MongoDB...');
  
  const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({})
    .populate('category')
    .sort({ category: 1, order: 1 })
    .lean();
  
  log('SCAN', `Found ${items.length} menu items`);
  
  const dishes: DishData[] = items.map(item => ({
    _id: item._id.toString(),
    nameFr: item.name.fr,
    nameEn: item.name.en,
    categoryId: item.category._id.toString(),
    categoryName: categoryMap.get(item.category._id.toString()) || 'Unknown',
    description: item.description?.fr,
    descriptionEn: item.description?.en,
    price: item.price,
    currentImage: item.image,
    slug: item.slug,
    tags: item.tags || [],
    allergens: item.allergens || [],
  }));
  
  return dishes;
}

// ────────────────────────────────────────────────────────────────────────────
// CHARGEMENT HISTORIQUE VALIDATION
// ────────────────────────────────────────────────────────────────────────────

function loadValidationHistory(): Map<string, ValidationHistoryItem> {
  log('AUDIT', 'Loading validation history...');
  
  const validationExportPath = path.join(__dirname, '../../validation-exports/bizzart-photo-validation-2026-08-18.json');
  const historyMap = new Map<string, ValidationHistoryItem>();
  
  if (fs.existsSync(validationExportPath)) {
    const validationData = JSON.parse(fs.readFileSync(validationExportPath, 'utf-8'));
    
    if (validationData.validations) {
      validationData.validations.forEach((item: ValidationHistoryItem) => {
        historyMap.set(item.menuItemId, item);
      });
      
      log('AUDIT', `Loaded ${historyMap.size} validation records`);
    }
  }
  
  return historyMap;
}

// ────────────────────────────────────────────────────────────────────────────
// SCORING SYSTEM
// ────────────────────────────────────────────────────────────────────────────

function calculateNameScore(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  const dishTokens = expandWithAliases(getTokens(dish.nameFr));
  const photoTokens = expandWithAliases(getTokens(photo.filename));
  
  const commonTokens = dishTokens.filter(dt => 
    photoTokens.some(pt => pt.includes(dt) || dt.includes(pt))
  );
  
  if (commonTokens.length > 0) {
    score = (commonTokens.length / Math.max(dishTokens.length, photoTokens.length)) * 100;
    reasons.push(`${commonTokens.length} mots communs: ${commonTokens.slice(0, 3).join(', ')}`);
  }
  
  return { score: Math.min(score, 100), reasons };
}

function calculateCategoryScore(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  const categoryTokens = getTokens(dish.categoryName);
  const photoTokens = getTokens(photo.filename);
  const folderTokens = photo.folder ? getTokens(photo.folder) : [];
  
  const allPhotoTokens = [...photoTokens, ...folderTokens];
  
  const matches = categoryTokens.filter(ct =>
    allPhotoTokens.some(pt => pt.includes(ct) || ct.includes(pt))
  );
  
  if (matches.length > 0) {
    score = 80;
    reasons.push(`Catégorie "${dish.categoryName}" trouvée dans ${photo.folder || photo.filename}`);
  }
  
  return { score, reasons };
}

function calculateDescriptionScore(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  if (!dish.description) return { score, reasons };
  
  const descTokens = getTokens(dish.description);
  const photoTokens = expandWithAliases(getTokens(photo.filename));
  
  const keywords = ['tomate', 'fromage', 'poulet', 'viande', 'poisson', 'crevette', 'champignon', 'creme', 'sauce'];
  
  const foundKeywords = descTokens.filter(dt =>
    keywords.includes(dt) && photoTokens.some(pt => pt.includes(dt) || dt.includes(pt))
  );
  
  if (foundKeywords.length > 0) {
    score = Math.min(foundKeywords.length * 30, 100);
    reasons.push(`Ingrédients trouvés: ${foundKeywords.slice(0, 3).join(', ')}`);
  }
  
  return { score, reasons };
}

function calculateMetadataScore(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50; // score neutre
  
  // Bonus si photo de bonne qualité
  if (photo.width && photo.width >= 800) {
    score += 20;
    reasons.push('Haute résolution');
  }
  
  // Bonus si format approprié
  if (photo.format && ['jpg', 'jpeg', 'png'].includes(photo.format.toLowerCase())) {
    score += 15;
    reasons.push('Format approprié');
  }
  
  // Pénalité si photo stock évidente
  if (/stock|generic|placeholder|default/i.test(photo.filename)) {
    score = 10;
    reasons.push('⚠️ Photo stock détectée');
  }
  
  return { score: Math.min(score, 100), reasons };
}

function calculateHistoryScore(
  dish: DishData,
  photo: PhotoInventory,
  validationHistory: Map<string, ValidationHistoryItem>
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  const history = validationHistory.get(dish._id);
  
  if (!history) {
    return { score: 50, reasons: ['Aucun historique'] }; // score neutre
  }
  
  // Si photo validée pour ce plat
  if (history.status === 'validated' && history.validatedImage === photo.url) {
    score = 100;
    reasons.push('✓ Photo VALIDÉE dans l\'audit précédent');
    return { score, reasons };
  }
  
  // Si photo actuelle correspond
  if (history.currentImage === photo.url) {
    score = 40;
    reasons.push('Photo actuellement assignée');
  }
  
  // Pénalité si marquée comme doublon
  if (history.duplicate) {
    score = Math.max(score - 30, 0);
    reasons.push('⚠️ Marquée comme doublon');
  }
  
  return { score, reasons };
}

function calculateMatch(
  dish: DishData,
  photo: PhotoInventory,
  validationHistory: Map<string, ValidationHistoryItem>
): MatchScore {
  const nameResult = calculateNameScore(dish, photo);
  const categoryResult = calculateCategoryScore(dish, photo);
  const descriptionResult = calculateDescriptionScore(dish, photo);
  const metadataResult = calculateMetadataScore(dish, photo);
  const historyResult = calculateHistoryScore(dish, photo, validationHistory);
  
  const totalScore =
    nameResult.score * WEIGHTS.NAME +
    categoryResult.score * WEIGHTS.CATEGORY +
    descriptionResult.score * WEIGHTS.DESCRIPTION +
    metadataResult.score * WEIGHTS.METADATA +
    historyResult.score * WEIGHTS.HISTORY;
  
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH';
  if (totalScore >= CONFIDENCE_THRESHOLDS.HIGH) confidence = 'HIGH';
  else if (totalScore >= CONFIDENCE_THRESHOLDS.MEDIUM) confidence = 'MEDIUM';
  else if (totalScore >= CONFIDENCE_THRESHOLDS.LOW) confidence = 'LOW';
  else confidence = 'NO_MATCH';
  
  return {
    photo,
    totalScore: Math.round(totalScore * 10) / 10,
    confidence,
    details: {
      nameScore: Math.round(nameResult.score * 10) / 10,
      categoryScore: Math.round(categoryResult.score * 10) / 10,
      descriptionScore: Math.round(descriptionResult.score * 10) / 10,
      metadataScore: Math.round(metadataResult.score * 10) / 10,
      historyScore: Math.round(historyResult.score * 10) / 10,
    },
    reasons: [
      ...nameResult.reasons,
      ...categoryResult.reasons,
      ...descriptionResult.reasons,
      ...metadataResult.reasons,
      ...historyResult.reasons,
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// MATCHING ENGINE
// ────────────────────────────────────────────────────────────────────────────

function performMatching(
  dishes: DishData[],
  photos: PhotoInventory[],
  validationHistory: Map<string, ValidationHistoryItem>
): DishMapping[] {
  log('SCORE', 'Computing photo-dish matches...');
  
  const mappings: DishMapping[] = [];
  
  dishes.forEach((dish, index) => {
    if (index % 20 === 0) {
      log('SCORE', `Processing dish ${index + 1}/${dishes.length}...`);
    }
    
    const currentPhoto = photos.find(p => p.url === dish.currentImage);
    
    const matches = photos
      .map(photo => calculateMatch(dish, photo, validationHistory))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5); // top 5 matches
    
    const bestMatch = matches[0];
    
    let status: DishMapping['status'];
    if (bestMatch.confidence === 'HIGH') status = 'HIGH_CONFIDENCE';
    else if (bestMatch.confidence === 'MEDIUM') status = 'MEDIUM_CONFIDENCE';
    else if (bestMatch.confidence === 'LOW') status = 'LOW_CONFIDENCE';
    else status = 'NO_MATCH';
    
    mappings.push({
      dish,
      currentPhoto,
      proposedMatches: matches,
      bestMatch,
      status,
    });
  });
  
  log('SCORE', `Computed matches for ${mappings.length} dishes`);
  return mappings;
}

// ────────────────────────────────────────────────────────────────────────────
// DÉTECTION DES CONFLITS
// ────────────────────────────────────────────────────────────────────────────

function detectConflicts(mappings: DishMapping[]): PhotoConflict[] {
  log('CONFLICT', 'Detecting photo conflicts...');
  
  const photoToDishes = new Map<string, Array<{ dishId: string; dishName: string; score: number }>>();
  
  mappings.forEach(mapping => {
    if (mapping.bestMatch && mapping.bestMatch.confidence !== 'NO_MATCH') {
      const photoId = mapping.bestMatch.photo.id;
      
      if (!photoToDishes.has(photoId)) {
        photoToDishes.set(photoId, []);
      }
      
      photoToDishes.get(photoId)!.push({
        dishId: mapping.dish._id,
        dishName: mapping.dish.nameFr,
        score: mapping.bestMatch.totalScore,
      });
    }
  });
  
  const conflicts: PhotoConflict[] = [];
  
  photoToDishes.forEach((dishes, photoId) => {
    if (dishes.length > 1) {
      dishes.sort((a, b) => b.score - a.score);
      
      const photo = mappings
        .flatMap(m => m.proposedMatches.map(pm => pm.photo))
        .find(p => p.id === photoId);
      
      if (photo) {
        conflicts.push({
          photo,
          dishes,
          scoreDifference: dishes[0].score - dishes[1].score,
        });
      }
    }
  });
  
  log('CONFLICT', `Found ${conflicts.length} photo conflicts`);
  return conflicts;
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION RAPPORTS
// ────────────────────────────────────────────────────────────────────────────

function generateJSONReport(
  mappings: DishMapping[],
  conflicts: PhotoConflict[],
  photos: PhotoInventory[],
  dishes: DishData[]
): void {
  log('REPORT', 'Generating JSON report...');
  
  const usedPhotoIds = new Set(
    mappings
      .flatMap(m => m.proposedMatches.map(pm => pm.photo.id))
  );
  
  const unusedPhotos = photos.filter(p => !usedPhotoIds.has(p.id));
  
  const orphanDishes = mappings.filter(m => m.status === 'NO_MATCH');
  
  const stats = {
    HIGH_CONFIDENCE: mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length,
    MEDIUM_CONFIDENCE: mappings.filter(m => m.status === 'MEDIUM_CONFIDENCE').length,
    LOW_CONFIDENCE: mappings.filter(m => m.status === 'LOW_CONFIDENCE').length,
    NO_MATCH: mappings.filter(m => m.status === 'NO_MATCH').length,
  };
  
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY',
      version: '1.0.0',
    },
    summary: {
      totalDishes: dishes.length,
      totalPhotos: photos.length,
      matchingStats: stats,
      conflicts: conflicts.length,
      unusedPhotos: unusedPhotos.length,
      orphanDishes: orphanDishes.length,
    },
    mappings,
    conflicts,
    unusedPhotos,
    orphanDishes: orphanDishes.map(m => m.dish),
  };
  
  const reportPath = path.join(__dirname, '../../photo-mapping-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log('REPORT', `JSON report saved to: ${reportPath}`);
}

function generateCSVReport(mappings: DishMapping[]): void {
  log('EXPORT', 'Generating CSV report...');
  
  const rows = [
    ['Dish ID', 'Dish Name', 'Category', 'Current Image', 'Proposed Image', 'Score', 'Confidence', 'Reasons'].join(',')
  ];
  
  mappings.forEach(mapping => {
    if (mapping.bestMatch) {
      rows.push([
        mapping.dish._id,
        `"${mapping.dish.nameFr}"`,
        `"${mapping.dish.categoryName}"`,
        `"${mapping.dish.currentImage}"`,
        `"${mapping.bestMatch.photo.url}"`,
        mapping.bestMatch.totalScore,
        mapping.bestMatch.confidence,
        `"${mapping.bestMatch.reasons.join('; ')}"`,
      ].join(','));
    }
  });
  
  const csvPath = path.join(__dirname, '../../photo-mapping-analysis.csv');
  fs.writeFileSync(csvPath, rows.join('\n'));
  
  log('EXPORT', `CSV report saved to: ${csvPath}`);
}

function generateHTMLReport(
  mappings: DishMapping[],
  conflicts: PhotoConflict[],
  photos: PhotoInventory[]
): void {
  log('REPORT', 'Generating HTML validation interface...');
  
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BIZZ'ART - Validation Mapping Photos ↔ Plats</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 1.1em;
      opacity: 0.9;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .stat-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
    }
    
    .stat-label {
      color: #666;
      margin-top: 5px;
    }
    
    .filters {
      padding: 20px 30px;
      background: white;
      border-bottom: 1px solid #eee;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;
    }
    
    .filters input,
    .filters select,
    .filters button {
      padding: 10px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .filters input {
      flex: 1;
      min-width: 250px;
    }
    
    .filters select {
      min-width: 150px;
    }
    
    .filters button {
      background: #667eea;
      color: white;
      border: none;
      cursor: pointer;
      font-weight: 600;
    }
    
    .filters button:hover {
      background: #5568d3;
    }
    
    .content {
      padding: 30px;
    }
    
    .dish-card {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 25px;
      transition: all 0.3s;
    }
    
    .dish-card:hover {
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    
    .dish-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .dish-info h3 {
      font-size: 1.5em;
      color: #333;
      margin-bottom: 5px;
    }
    
    .dish-meta {
      color: #666;
      font-size: 0.9em;
    }
    
    .confidence-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9em;
      text-transform: uppercase;
    }
    
    .badge-HIGH { background: #d4edda; color: #155724; }
    .badge-MEDIUM { background: #fff3cd; color: #856404; }
    .badge-LOW { background: #f8d7da; color: #721c24; }
    .badge-NO_MATCH { background: #e2e3e5; color: #383d41; }
    
    .photos-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .photo-proposal {
      border: 3px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s;
    }
    
    .photo-proposal.current {
      border-color: #17a2b8;
    }
    
    .photo-proposal.validated {
      border-color: #28a745;
    }
    
    .photo-proposal.rejected {
      border-color: #dc3545;
      opacity: 0.5;
    }
    
    .photo-header {
      background: #f8f9fa;
      padding: 10px 15px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .photo-header.current { background: #d1ecf1; color: #0c5460; }
    .photo-header.best { background: #d4edda; color: #155724; }
    
    .photo-img-container {
      position: relative;
      padding-top: 75%;
      background: #f0f0f0;
      cursor: pointer;
    }
    
    .photo-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .photo-score {
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 5px 10px;
      position: absolute;
      top: 10px;
      right: 10px;
      border-radius: 5px;
      font-weight: bold;
    }
    
    .photo-details {
      padding: 15px;
      background: white;
    }
    
    .score-breakdown {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 0.85em;
      margin-bottom: 10px;
    }
    
    .score-item {
      display: flex;
      justify-content: space-between;
      color: #666;
    }
    
    .reasons {
      font-size: 0.85em;
      color: #666;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
    
    .reasons li {
      margin-left: 20px;
      margin-bottom: 5px;
    }
    
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 15px;
    }
    
    .btn {
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-validate {
      background: #28a745;
      color: white;
    }
    
    .btn-validate:hover {
      background: #218838;
    }
    
    .btn-reject {
      background: #dc3545;
      color: white;
    }
    
    .btn-reject:hover {
      background: #c82333;
    }
    
    .export-section {
      padding: 30px;
      text-align: center;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }
    
    .export-buttons {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-top: 20px;
    }
    
    .btn-export {
      padding: 15px 30px;
      font-size: 1.1em;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      border: none;
      transition: all 0.3s;
    }
    
    .btn-export-json {
      background: #667eea;
      color: white;
    }
    
    .btn-export-csv {
      background: #28a745;
      color: white;
    }
    
    .btn-reset {
      background: #dc3545;
      color: white;
    }
    
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      align-items: center;
      justify-content: center;
    }
    
    .modal.active {
      display: flex;
    }
    
    .modal-content {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }
    
    .modal-close {
      position: absolute;
      top: 20px;
      right: 40px;
      color: white;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍕 BIZZ'ART - Validation Mapping Photos</h1>
      <p>MODE READ-ONLY - Reconstruction automatique du mapping photos ↔ plats</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value" id="stat-total">${mappings.length}</div>
        <div class="stat-label">Total Plats</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-high">${mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length}</div>
        <div class="stat-label">Haute Confiance</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-medium">${mappings.filter(m => m.status === 'MEDIUM_CONFIDENCE').length}</div>
        <div class="stat-label">Moyenne Confiance</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-low">${mappings.filter(m => m.status === 'LOW_CONFIDENCE').length}</div>
        <div class="stat-label">Faible Confiance</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-conflicts">${conflicts.length}</div>
        <div class="stat-label">Conflits</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-validated">0</div>
        <div class="stat-label">Validés</div>
      </div>
    </div>
    
    <div class="filters">
      <input type="text" id="search" placeholder="🔍 Rechercher un plat...">
      <select id="filter-category">
        <option value="">Toutes catégories</option>
        ${Array.from(new Set(mappings.map(m => m.dish.categoryName))).sort().map(cat => 
          `<option value="${cat}">${cat}</option>`
        ).join('')}
      </select>
      <select id="filter-confidence">
        <option value="">Toutes confiances</option>
        <option value="HIGH_CONFIDENCE">Haute</option>
        <option value="MEDIUM_CONFIDENCE">Moyenne</option>
        <option value="LOW_CONFIDENCE">Faible</option>
        <option value="NO_MATCH">Aucune</option>
      </select>
      <button onclick="applyFilters()">Filtrer</button>
      <button onclick="resetFilters()">Réinitialiser</button>
    </div>
    
    <div class="content" id="dishes-container">
      <!-- Dishes will be rendered by JavaScript -->
    </div>
    
    <div class="export-section">
      <h2>📊 Export des Validations</h2>
      <p style="margin: 15px 0; color: #666;">Exportez vos validations pour application ultérieure</p>
      <div class="export-buttons">
        <button class="btn-export btn-export-json" onclick="exportJSON()">💾 Export JSON</button>
        <button class="btn-export btn-export-csv" onclick="exportCSV()">📄 Export CSV</button>
        <button class="btn-export btn-reset" onclick="resetValidations()">🔄 Reset</button>
      </div>
    </div>
  </div>
  
  <div class="modal" id="imageModal">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <img class="modal-content" id="modalImage">
  </div>
  
  <script>
    const DATA = ${JSON.stringify({ mappings, conflicts })};
    let validations = JSON.parse(localStorage.getItem('bizzart_photo_validations') || '{}');
    
    function generateDishCardHTML(mapping, index) {
      const validation = validations[mapping.dish._id] || {};
      
      return \`
        <div class="dish-card" id="dish-\${index}" data-category="\${mapping.dish.categoryName}" data-confidence="\${mapping.status}">
          <div class="dish-header">
            <div class="dish-info">
              <h3>\${mapping.dish.nameFr}</h3>
              <div class="dish-meta">
                <strong>Catégorie:</strong> \${mapping.dish.categoryName} | 
                <strong>Prix:</strong> \${mapping.dish.price} TND | 
                <strong>ID:</strong> \${mapping.dish._id}
              </div>
              \${mapping.dish.description ? \`<div class="dish-meta" style="margin-top: 5px;">\${mapping.dish.description}</div>\` : ''}
            </div>
            <span class="confidence-badge badge-\${mapping.status.replace('_CONFIDENCE', '')}">\${mapping.status.replace('_', ' ')}</span>
          </div>
          
          <div class="photos-container">
            \${mapping.currentPhoto ? \`
              <div class="photo-proposal current">
                <div class="photo-header current">📸 PHOTO ACTUELLE</div>
                <div class="photo-img-container" onclick="openModal('\${mapping.currentPhoto.url}')">
                  <img class="photo-img" src="\${mapping.currentPhoto.url}" alt="Photo actuelle" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3EImage non disponible%3C/text%3E%3C/svg%3E'">
                </div>
                <div class="photo-details">
                  <div style="font-size: 0.85em; color: #666;">\${mapping.currentPhoto.filename}</div>
                </div>
              </div>
            \` : ''}
            
            \${mapping.proposedMatches.slice(0, 3).map((match, matchIndex) => \`
              <div class="photo-proposal \${validation.photoId === match.photo.id ? 'validated' : ''} \${validation.rejected && validation.rejected.includes(match.photo.id) ? 'rejected' : ''}" id="photo-\${index}-\${matchIndex}">
                <div class="photo-header \${matchIndex === 0 ? 'best' : ''}">
                  \${matchIndex === 0 ? '⭐ ' : ''}PROPOSITION #\${matchIndex + 1}
                  <span class="confidence-badge badge-\${match.confidence}" style="font-size: 0.75em; padding: 4px 8px;">\${match.confidence}</span>
                </div>
                <div class="photo-img-container" onclick="openModal('\${match.photo.url}')">
                  <img class="photo-img" src="\${match.photo.url}" alt="Proposition \${matchIndex + 1}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3EImage non disponible%3C/text%3E%3C/svg%3E'">
                  <div class="photo-score">\${match.totalScore.toFixed(1)}</div>
                </div>
                <div class="photo-details">
                  <div class="score-breakdown">
                    <div class="score-item"><span>Nom:</span><span>\${match.details.nameScore.toFixed(0)}%</span></div>
                    <div class="score-item"><span>Catégorie:</span><span>\${match.details.categoryScore.toFixed(0)}%</span></div>
                    <div class="score-item"><span>Description:</span><span>\${match.details.descriptionScore.toFixed(0)}%</span></div>
                    <div class="score-item"><span>Metadata:</span><span>\${match.details.metadataScore.toFixed(0)}%</span></div>
                    <div class="score-item"><span>Historique:</span><span>\${match.details.historyScore.toFixed(0)}%</span></div>
                    <div class="score-item"><span><strong>TOTAL:</strong></span><span><strong>\${match.totalScore.toFixed(1)}</strong></span></div>
                  </div>
                  \${match.reasons.length > 0 ? \`
                    <div class="reasons">
                      <strong>Raisons:</strong>
                      <ul>
                        \${match.reasons.map(r => \`<li>\${r}</li>\`).join('')}
                      </ul>
                    </div>
                  \` : ''}
                  <div class="actions">
                    <button class="btn btn-validate" onclick="validatePhoto('\${mapping.dish._id}', '\${match.photo.id}', \${index}, \${matchIndex})">
                      ✓ Valider
                    </button>
                    <button class="btn btn-reject" onclick="rejectPhoto('\${mapping.dish._id}', '\${match.photo.id}', \${index}, \${matchIndex})">
                      ✗ Rejeter
                    </button>
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \`;
    }
    
    function validatePhoto(dishId, photoId, dishIndex, photoIndex) {
      validations[dishId] = {
        photoId,
        validatedAt: new Date().toISOString(),
        rejected: []
      };
      localStorage.setItem('bizzart_photo_validations', JSON.stringify(validations));
      updateUI();
      updateStats();
    }
    
    function rejectPhoto(dishId, photoId, dishIndex, photoIndex) {
      if (!validations[dishId]) {
        validations[dishId] = { rejected: [] };
      }
      if (!validations[dishId].rejected) {
        validations[dishId].rejected = [];
      }
      if (!validations[dishId].rejected.includes(photoId)) {
        validations[dishId].rejected.push(photoId);
      }
      localStorage.setItem('bizzart_photo_validations', JSON.stringify(validations));
      updateUI();
    }
    
    function updateUI() {
      const container = document.getElementById('dishes-container');
      container.innerHTML = DATA.mappings.map((mapping, index) => generateDishCardHTML(mapping, index)).join('');
    }
    
    function updateStats() {
      document.getElementById('stat-validated').textContent = Object.keys(validations).filter(id => validations[id].photoId).length;
    }
    
    function applyFilters() {
      const search = document.getElementById('search').value.toLowerCase();
      const category = document.getElementById('filter-category').value;
      const confidence = document.getElementById('filter-confidence').value;
      
      DATA.mappings.forEach((mapping, index) => {
        const card = document.getElementById(\`dish-\${index}\`);
        if (!card) return;
        
        const matchesSearch = !search || mapping.dish.nameFr.toLowerCase().includes(search);
        const matchesCategory = !category || mapping.dish.categoryName === category;
        const matchesConfidence = !confidence || mapping.status === confidence;
        
        card.style.display = (matchesSearch && matchesCategory && matchesConfidence) ? 'block' : 'none';
      });
    }
    
    function resetFilters() {
      document.getElementById('search').value = '';
      document.getElementById('filter-category').value = '';
      document.getElementById('filter-confidence').value = '';
      applyFilters();
    }
    
    function openModal(url) {
      document.getElementById('modalImage').src = url;
      document.getElementById('imageModal').classList.add('active');
    }
    
    function closeModal() {
      document.getElementById('imageModal').classList.remove('active');
    }
    
    function exportJSON() {
      const exportData = {
        exportedAt: new Date().toISOString(),
        mode: 'READ_ONLY',
        validations: Object.entries(validations)
          .filter(([dishId, val]) => val.photoId)
          .map(([dishId, val]) => {
            const mapping = DATA.mappings.find(m => m.dish._id === dishId);
            const photo = mapping?.proposedMatches.find(m => m.photo.id === val.photoId);
            return {
              dishId,
              dishName: mapping?.dish.nameFr,
              category: mapping?.dish.categoryName,
              currentImage: mapping?.dish.currentImage,
              validatedImage: photo?.photo.url,
              score: photo?.totalScore,
              confidence: photo?.confidence,
              validatedAt: val.validatedAt
            };
          })
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`bizzart-mapping-validated-\${new Date().toISOString().split('T')[0]}.json\`;
      a.click();
    }
    
    function exportCSV() {
      const rows = [
        ['Dish ID', 'Dish Name', 'Category', 'Current Image', 'Validated Image', 'Score', 'Confidence', 'Validated At'].join(',')
      ];
      
      Object.entries(validations)
        .filter(([dishId, val]) => val.photoId)
        .forEach(([dishId, val]) => {
          const mapping = DATA.mappings.find(m => m.dish._id === dishId);
          const photo = mapping?.proposedMatches.find(m => m.photo.id === val.photoId);
          rows.push([
            dishId,
            \`"\${mapping?.dish.nameFr}"\`,
            \`"\${mapping?.dish.categoryName}"\`,
            \`"\${mapping?.dish.currentImage}"\`,
            \`"\${photo?.photo.url}"\`,
            photo?.totalScore || 0,
            photo?.confidence || '',
            val.validatedAt
          ].join(','));
        });
      
      const blob = new Blob([rows.join('\\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`bizzart-mapping-validated-\${new Date().toISOString().split('T')[0]}.csv\`;
      a.click();
    }
    
    function resetValidations() {
      if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les validations ?')) {
        validations = {};
        localStorage.removeItem('bizzart_photo_validations');
        updateUI();
        updateStats();
      }
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      updateUI(); // Initial render
      updateStats();
      document.getElementById('search').addEventListener('input', applyFilters);
    });
    
    // Close modal on click outside
    document.getElementById('imageModal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    
    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;
  
  const htmlPath = path.join(__dirname, '../../audit-mapping-photos.html');
  fs.writeFileSync(htmlPath, html);
  
  log('REPORT', `HTML validation interface saved to: ${htmlPath}`);
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  RECONSTRUCTION AUTOMATIQUE DU MAPPING PHOTOS ↔ PLATS         ║');
  console.log('║  MODE READ-ONLY STRICT                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    log('SCAN', `Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    log('SCAN', 'MongoDB connected successfully');
    
    // Step 1: Fetch dishes first
    const dishes = await fetchDishes();
    
    // Step 2: Build photo inventory (now includes dish photos)
    const photos = await buildPhotoInventory(dishes);
    
    // Step 3: Load validation history
    const validationHistory = loadValidationHistory();
    
    // Step 4: Perform matching
    const mappings = performMatching(dishes, photos, validationHistory);
    
    // Step 5: Detect conflicts
    const conflicts = detectConflicts(mappings);
    
    // Step 6: Generate reports
    generateJSONReport(mappings, conflicts, photos, dishes);
    generateCSVReport(mappings);
    generateHTMLReport(mappings, conflicts, photos);
    
    // Final summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  RAPPORT FINAL                                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 INVENTAIRE:');
    console.log(`   Plats trouvés: ${dishes.length}`);
    console.log(`   Photos trouvées: ${photos.length}`);
    console.log(`   Photos Cloudinary: ${photos.filter(p => p.source === 'validation').length}`);
    console.log(`   Photos locales: ${photos.filter(p => p.source === 'local').length}`);
    
    console.log('\n🎯 MATCHING:');
    console.log(`   HIGH CONFIDENCE: ${mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length}`);
    console.log(`   MEDIUM CONFIDENCE: ${mappings.filter(m => m.status === 'MEDIUM_CONFIDENCE').length}`);
    console.log(`   LOW CONFIDENCE: ${mappings.filter(m => m.status === 'LOW_CONFIDENCE').length}`);
    console.log(`   NO MATCH: ${mappings.filter(m => m.status === 'NO_MATCH').length}`);
    
    console.log('\n⚠️  PROBLÈMES:');
    console.log(`   Plats sans photo fiable: ${mappings.filter(m => m.status === 'NO_MATCH').length}`);
    console.log(`   Conflits (même photo → multiples plats): ${conflicts.length}`);
    
    const usedPhotoIds = new Set(mappings.flatMap(m => m.proposedMatches.map(pm => pm.photo.id)));
    const unusedPhotos = photos.filter(p => !usedPhotoIds.has(p.id));
    console.log(`   Photos inutilisées: ${unusedPhotos.length}`);
    
    console.log('\n📁 FICHIERS CRÉÉS:');
    console.log(`   ${path.join(__dirname, '../../audit-mapping-photos.html')}`);
    console.log(`   ${path.join(__dirname, '../../photo-mapping-analysis.json')}`);
    console.log(`   ${path.join(__dirname, '../../photo-mapping-analysis.csv')}`);
    
    console.log('\n✅ Mission terminée avec succès!');
    console.log('   Ouvrez audit-mapping-photos.html pour validation humaine.\n');
    
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
