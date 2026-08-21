/**
 * ============================================================================
 * PHASE 1.6 — RECONSTRUCTION PROFESSIONNELLE DU MAPPING PHOTOS
 * MODE READ-ONLY STRICT
 * ============================================================================
 * 
 * Mission: Reconstruire le mapping photos ↔ plats avec inventaire exhaustif
 * de 276 photos et système HISTORICALLY_VALIDATED.
 * 
 * RÈGLES ABSOLUES:
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune suppression fichier
 * ❌ Aucun changement automatique
 * ✅ Propositions uniquement
 * ✅ Validation humaine requise
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
  url: string;
  filename: string;
  cloudinary?: {
    publicId: string;
    folder?: string;
    filename: string;
  };
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

interface CandidateMatch {
  photo: PhotoInventory;
  automatedScore: number;
  automatedConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH';
  historicalValidation?: 'CONFIRMED_HISTORICAL' | 'PENDING' | 'REJECTED';
  finalConfidence: 'CONFIRMED_HISTORICAL' | 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'NO_MATCH' | 'CONFLICT';
  scores: {
    nameScore: number;
    categoryScore: number;
    descriptionScore: number;
    metadataScore: number;
    historyScore: number;
  };
  reasons: string[];
  conflict?: boolean;
}

interface DishMapping {
  dish: DishData;
  currentPhoto?: PhotoInventory;
  currentPhotoStatus: 'OK' | 'PLACEHOLDER' | 'CONFLICT' | 'MISSING';
  candidates: CandidateMatch[];
  bestCandidate?: CandidateMatch;
  status: 'CONFIRMED_HISTORICAL' | 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'NO_MATCH' | 'CONFLICT' | 'PLACEHOLDER';
  conflicts?: string[];
  humanValidation?: {
    selectedPhotoId?: string;
    status: 'CONFIRMED' | 'REFUSED' | 'ALTERNATIVE' | 'NO_PHOTO' | 'PENDING';
    validatedAt?: string;
    notes?: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  NAME: 0.30,
  CATEGORY: 0.20,
  DESCRIPTION: 0.15,
  METADATA: 0.10,
  HISTORY: 0.25,
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 65,
  LOW: 40,
};

const ALIASES: Record<string, string[]> = {
  'pizza': ['pizza', 'pizzas'],
  'pates': ['pates', 'pasta', 'pâtes', 'spaghetti', 'tagliatelle', 'ravioli'],
  'poulet': ['poulet', 'chicken', 'pollo', 'escalope'],
  'viande': ['viande', 'meat', 'steak', 'boeuf', 'beef', 'filet'],
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

// ────────────────────────────────────────────────────────────────────────────
// LOGGING
// ────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  console.log(`[${phase}] ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// NORMALISATION
// ────────────────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
// CHARGEMENT INVENTAIRE
// ────────────────────────────────────────────────────────────────────────────

function loadPhotoInventory(): PhotoInventory[] {
  log('LOAD', 'Loading photo inventory...');
  
  const inventoryPath = path.join(__dirname, '../../photo-inventory-complete.json');
  
  if (!fs.existsSync(inventoryPath)) {
    throw new Error('photo-inventory-complete.json not found! Run audit-exhaustif-sources-images.ts first.');
  }
  
  const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  
  log('LOAD', `Loaded ${data.photos.length} photos from inventory`);
  log('LOAD', `  • Cloudinary: ${data.summary.cloudinaryPhotos}`);
  log('LOAD', `  • Local: ${data.summary.localPhotos}`);
  log('LOAD', `  • Historically validated: ${data.summary.historicallyValidated}`);
  
  return data.photos;
}

// ────────────────────────────────────────────────────────────────────────────
// RÉCUPÉRATION PLATS
// ────────────────────────────────────────────────────────────────────────────

async function fetchDishes(): Promise<DishData[]> {
  log('MONGODB', 'Fetching dishes...');
  
  const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({})
    .populate('category')
    .sort({ category: 1, order: 1 })
    .lean();
  
  log('MONGODB', `Found ${items.length} menu items`);
  
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
// SCORING SYSTEM
// ────────────────────────────────────────────────────────────────────────────

function calculateNameScore(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  const dishTokens = expandWithAliases(getTokens(dish.nameFr + ' ' + (dish.nameEn || '')));
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
  const folderTokens = photo.cloudinary?.folder ? getTokens(photo.cloudinary.folder) : [];
  
  const allPhotoTokens = [...photoTokens, ...folderTokens];
  
  const matches = categoryTokens.filter(ct =>
    allPhotoTokens.some(pt => pt.includes(ct) || ct.includes(pt))
  );
  
  if (matches.length > 0) {
    score = 80;
    reasons.push(`Catégorie "${dish.categoryName}" trouvée`);
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
    reasons.push(`Ingrédients: ${foundKeywords.slice(0, 3).join(', ')}`);
  }
  
  return { score, reasons };
}

function calculateMetadataScore(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50;
  
  if (/stock|generic|placeholder|default/i.test(photo.filename)) {
    score = 10;
    reasons.push('⚠️ Photo stock/placeholder détectée');
  } else {
    reasons.push('Format approprié');
  }
  
  return { score: Math.min(score, 100), reasons };
}

function calculateHistoryScore(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50;
  
  // Check if this photo is historically validated for this dish
  const dishRelation = photo.dishes.find(d => d.dishId === dish._id);
  
  if (photo.historicalValidation === 'VALIDATED' && dishRelation?.relationship === 'historical') {
    score = 100;
    reasons.push('✅ VALIDATED historiquement pour ce plat');
  } else if (dishRelation?.relationship === 'current') {
    score = 60;
    reasons.push('Photo actuellement assignée');
  } else if (dishRelation?.relationship === 'historical') {
    score = 40;
    reasons.push('Relation historique (non validée)');
  }
  
  return { score, reasons };
}

function calculateMatch(dish: DishData, photo: PhotoInventory, inventory: PhotoInventory[]): CandidateMatch {
  const nameResult = calculateNameScore(dish, photo);
  const categoryResult = calculateCategoryScore(dish, photo);
  const descriptionResult = calculateDescriptionScore(dish, photo);
  const metadataResult = calculateMetadataScore(dish, photo);
  const historyResult = calculateHistoryScore(dish, photo);
  
  const automatedScore =
    nameResult.score * WEIGHTS.NAME +
    categoryResult.score * WEIGHTS.CATEGORY +
    descriptionResult.score * WEIGHTS.DESCRIPTION +
    metadataResult.score * WEIGHTS.METADATA +
    historyResult.score * WEIGHTS.HISTORY;
  
  let automatedConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH';
  if (automatedScore >= CONFIDENCE_THRESHOLDS.HIGH) automatedConfidence = 'HIGH';
  else if (automatedScore >= CONFIDENCE_THRESHOLDS.MEDIUM) automatedConfidence = 'MEDIUM';
  else if (automatedScore >= CONFIDENCE_THRESHOLDS.LOW) automatedConfidence = 'LOW';
  else automatedConfidence = 'NO_MATCH';
  
  // Historical validation
  let historicalValidation: CandidateMatch['historicalValidation'];
  const dishRelation = photo.dishes.find(d => d.dishId === dish._id);
  
  if (photo.historicalValidation === 'VALIDATED' && dishRelation?.relationship === 'historical') {
    historicalValidation = 'CONFIRMED_HISTORICAL';
  } else if (dishRelation) {
    historicalValidation = 'PENDING';
  }
  
  // Final confidence (historical overrides automated)
  let finalConfidence: CandidateMatch['finalConfidence'];
  if (historicalValidation === 'CONFIRMED_HISTORICAL') {
    finalConfidence = 'CONFIRMED_HISTORICAL';
  } else if (automatedConfidence === 'HIGH') {
    finalConfidence = 'HIGH_CONFIDENCE';
  } else if (automatedConfidence === 'MEDIUM') {
    finalConfidence = 'MEDIUM_CONFIDENCE';
  } else if (automatedConfidence === 'LOW') {
    finalConfidence = 'LOW_CONFIDENCE';
  } else {
    finalConfidence = 'NO_MATCH';
  }
  
  // Check for conflicts (photo used by multiple dishes currently)
  const conflict = photo.dishes.filter(d => d.relationship === 'current').length > 1;
  
  return {
    photo,
    automatedScore: Math.round(automatedScore * 10) / 10,
    automatedConfidence,
    historicalValidation,
    finalConfidence,
    scores: {
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
    conflict,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// MATCHING ENGINE V2
// ────────────────────────────────────────────────────────────────────────────

function performMatchingV2(dishes: DishData[], inventory: PhotoInventory[]): DishMapping[] {
  log('MATCHING', 'Computing photo-dish matches with v2 algorithm...');
  
  const mappings: DishMapping[] = [];
  
  dishes.forEach((dish, index) => {
    if (index % 20 === 0) {
      log('MATCHING', `Processing dish ${index + 1}/${dishes.length}...`);
    }
    
    // Find current photo
    const currentPhoto = inventory.find(p => p.url === dish.currentImage);
    
    // Determine current photo status
    let currentPhotoStatus: DishMapping['currentPhotoStatus'] = 'OK';
    if (!currentPhoto) {
      currentPhotoStatus = 'MISSING';
    } else if (/placeholder/i.test(currentPhoto.filename)) {
      currentPhotoStatus = 'PLACEHOLDER';
    } else if (currentPhoto.dishes.filter(d => d.relationship === 'current').length > 1) {
      currentPhotoStatus = 'CONFLICT';
    }
    
    // Calculate matches for all photos
    const candidates = inventory
      .map(photo => calculateMatch(dish, photo, inventory))
      .sort((a, b) => {
        // CONFIRMED_HISTORICAL always first
        if (a.finalConfidence === 'CONFIRMED_HISTORICAL' && b.finalConfidence !== 'CONFIRMED_HISTORICAL') return -1;
        if (b.finalConfidence === 'CONFIRMED_HISTORICAL' && a.finalConfidence !== 'CONFIRMED_HISTORICAL') return 1;
        // Then by automated score
        return b.automatedScore - a.automatedScore;
      })
      .slice(0, 10); // Keep top 10
    
    const bestCandidate = candidates[0];
    
    // Determine overall status
    let status: DishMapping['status'];
    if (bestCandidate.finalConfidence === 'CONFIRMED_HISTORICAL') {
      status = 'CONFIRMED_HISTORICAL';
    } else if (currentPhotoStatus === 'PLACEHOLDER') {
      status = 'PLACEHOLDER';
    } else if (currentPhotoStatus === 'CONFLICT') {
      status = 'CONFLICT';
    } else if (bestCandidate.finalConfidence === 'HIGH_CONFIDENCE') {
      status = 'HIGH_CONFIDENCE';
    } else if (bestCandidate.finalConfidence === 'MEDIUM_CONFIDENCE') {
      status = 'MEDIUM_CONFIDENCE';
    } else if (bestCandidate.finalConfidence === 'LOW_CONFIDENCE') {
      status = 'LOW_CONFIDENCE';
    } else {
      status = 'NO_MATCH';
    }
    
    // Detect conflicts
    const conflicts: string[] = [];
    if (currentPhotoStatus === 'CONFLICT' && currentPhoto) {
      const conflictingDishes = currentPhoto.dishes
        .filter(d => d.relationship === 'current' && d.dishId !== dish._id)
        .map(d => d.dishName);
      conflicts.push(`Photo partagée avec: ${conflictingDishes.join(', ')}`);
    }
    
    mappings.push({
      dish,
      currentPhoto,
      currentPhotoStatus,
      candidates,
      bestCandidate,
      status,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      humanValidation: {
        status: 'PENDING',
      },
    });
  });
  
  log('MATCHING', `Computed matches for ${mappings.length} dishes`);
  
  return mappings;
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION RAPPORTS
// ────────────────────────────────────────────────────────────────────────────

function generateReports(mappings: DishMapping[], inventory: PhotoInventory[]): void {
  const rootDir = path.join(__dirname, '../..');
  
  // Statistics
  const stats = {
    totalDishes: mappings.length,
    confirmedHistorical: mappings.filter(m => m.status === 'CONFIRMED_HISTORICAL').length,
    highConfidence: mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length,
    mediumConfidence: mappings.filter(m => m.status === 'MEDIUM_CONFIDENCE').length,
    lowConfidence: mappings.filter(m => m.status === 'LOW_CONFIDENCE').length,
    noMatch: mappings.filter(m => m.status === 'NO_MATCH').length,
    placeholder: mappings.filter(m => m.status === 'PLACEHOLDER').length,
    conflict: mappings.filter(m => m.status === 'CONFLICT').length,
    validated: mappings.filter(m => m.humanValidation?.status !== 'PENDING').length,
    pending: mappings.filter(m => m.humanValidation?.status === 'PENDING').length,
  };
  
  // 1. Mapping proposals JSON
  log('REPORT', 'Generating photo-mapping-proposals-v2.json...');
  fs.writeFileSync(
    path.join(rootDir, 'photo-mapping-proposals-v2.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      version: '2.0',
      mode: 'READ_ONLY',
      summary: stats,
      mappings,
    }, null, 2)
  );
  
  // 2. Validation file (empty, will be filled by human validation)
  log('REPORT', 'Generating photo-mapping-validation-v2.json...');
  fs.writeFileSync(
    path.join(rootDir, 'photo-mapping-validation-v2.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      version: '2.0',
      mode: 'READ_ONLY',
      validations: mappings.map(m => ({
        dishId: m.dish._id,
        dishName: m.dish.nameFr,
        category: m.dish.categoryName,
        currentImage: m.dish.currentImage,
        proposedImage: m.bestCandidate?.photo.url,
        status: m.humanValidation?.status || 'PENDING',
        validatedAt: null,
        notes: '',
      })),
    }, null, 2)
  );
  
  // 3. CSV export
  log('REPORT', 'Generating photo-mapping-proposals-v2.csv...');
  const csvRows = [
    ['Dish ID', 'Dish Name', 'Category', 'Current Image', 'Current Status', 'Best Candidate', 'Score', 'Confidence', 'Historical', 'Conflict'].join(',')
  ];
  
  mappings.forEach(m => {
    csvRows.push([
      m.dish._id,
      `"${m.dish.nameFr}"`,
      `"${m.dish.categoryName}"`,
      `"${m.dish.currentImage}"`,
      m.currentPhotoStatus,
      `"${m.bestCandidate?.photo.url || ''}"`,
      m.bestCandidate?.automatedScore || 0,
      m.bestCandidate?.finalConfidence || 'NO_MATCH',
      m.bestCandidate?.historicalValidation || 'NONE',
      m.currentPhotoStatus === 'CONFLICT' ? 'YES' : 'NO',
    ].join(','));
  });
  
  fs.writeFileSync(
    path.join(rootDir, 'photo-mapping-proposals-v2.csv'),
    csvRows.join('\n')
  );
  
  log('REPORT', 'All reports generated successfully');
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION HTML V2
// ────────────────────────────────────────────────────────────────────────────

function generateHTMLV2(mappings: DishMapping[]): void {
  log('HTML', 'Generating audit-mapping-photos-v2.html...');
  
  const stats = {
    totalDishes: mappings.length,
    confirmedHistorical: mappings.filter(m => m.status === 'CONFIRMED_HISTORICAL').length,
    highConfidence: mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length,
    mediumConfidence: mappings.filter(m => m.status === 'MEDIUM_CONFIDENCE').length,
    lowConfidence: mappings.filter(m => m.status === 'LOW_CONFIDENCE').length,
    noMatch: mappings.filter(m => m.status === 'NO_MATCH').length,
    placeholder: mappings.filter(m => m.status === 'PLACEHOLDER').length,
    conflict: mappings.filter(m => m.status === 'CONFLICT').length,
  };
  
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BIZZ'ART - Reconstruction Mapping Photos V2</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1600px;
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
    
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header .version { font-size: 1.5em; opacity: 0.9; margin-bottom: 10px; }
    .header p { font-size: 1.1em; opacity: 0.9; }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
      padding: 25px;
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
      margin-bottom: 5px;
    }
    
    .stat-value.confirmed { color: #28a745; }
    .stat-value.high { color: #20c997; }
    .stat-value.medium { color: #ffc107; }
    .stat-value.low { color: #fd7e14; }
    .stat-value.nomatch { color: #6c757d; }
    .stat-value.placeholder { color: #dc3545; }
    .stat-value.conflict { color: #e83e8c; }
    
    .stat-label { color: #666; font-size: 0.9em; }
    
    .filters {
      padding: 20px 30px;
      background: white;
      border-bottom: 1px solid #eee;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;
    }
    
    .filters input, .filters select, .filters button {
      padding: 10px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .filters input { flex: 1; min-width: 250px; }
    .filters select { min-width: 180px; }
    .filters button {
      background: #667eea;
      color: white;
      border: none;
      cursor: pointer;
      font-weight: 600;
    }
    
    .filters button:hover { background: #5568d3; }
    
    .content {
      padding: 30px;
      max-height: calc(100vh - 500px);
      overflow-y: auto;
    }
    
    .dish-card {
      background: white;
      border: 3px solid #e0e0e0;
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 25px;
      transition: all 0.3s;
    }
    
    .dish-card.confirmed-historical { border-color: #28a745; background: #f8fff9; }
    .dish-card.high-confidence { border-color: #20c997; }
    .dish-card.placeholder { border-color: #dc3545; background: #fff5f5; }
    .dish-card.conflict { border-color: #e83e8c; background: #fff0f6; }
    
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
      margin-top: 5px;
    }
    
    .badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9em;
      text-transform: uppercase;
      display: inline-block;
    }
    
    .badge-CONFIRMED_HISTORICAL { background: #d4edda; color: #155724; }
    .badge-HIGH_CONFIDENCE { background: #d1f0e8; color: #0f6848; }
    .badge-MEDIUM_CONFIDENCE { background: #fff3cd; color: #856404; }
    .badge-LOW_CONFIDENCE { background: #ffe5d0; color: #8a4a00; }
    .badge-NO_MATCH { background: #e2e3e5; color: #383d41; }
    .badge-PLACEHOLDER { background: #f8d7da; color: #721c24; }
    .badge-CONFLICT { background: #f5c2dd; color: #870f50; }
    
    .current-status {
      margin: 15px 0;
      padding: 15px;
      border-radius: 10px;
      background: #f8f9fa;
    }
    
    .current-status.placeholder { background: #ffe5e5; border: 2px solid #dc3545; }
    .current-status.conflict { background: #ffe5f0; border: 2px solid #e83e8c; }
    
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .photo-card {
      border: 3px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s;
      background: white;
    }
    
    .photo-card.best { border-color: #20c997; box-shadow: 0 4px 15px rgba(32,201,151,0.3); }
    .photo-card.confirmed { border-color: #28a745; box-shadow: 0 4px 15px rgba(40,167,69,0.3); }
    .photo-card.validated { background: #f8fff9; }
    
    .photo-header {
      background: #f8f9fa;
      padding: 10px 15px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .photo-header.confirmed { background: #d4edda; color: #155724; }
    .photo-header.best { background: #d1f0e8; color: #0f6848; }
    
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
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 5px 12px;
      border-radius: 5px;
      font-weight: bold;
    }
    
    .photo-details {
      padding: 15px;
    }
    
    .score-grid {
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
      margin: 10px 0;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
    
    .reasons li {
      margin-left: 20px;
      margin-bottom: 5px;
    }
    
    .actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 15px;
    }
    
    .btn {
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9em;
    }
    
    .btn-confirm { background: #28a745; color: white; }
    .btn-confirm:hover { background: #218838; }
    
    .btn-refuse { background: #dc3545; color: white; }
    .btn-refuse:hover { background: #c82333; }
    
    .btn-alternative { background: #6c757d; color: white; }
    .btn-alternative:hover { background: #5a6268; }
    
    .btn-no-photo { background: #ffc107; color: #000; }
    .btn-no-photo:hover { background: #e0a800; }
    
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
      flex-wrap: wrap;
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
    
    .btn-export-json { background: #667eea; color: white; }
    .btn-export-csv { background: #28a745; color: white; }
    .btn-reset { background: #dc3545; color: white; }
    
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
    
    .modal.active { display: flex; }
    
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
      <h1>🍕 BIZZ'ART - Reconstruction Mapping Photos</h1>
      <div class="version">VERSION 2.0</div>
      <p>MODE READ-ONLY - Inventaire exhaustif 276 photos - Système HISTORICALLY_VALIDATED</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${stats.totalDishes}</div>
        <div class="stat-label">Total Plats</div>
      </div>
      <div class="stat-card">
        <div class="stat-value confirmed">${stats.confirmedHistorical}</div>
        <div class="stat-label">Confirmed Historical</div>
      </div>
      <div class="stat-card">
        <div class="stat-value high">${stats.highConfidence}</div>
        <div class="stat-label">High Confidence</div>
      </div>
      <div class="stat-card">
        <div class="stat-value medium">${stats.mediumConfidence}</div>
        <div class="stat-label">Medium Confidence</div>
      </div>
      <div class="stat-card">
        <div class="stat-value low">${stats.lowConfidence}</div>
        <div class="stat-label">Low Confidence</div>
      </div>
      <div class="stat-card">
        <div class="stat-value nomatch">${stats.noMatch}</div>
        <div class="stat-label">No Match</div>
      </div>
      <div class="stat-card">
        <div class="stat-value placeholder">${stats.placeholder}</div>
        <div class="stat-label">Placeholder</div>
      </div>
      <div class="stat-card">
        <div class="stat-value conflict">${stats.conflict}</div>
        <div class="stat-label">Conflicts</div>
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
      <select id="filter-status">
        <option value="">Tous statuts</option>
        <option value="CONFIRMED_HISTORICAL">Confirmed Historical</option>
        <option value="HIGH_CONFIDENCE">High Confidence</option>
        <option value="MEDIUM_CONFIDENCE">Medium Confidence</option>
        <option value="LOW_CONFIDENCE">Low Confidence</option>
        <option value="NO_MATCH">No Match</option>
        <option value="PLACEHOLDER">Placeholder</option>
        <option value="CONFLICT">Conflict</option>
      </select>
      <button onclick="applyFilters()">Filtrer</button>
      <button onclick="resetFilters()">Réinitialiser</button>
    </div>
    
    <div class="content" id="dishes-container">
      <!-- Will be populated by JavaScript -->
    </div>
    
    <div class="export-section">
      <h2>💾 Export des Validations</h2>
      <p style="margin: 15px 0; color: #666;">Exportez vos validations pour application ultérieure (Phase 2)</p>
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
    const DATA = ${JSON.stringify(mappings)};
    let validations = JSON.parse(localStorage.getItem('bizzart_photo_validations_v2') || '{}');
    
    function renderDishes() {
      const container = document.getElementById('dishes-container');
      container.innerHTML = DATA.map((mapping, index) => {
        const validation = validations[mapping.dish._id] || { status: 'PENDING' };
        const statusClass = mapping.status.toLowerCase().replace(/_/g, '-');
        
        return \`
          <div class="dish-card \${statusClass}" id="dish-\${index}" data-category="\${mapping.dish.categoryName}" data-status="\${mapping.status}">
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
              <span class="badge badge-\${mapping.status}">\${mapping.status.replace(/_/g, ' ')}</span>
            </div>
            
            <div class="current-status \${mapping.currentPhotoStatus.toLowerCase()}">
              <strong>📸 Photo actuelle:</strong> \${mapping.currentPhotoStatus}
              \${mapping.conflicts ? \`<div style="color: #dc3545; margin-top: 5px;">⚠️ \${mapping.conflicts.join('; ')}</div>\` : ''}
            </div>
            
            <div class="photos-grid">
              \${mapping.candidates.slice(0, 5).map((candidate, candIndex) => \`
                <div class="photo-card \${candIndex === 0 ? 'best' : ''} \${candidate.finalConfidence === 'CONFIRMED_HISTORICAL' ? 'confirmed' : ''} \${validation.selectedPhotoId === candidate.photo.id ? 'validated' : ''}">
                  <div class="photo-header \${candidate.finalConfidence === 'CONFIRMED_HISTORICAL' ? 'confirmed' : candIndex === 0 ? 'best' : ''}">
                    <span>\${candIndex === 0 ? '⭐ ' : ''}CANDIDATE #\${candIndex + 1}</span>
                    <span class="badge badge-\${candidate.finalConfidence}">\${candidate.finalConfidence.replace(/_/g, ' ')}</span>
                  </div>
                  <div class="photo-img-container" onclick="openModal('\${candidate.photo.url}')">
                    <img class="photo-img" src="\${candidate.photo.url}" alt="Candidate \${candIndex + 1}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3EImage non disponible%3C/text%3E%3C/svg%3E'">
                    <div class="photo-score">\${candidate.automatedScore.toFixed(1)}</div>
                  </div>
                  <div class="photo-details">
                    <div class="score-grid">
                      <div class="score-item"><span>Nom:</span><span>\${candidate.scores.nameScore.toFixed(0)}%</span></div>
                      <div class="score-item"><span>Catégorie:</span><span>\${candidate.scores.categoryScore.toFixed(0)}%</span></div>
                      <div class="score-item"><span>Description:</span><span>\${candidate.scores.descriptionScore.toFixed(0)}%</span></div>
                      <div class="score-item"><span>Metadata:</span><span>\${candidate.scores.metadataScore.toFixed(0)}%</span></div>
                      <div class="score-item"><span>Historique:</span><span>\${candidate.scores.historyScore.toFixed(0)}%</span></div>
                      <div class="score-item"><span><strong>TOTAL:</strong></span><span><strong>\${candidate.automatedScore.toFixed(1)}</strong></span></div>
                    </div>
                    \${candidate.historicalValidation ? \`<div style="background: #d4edda; color: #155724; padding: 8px; border-radius: 5px; margin: 10px 0; font-weight: 600;">✅ \${candidate.historicalValidation}</div>\` : ''}
                    \${candidate.conflict ? \`<div style="background: #f8d7da; color: #721c24; padding: 8px; border-radius: 5px; margin: 10px 0; font-weight: 600;">⚠️ CONFLICT: Photo partagée</div>\` : ''}
                    \${candidate.reasons.length > 0 ? \`
                      <div class="reasons">
                        <strong>Raisons:</strong>
                        <ul>
                          \${candidate.reasons.map(r => \`<li>\${r}</li>\`).join('')}
                        </ul>
                      </div>
                    \` : ''}
                    <div class="actions">
                      <button class="btn btn-confirm" onclick="validatePhoto('\${mapping.dish._id}', '\${candidate.photo.id}', 'CONFIRMED')">
                        ✅ CONFIRMER
                      </button>
                      <button class="btn btn-refuse" onclick="validatePhoto('\${mapping.dish._id}', '\${candidate.photo.id}', 'REFUSED')">
                        ❌ REFUSER
                      </button>
                    </div>
                  </div>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }).join('');
    }
    
    function validatePhoto(dishId, photoId, status) {
      validations[dishId] = {
        selectedPhotoId: status === 'CONFIRMED' ? photoId : null,
        status,
        validatedAt: new Date().toISOString(),
      };
      localStorage.setItem('bizzart_photo_validations_v2', JSON.stringify(validations));
      renderDishes();
    }
    
    function applyFilters() {
      const search = document.getElementById('search').value.toLowerCase();
      const category = document.getElementById('filter-category').value;
      const status = document.getElementById('filter-status').value;
      
      DATA.forEach((mapping, index) => {
        const card = document.getElementById(\`dish-\${index}\`);
        if (!card) return;
        
        const matchesSearch = !search || mapping.dish.nameFr.toLowerCase().includes(search);
        const matchesCategory = !category || mapping.dish.categoryName === category;
        const matchesStatus = !status || mapping.status === status;
        
        card.style.display = (matchesSearch && matchesCategory && matchesStatus) ? 'block' : 'none';
      });
    }
    
    function resetFilters() {
      document.getElementById('search').value = '';
      document.getElementById('filter-category').value = '';
      document.getElementById('filter-status').value = '';
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
        version: '2.0',
        mode: 'READ_ONLY',
        validations: Object.entries(validations)
          .filter(([dishId, val]) => val.status !== 'PENDING')
          .map(([dishId, val]) => {
            const mapping = DATA.find(m => m.dish._id === dishId);
            const photo = mapping?.candidates.find(c => c.photo.id === val.selectedPhotoId);
            return {
              dishId,
              dishName: mapping?.dish.nameFr,
              category: mapping?.dish.categoryName,
              currentImage: mapping?.dish.currentImage,
              validatedImage: photo?.photo.url || null,
              status: val.status,
              validatedAt: val.validatedAt,
            };
          })
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`bizzart-mapping-validated-v2-\${new Date().toISOString().split('T')[0]}.json\`;
      a.click();
    }
    
    function exportCSV() {
      const rows = [
        ['Dish ID', 'Dish Name', 'Category', 'Current Image', 'Validated Image', 'Status', 'Validated At'].join(',')
      ];
      
      Object.entries(validations)
        .filter(([dishId, val]) => val.status !== 'PENDING')
        .forEach(([dishId, val]) => {
          const mapping = DATA.find(m => m.dish._id === dishId);
          const photo = mapping?.candidates.find(c => c.photo.id === val.selectedPhotoId);
          rows.push([
            dishId,
            \`"\${mapping?.dish.nameFr}"\`,
            \`"\${mapping?.dish.categoryName}"\`,
            \`"\${mapping?.dish.currentImage}"\`,
            \`"\${photo?.photo.url || ''}"\`,
            val.status,
            val.validatedAt || '',
          ].join(','));
        });
      
      const blob = new Blob([rows.join('\\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`bizzart-mapping-validated-v2-\${new Date().toISOString().split('T')[0]}.csv\`;
      a.click();
    }
    
    function resetValidations() {
      if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les validations ?')) {
        validations = {};
        localStorage.removeItem('bizzart_photo_validations_v2');
        renderDishes();
      }
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      renderDishes();
      document.getElementById('search').addEventListener('input', applyFilters);
    });
    
    // Close modal on click outside or ESC
    document.getElementById('imageModal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;
  
  const htmlPath = path.join(__dirname, '../../audit-mapping-photos-v2.html');
  fs.writeFileSync(htmlPath, html);
  
  log('HTML', `HTML validation interface saved to: ${htmlPath}`);
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1.6 — RECONSTRUCTION PROFESSIONNELLE MAPPING V2        ║');
  console.log('║  MODE READ-ONLY STRICT                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Load photo inventory
    const inventory = loadPhotoInventory();
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    log('MONGODB', `Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    log('MONGODB', 'MongoDB connected successfully');
    
    // Fetch dishes
    const dishes = await fetchDishes();
    
    // Perform matching v2
    const mappings = performMatchingV2(dishes, inventory);
    
    // Generate reports
    generateReports(mappings, inventory);
    
    // Generate HTML v2
    generateHTMLV2(mappings);
    
    // Final summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  RAPPORT FINAL — RECONSTRUCTION V2                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    const stats = {
      totalDishes: mappings.length,
      confirmedHistorical: mappings.filter(m => m.status === 'CONFIRMED_HISTORICAL').length,
      highConfidence: mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length,
      mediumConfidence: mappings.filter(m => m.status === 'MEDIUM_CONFIDENCE').length,
      lowConfidence: mappings.filter(m => m.status === 'LOW_CONFIDENCE').length,
      noMatch: mappings.filter(m => m.status === 'NO_MATCH').length,
      placeholder: mappings.filter(m => m.status === 'PLACEHOLDER').length,
      conflict: mappings.filter(m => m.status === 'CONFLICT').length,
      validated: mappings.filter(m => m.humanValidation?.status !== 'PENDING').length,
      pending: mappings.filter(m => m.humanValidation?.status === 'PENDING').length,
    };
    
    console.log('📊 STATISTIQUES:');
    console.log(`   Total plats: ${stats.totalDishes}`);
    console.log(`   Photos inventoriées: ${inventory.length}`);
    console.log('');
    console.log('🎯 MAPPING STATUS:');
    console.log(`   ✅ Confirmed Historical: ${stats.confirmedHistorical}`);
    console.log(`   🟢 High Confidence: ${stats.highConfidence}`);
    console.log(`   🟡 Medium Confidence: ${stats.mediumConfidence}`);
    console.log(`   🟠 Low Confidence: ${stats.lowConfidence}`);
    console.log(`   ⚫ No Match: ${stats.noMatch}`);
    console.log(`   🔴 Placeholder: ${stats.placeholder}`);
    console.log(`   🔺 Conflict: ${stats.conflict}`);
    console.log('');
    console.log('📝 VALIDATION:');
    console.log(`   Validés: ${stats.validated}`);
    console.log(`   En attente: ${stats.pending}`);
    
    console.log('\n📁 FICHIERS CRÉÉS:');
    console.log(`   ${path.join(__dirname, '../../photo-mapping-proposals-v2.json')}`);
    console.log(`   ${path.join(__dirname, '../../photo-mapping-validation-v2.json')}`);
    console.log(`   ${path.join(__dirname, '../../photo-mapping-proposals-v2.csv')}`);
    console.log(`   ${path.join(__dirname, '../../audit-mapping-photos-v2.html')}`);
    
    console.log('\n✅ Reconstruction v2 terminée avec succès!');
    console.log('   Ouvrez audit-mapping-photos-v2.html pour validation humaine.\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('MONGODB', 'MongoDB disconnected');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// RUN
// ────────────────────────────────────────────────────────────────────────────

main();
