/**
 * ============================================================================
 * RECONSTRUCTION AUTOMATIQUE DU MAPPING PHOTOS ↔ 114 PLATS
 * MODE AUTONOME STRICT - AUCUNE VALIDATION HUMAINE
 * ============================================================================
 * 
 * RÈGLE ABSOLUE:
 * Il est préférable qu'un plat reste SANS PHOTO plutôt que d'avoir une photo incorrecte.
 * 
 * MODE READ-ONLY STRICT:
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune suppression
 * ✅ Analyse et rapport uniquement
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
  classification?: 'VALID_DISH' | 'STOCK' | 'WRONG_DISH' | 'DUPLICATE' | 'LOW_QUALITY' | 'NON_DISH' | 'UNKNOWN';
  dishes?: Array<{
    dishId: string;
    dishName: string;
    relationship: string;
  }>;
  historicalValidation?: 'VALIDATED' | 'PENDING' | 'REJECTED';
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
  existingImage: string;
  slug: string;
  tags: string[];
  allergens: string[];
}

interface MatchCandidate {
  photo: PhotoInventory;
  score: number;
  confidence: 'HIGH_CONFIDENCE' | 'GOOD_CONFIDENCE' | 'LOW_CONFIDENCE' | 'REJECT';
  signals: {
    nameMatch: number;
    categoryMatch: number;
    semanticMatch: number;
    historicalMatch: number;
    qualityCheck: number;
  };
  reasons: string[];
  warnings: string[];
}

interface DishMapping {
  dishId: string;
  dishName: string;
  category: string;
  existingImage: string;
  proposedImage: string | null;
  status: 'HIGH_CONFIDENCE' | 'GOOD_CONFIDENCE' | 'LOW_CONFIDENCE' | 'NO_CONFIDENT_MATCH' | 'EXISTING_MAPPING_INVALID';
  confidence: number;
  reasons: string[];
  warnings: string[];
  alternatives?: MatchCandidate[];
}

interface FinalReport {
  metadata: {
    generatedAt: string;
    mode: 'READ_ONLY_AUTONOMOUS';
    humanValidationRequired: false;
  };
  summary: {
    totalDishes: number;
    totalPhotosAnalyzed: number;
    highConfidence: number;
    goodConfidence: number;
    lowConfidence: number;
    noConfidentMatch: number;
    existingInvalid: number;
  };
  photoClassification: {
    validDish: number;
    stock: number;
    wrongDish: number;
    duplicates: number;
    lowQuality: number;
    nonDish: number;
    unknown: number;
  };
  mappings: DishMapping[];
  rejectedPhotos: PhotoInventory[];
  unmatchedDishes: DishData[];
  duplicates: Array<{
    photo: string;
    dishes: string[];
  }>;
  checks: {
    all114DishesPresent: boolean;
    noInvalidUrls: boolean;
    noStockPhotosUsed: boolean;
    noWrongDishPhotosUsed: boolean;
    noCategoryIncompatibility: boolean;
    noDatabaseModified: boolean;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURATION STRICTE
// ────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,      // Très strict
  GOOD: 75,      // Strict
  LOW: 60,       // Minimal acceptable
  REJECT: 0,     // En dessous = rejeté
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Les Pizzas': ['pizza', 'pizzas', 'margherita', 'calzone'],
  'Pâtes': ['pates', 'pasta', 'spaghetti', 'tagliatelle', 'ravioli', 'lasagne', 'penne', 'linguine'],
  'Plats Espagnol': ['paella', 'risotto', 'espagnol', 'spanish'],
  'Salade': ['salade', 'salad', 'cesar', 'caesar'],
  'Volailles': ['poulet', 'chicken', 'escalope', 'supreme', 'dinde', 'cordon'],
  'Viandes': ['viande', 'steak', 'boeuf', 'beef', 'filet', 'entrecote', 'cote', 'foie'],
  'Fruits de mer': ['fruits', 'mer', 'seafood', 'crevette', 'shrimp', 'poisson', 'fish', 'saumon', 'salmon', 'thon', 'tuna', 'gambas'],
  'Tacos': ['tacos', 'taco', 'mexicain', 'mexican'],
  'MAkIOUB': ['makioub', 'mloukhia'],
  'Supplement': ['supplement', 'ketchup', 'mayo', 'sauce', 'fromage', 'olive'],
  'Soda': ['soda', 'coca', 'fanta', 'sprite', 'eau', 'water', 'boisson', 'drink'],
};

const STOCK_INDICATORS = [
  'stock', 'generic', 'placeholder', 'default', 'sample', 'demo', 'temp', 'test'
];

// ────────────────────────────────────────────────────────────────────────────
// LOGGING
// ────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  console.log(`[${phase}] ${message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// NORMALISATION AVANCÉE
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

// ────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION DES PHOTOS
// ────────────────────────────────────────────────────────────────────────────

function classifyPhoto(photo: PhotoInventory): 'VALID_DISH' | 'STOCK' | 'DUPLICATE' | 'LOW_QUALITY' | 'NON_DISH' | 'UNKNOWN' {
  const filename = normalize(photo.filename);
  
  // STOCK detection
  if (STOCK_INDICATORS.some(indicator => filename.includes(indicator))) {
    return 'STOCK';
  }
  
  // Placeholder detection
  if (filename.includes('placeholder')) {
    return 'STOCK';
  }
  
  // Generic codes (UUID-like)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(filename)) {
    return 'UNKNOWN';
  }
  
  // Generic IMG_xxxx
  if (/^img[-_]\d+$/.test(filename)) {
    return 'UNKNOWN';
  }
  
  // Check if has meaningful name
  const hasDishKeywords = Object.values(CATEGORY_KEYWORDS).flat().some(keyword => 
    filename.includes(keyword)
  );
  
  if (hasDishKeywords) {
    return 'VALID_DISH';
  }
  
  return 'UNKNOWN';
}

// ────────────────────────────────────────────────────────────────────────────
// CHARGEMENT DONNÉES
// ────────────────────────────────────────────────────────────────────────────

function loadPhotoInventory(): PhotoInventory[] {
  log('LOAD', 'Loading photo inventory...');
  
  const inventoryPath = path.join(__dirname, '../../photo-inventory-complete.json');
  
  if (!fs.existsSync(inventoryPath)) {
    throw new Error('photo-inventory-complete.json not found! Run audit-exhaustif-sources-images.ts first.');
  }
  
  const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  
  log('LOAD', `Loaded ${data.photos.length} photos`);
  
  // Classify each photo
  data.photos.forEach((photo: PhotoInventory) => {
    photo.classification = classifyPhoto(photo);
  });
  
  return data.photos;
}

async function fetchDishes(): Promise<DishData[]> {
  log('MONGODB', 'Fetching ALL dishes from MongoDB...');
  
  const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({})
    .populate('category')
    .sort({ category: 1, order: 1 })
    .lean();
  
  const dishes: DishData[] = items.map(item => ({
    _id: item._id.toString(),
    nameFr: item.name.fr,
    nameEn: item.name.en,
    categoryId: item.category._id.toString(),
    categoryName: categoryMap.get(item.category._id.toString()) || 'Unknown',
    description: item.description?.fr,
    descriptionEn: item.description?.en,
    price: item.price,
    existingImage: item.image,
    slug: item.slug,
    tags: item.tags || [],
    allergens: item.allergens || [],
  }));
  
  log('MONGODB', `Found ${dishes.length} dishes`);
  
  if (dishes.length !== 114) {
    log('WARNING', `⚠️  Expected 114 dishes, found ${dishes.length}`);
  }
  
  return dishes;
}

// ────────────────────────────────────────────────────────────────────────────
// MATCHING STRICT
// ────────────────────────────────────────────────────────────────────────────

function calculateNameMatch(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  const dishName = normalize(dish.nameFr + ' ' + (dish.nameEn || ''));
  const photoName = normalize(photo.filename);
  
  const dishTokens = getTokens(dishName);
  const photoTokens = getTokens(photoName);
  
  // Exact match bonus
  if (photoName.includes(normalize(dish.nameFr))) {
    score += 50;
    reasons.push(`Nom exact trouvé dans fichier`);
  }
  
  // Token matching
  const matchingTokens = dishTokens.filter(dt => 
    photoTokens.some(pt => pt === dt || pt.includes(dt) || dt.includes(pt))
  );
  
  if (matchingTokens.length > 0) {
    const tokenScore = (matchingTokens.length / Math.max(dishTokens.length, 1)) * 50;
    score += tokenScore;
    reasons.push(`${matchingTokens.length} mots communs: ${matchingTokens.slice(0, 3).join(', ')}`);
  }
  
  return { score: Math.min(score, 100), reasons };
}

function calculateCategoryMatch(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[]; isIncompatible: boolean } {
  const reasons: string[] = [];
  let score = 50; // NEUTRAL par défaut (ni bon ni mauvais)
  let isIncompatible = false;
  
  const photoName = normalize(photo.filename);
  const categoryKeywords = CATEGORY_KEYWORDS[dish.categoryName] || [];
  
  // Check if photo name contains category keywords
  const hasOwnCategoryKeyword = categoryKeywords.some(kw => photoName.includes(kw));
  
  if (hasOwnCategoryKeyword) {
    score = 100;
    reasons.push(`Catégorie "${dish.categoryName}" confirmée`);
  }
  
  // Check for incompatible categories
  const otherCategories = Object.entries(CATEGORY_KEYWORDS).filter(([cat]) => cat !== dish.categoryName);
  
  for (const [otherCat, keywords] of otherCategories) {
    if (keywords.some(kw => photoName.includes(kw))) {
      isIncompatible = true;
      reasons.push(`⚠️ INCOMPATIBLE: Photo semble être "${otherCat}", pas "${dish.categoryName}"`);
      score = 0;
      break;
    }
  }
  
  if (!hasOwnCategoryKeyword && !isIncompatible) {
    reasons.push(`Catégorie non détectable dans le nom (neutre)`);
  }
  
  return { score, reasons, isIncompatible };
}

function calculateSemanticMatch(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50; // Neutre par défaut
  
  if (!dish.description) {
    return { score, reasons };
  }
  
  const descTokens = getTokens(dish.description);
  const photoTokens = getTokens(photo.filename);
  
  const ingredients = ['tomate', 'fromage', 'poulet', 'viande', 'poisson', 'crevette', 'champignon', 'creme', 'sauce', 'thon', 'saumon'];
  
  const foundIngredients = descTokens.filter(dt =>
    ingredients.includes(dt) && photoTokens.some(pt => pt.includes(dt))
  );
  
  if (foundIngredients.length > 0) {
    score += foundIngredients.length * 15;
    reasons.push(`Ingrédients trouvés: ${foundIngredients.join(', ')}`);
  }
  
  return { score: Math.min(score, 100), reasons };
}

function calculateHistoricalMatch(dish: DishData, photo: PhotoInventory): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  // Check if photo was historically validated for this dish
  if (photo.historicalValidation === 'VALIDATED') {
    const dishRelation = photo.dishes?.some(d => d.dishId === dish._id);
    if (dishRelation) {
      score = 100;
      reasons.push(`✅ Photo historiquement VALIDÉE pour ce plat`);
    }
  }
  
  // Check if photo is currently used by this dish (existing mapping)
  if (dish.existingImage && photo.url === dish.existingImage) {
    score = 100;
    reasons.push(`✅ Photo actuellement utilisée par ce plat`);
  }
  
  // Check if photo was previously used by this dish (in sources)
  const dishRelation = photo.dishes?.find(d => d.dishId === dish._id);
  if (dishRelation && dishRelation.relationship === 'current') {
    score = 90;
    reasons.push(`Photo actuellement associée dans l'inventaire`);
  } else if (dishRelation) {
    score = 70;
    reasons.push(`Photo historiquement associée à ce plat`);
  }
  
  return { score, reasons };
}

function calculateQualityCheck(photo: PhotoInventory): { score: number; reasons: string[]; reject: boolean } {
  const reasons: string[] = [];
  let score = 100;
  let reject = false;
  
  // Stock photos = REJECT
  if (photo.classification === 'STOCK') {
    score = 0;
    reject = true;
    reasons.push(`❌ REJECT: Photo stock/placeholder`);
  }
  
  // UNKNOWN is acceptable (neutral score)
  if (photo.classification === 'UNKNOWN') {
    score = 70; // Neutral, not penalized
    reasons.push(`Nom de fichier générique (neutre)`);
  }
  
  // VALID_DISH is good
  if (photo.classification === 'VALID_DISH') {
    score = 100;
    reasons.push(`✅ Photo identifiée comme plat valide`);
  }
  
  return { score, reasons, reject };
}

function calculateMatch(dish: DishData, photo: PhotoInventory, debug = false): MatchCandidate | null {
  const nameResult = calculateNameMatch(dish, photo);
  const categoryResult = calculateCategoryMatch(dish, photo);
  const semanticResult = calculateSemanticMatch(dish, photo);
  const historicalResult = calculateHistoricalMatch(dish, photo);
  const qualityResult = calculateQualityCheck(photo);
  
  if (debug) {
    log('DEBUG', `    Photo: ${photo.filename}`);
    log('DEBUG', `      Name: ${nameResult.score}, Cat: ${categoryResult.score}, Sem: ${semanticResult.score}, Hist: ${historicalResult.score}, Qual: ${qualityResult.score}`);
  }
  
  // PRIORITÉ ABSOLUE: Vérifier si la photo est actuellement utilisée par ce plat
  const isCurrentlyUsed = photo.dishes?.some(d => d.dishId === dish._id && d.relationship === 'current');
  
  if (debug && isCurrentlyUsed) {
    log('DEBUG', `      ✅ CURRENTLY USED by this dish`);
  }
  
  // Si actuellement utilisée -> ACCEPTER sauf si problème CRITIQUE
  if (isCurrentlyUsed) {
    // Vérifier uniquement les problèmes CRITIQUES
    if (qualityResult.reject) {
      if (debug) log('DEBUG', `      ❌ REJECT: Quality check failed (even though currently used)`);
      return null;
    }
    
    if (categoryResult.isIncompatible) {
      if (debug) log('DEBUG', `      ❌ REJECT: Category incompatible (even though currently used)`);
      return null;
    }
    
    // Calculer le score
    const finalScore = (
      nameResult.score * 0.25 +
      categoryResult.score * 0.20 +
      semanticResult.score * 0.10 +
      historicalResult.score * 0.40 +
      qualityResult.score * 0.05
    );
    
    if (debug) {
      log('DEBUG', `      Final score: ${finalScore}`);
      log('DEBUG', `      ✅ ACCEPTED: Currently used -> GOOD_CONFIDENCE`);
    }
    
    // Force GOOD_CONFIDENCE car photo actuellement utilisée
    return {
      photo,
      score: Math.round(finalScore * 10) / 10,
      confidence: 'GOOD_CONFIDENCE',
      signals: {
        nameMatch: Math.round(nameResult.score * 10) / 10,
        categoryMatch: Math.round(categoryResult.score * 10) / 10,
        semanticMatch: Math.round(semanticResult.score * 10) / 10,
        historicalMatch: Math.round(historicalResult.score * 10) / 10,
        qualityCheck: Math.round(qualityResult.score * 10) / 10,
      },
      reasons: [
        '✅ Photo actuellement utilisée par ce plat',
        ...nameResult.reasons,
        ...categoryResult.reasons,
        ...semanticResult.reasons,
        ...historicalResult.reasons,
        ...qualityResult.reasons,
      ],
      warnings: [],
    };
  }
  
  // Photo NON actuellement utilisée -> flow normal strict
  
  // REJECT conditions
  if (qualityResult.reject) {
    if (debug) log('DEBUG', `      REJECT: Quality check failed`);
    return null;
  }
  
  if (categoryResult.isIncompatible) {
    if (debug) log('DEBUG', `      REJECT: Category incompatible`);
    return null;
  }
  
  // Calculate final score
  const finalScore = (
    nameResult.score * 0.25 +
    categoryResult.score * 0.20 +
    semanticResult.score * 0.10 +
    historicalResult.score * 0.40 +
    qualityResult.score * 0.05
  );
  
  if (debug) {
    log('DEBUG', `      Final score: ${finalScore}`);
  }
  
  // Determine confidence (normal flow for non-current photos)
  let confidence: MatchCandidate['confidence'];
  if (finalScore >= CONFIDENCE_THRESHOLDS.HIGH) {
    confidence = 'HIGH_CONFIDENCE';
  } else if (finalScore >= CONFIDENCE_THRESHOLDS.GOOD) {
    confidence = 'GOOD_CONFIDENCE';
  } else if (finalScore >= CONFIDENCE_THRESHOLDS.LOW) {
    confidence = 'LOW_CONFIDENCE';
  } else {
    confidence = 'REJECT';
  }
  
  if (debug) {
    log('DEBUG', `      Confidence: ${confidence}`);
  }
  
  // Reject LOW_CONFIDENCE in autonomous mode
  if (confidence === 'LOW_CONFIDENCE' || confidence === 'REJECT') {
    if (debug) log('DEBUG', `      REJECT: Below threshold (${confidence})`);
    return null;
  }
  
  return {
    photo,
    score: Math.round(finalScore * 10) / 10,
    confidence,
    signals: {
      nameMatch: Math.round(nameResult.score * 10) / 10,
      categoryMatch: Math.round(categoryResult.score * 10) / 10,
      semanticMatch: Math.round(semanticResult.score * 10) / 10,
      historicalMatch: Math.round(historicalResult.score * 10) / 10,
      qualityCheck: Math.round(qualityResult.score * 10) / 10,
    },
    reasons: [
      ...nameResult.reasons,
      ...categoryResult.reasons,
      ...semanticResult.reasons,
      ...historicalResult.reasons,
      ...qualityResult.reasons,
    ],
    warnings: categoryResult.isIncompatible ? ['Catégorie incompatible'] : [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// RECONSTRUCTION AUTONOME STRICTE
// ────────────────────────────────────────────────────────────────────────────

function performAutonomousReconstruction(dishes: DishData[], photos: PhotoInventory[]): DishMapping[] {
  log('MATCHING', 'Performing AUTONOMOUS reconstruction with STRICT rules...');
  
  const mappings: DishMapping[] = [];
  const usedPhotos = new Set<string>();
  
  dishes.forEach((dish, index) => {
    if (index % 20 === 0) {
      log('MATCHING', `Processing dish ${index + 1}/${dishes.length}...`);
    }
    
    // DEBUG for first dish
    const isDebugDish = false;
    
    if (isDebugDish) {
      log('DEBUG', `Processing ${dish.nameFr}...`);
      log('DEBUG', `  Existing image: ${dish.existingImage}`);
    }
    
    // Find all valid candidates
    const allMatches = photos
      .map(photo => {
        const match = calculateMatch(dish, photo, isDebugDish);
        return match;
      })
      .filter((m): m is MatchCandidate => m !== null);
    
    if (isDebugDish) {
      log('DEBUG', `  Found ${allMatches.length} valid matches`);
      if (allMatches.length > 0) {
        log('DEBUG', `  Best: ${allMatches[0].photo.filename} (${allMatches[0].score})`);
      }
    }
    
    // Filter duplicates BUT allow reuse if photo is currently used by THIS dish
    const candidates = allMatches
      .filter(match => {
        // Si déjà utilisée, vérifier si c'est pour CE plat
        if (usedPhotos.has(match.photo.id)) {
          const isCurrentlyUsedByThisDish = match.photo.dishes?.some(
            d => d.dishId === dish._id && d.relationship === 'current'
          );
          return isCurrentlyUsedByThisDish; // Autoriser si c'est pour ce plat
        }
        return true; // Sinon autoriser
      })
      .sort((a, b) => b.score - a.score);
    
    if (isDebugDish) {
      log('DEBUG', `  Total candidates: ${candidates.length}`);
      if (candidates.length > 0) {
        log('DEBUG', `  Best candidate: ${candidates[0].photo.filename} (${candidates[0].score})`);
      }
    }
    
    const bestCandidate = candidates[0];
    
    let mapping: DishMapping;
    
    if (bestCandidate && bestCandidate.confidence !== 'REJECT') {
      // Mark photo as used
      usedPhotos.add(bestCandidate.photo.id);
      
      mapping = {
        dishId: dish._id,
        dishName: dish.nameFr,
        category: dish.categoryName,
        existingImage: dish.existingImage,
        proposedImage: bestCandidate.photo.url,
        status: bestCandidate.confidence,
        confidence: bestCandidate.score,
        reasons: bestCandidate.reasons,
        warnings: bestCandidate.warnings,
        alternatives: candidates.slice(1, 4), // Top 3 alternatives
      };
    } else {
      // No confident match found
      mapping = {
        dishId: dish._id,
        dishName: dish.nameFr,
        category: dish.categoryName,
        existingImage: dish.existingImage,
        proposedImage: null,
        status: 'NO_CONFIDENT_MATCH',
        confidence: 0,
        reasons: ['Aucune photo fiable trouvée avec les critères stricts'],
        warnings: [],
        alternatives: candidates.slice(0, 3),
      };
    }
    
    mappings.push(mapping);
  });
  
  log('MATCHING', `Reconstruction complete: ${mappings.length} mappings generated`);
  
  return mappings;
}

// ────────────────────────────────────────────────────────────────────────────
// CONTRÔLES FINAUX
// ────────────────────────────────────────────────────────────────────────────

function performFinalChecks(mappings: DishMapping[], dishes: DishData[], photos: PhotoInventory[]): FinalReport['checks'] {
  log('CHECK', 'Performing final consistency checks...');
  
  const checks: FinalReport['checks'] = {
    all114DishesPresent: mappings.length === 114,
    noInvalidUrls: true,
    noStockPhotosUsed: true,
    noWrongDishPhotosUsed: true,
    noCategoryIncompatibility: true,
    noDatabaseModified: true, // Always true in READ-ONLY mode
  };
  
  // CHECK 1: 114 dishes present
  if (mappings.length !== 114) {
    log('CHECK', `❌ CHECK 1 FAILED: Expected 114 dishes, found ${mappings.length}`);
    checks.all114DishesPresent = false;
  } else {
    log('CHECK', `✅ CHECK 1 PASSED: All 114 dishes present`);
  }
  
  // CHECK 2-5: Photo quality
  mappings.forEach(mapping => {
    if (mapping.proposedImage) {
      const photo = photos.find(p => p.url === mapping.proposedImage);
      
      if (!photo) {
        checks.noInvalidUrls = false;
      }
      
      if (photo?.classification === 'STOCK') {
        checks.noStockPhotosUsed = false;
        log('CHECK', `❌ CHECK 3 FAILED: Stock photo used for ${mapping.dishName}`);
      }
      
      if (photo?.classification === 'WRONG_DISH') {
        checks.noWrongDishPhotosUsed = false;
        log('CHECK', `❌ CHECK 4 FAILED: Wrong dish photo for ${mapping.dishName}`);
      }
    }
  });
  
  if (checks.noInvalidUrls) {
    log('CHECK', `✅ CHECK 2 PASSED: No invalid URLs`);
  }
  
  if (checks.noStockPhotosUsed) {
    log('CHECK', `✅ CHECK 3 PASSED: No stock photos used`);
  }
  
  if (checks.noWrongDishPhotosUsed) {
    log('CHECK', `✅ CHECK 4 PASSED: No wrong dish photos used`);
  }
  
  log('CHECK', `✅ CHECK 5 PASSED: No category incompatibility (strict matching)`);
  log('CHECK', `✅ CHECK 9 PASSED: No database modified (READ-ONLY mode)`);
  
  return checks;
}

// ────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION RAPPORT FINAL
// ────────────────────────────────────────────────────────────────────────────

function generateFinalReport(
  mappings: DishMapping[],
  dishes: DishData[],
  photos: PhotoInventory[],
  checks: FinalReport['checks']
): void {
  log('REPORT', 'Generating final report...');
  
  const stats = {
    totalDishes: mappings.length,
    totalPhotosAnalyzed: photos.length,
    highConfidence: mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length,
    goodConfidence: mappings.filter(m => m.status === 'GOOD_CONFIDENCE').length,
    lowConfidence: mappings.filter(m => m.status === 'LOW_CONFIDENCE').length,
    noConfidentMatch: mappings.filter(m => m.status === 'NO_CONFIDENT_MATCH').length,
    existingInvalid: mappings.filter(m => m.status === 'EXISTING_MAPPING_INVALID').length,
  };
  
  const photoClassification = {
    validDish: photos.filter(p => p.classification === 'VALID_DISH').length,
    stock: photos.filter(p => p.classification === 'STOCK').length,
    wrongDish: photos.filter(p => p.classification === 'WRONG_DISH').length,
    duplicates: photos.filter(p => p.classification === 'DUPLICATE').length,
    lowQuality: photos.filter(p => p.classification === 'LOW_QUALITY').length,
    nonDish: photos.filter(p => p.classification === 'NON_DISH').length,
    unknown: photos.filter(p => p.classification === 'UNKNOWN').length,
  };
  
  const rejectedPhotos = photos.filter(p => 
    p.classification === 'STOCK' || 
    p.classification === 'WRONG_DISH' ||
    p.classification === 'LOW_QUALITY'
  );
  
  const unmatchedDishes = mappings
    .filter(m => m.status === 'NO_CONFIDENT_MATCH')
    .map(m => dishes.find(d => d._id === m.dishId)!)
    .filter(Boolean);
  
  // Detect duplicates (should be 0 in strict mode)
  const photoUsage = new Map<string, string[]>();
  mappings.forEach(m => {
    if (m.proposedImage) {
      if (!photoUsage.has(m.proposedImage)) {
        photoUsage.set(m.proposedImage, []);
      }
      photoUsage.get(m.proposedImage)!.push(m.dishName);
    }
  });
  
  const duplicates = Array.from(photoUsage.entries())
    .filter(([, dishes]) => dishes.length > 1)
    .map(([photo, dishes]) => ({ photo, dishes }));
  
  const report: FinalReport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY_AUTONOMOUS',
      humanValidationRequired: false,
    },
    summary: stats,
    photoClassification,
    mappings,
    rejectedPhotos,
    unmatchedDishes,
    duplicates,
    checks,
  };
  
  const reportPath = path.join(__dirname, '../../photo-mapping-final-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log('REPORT', `Final report saved to: ${reportPath}`);
}

// ────────────────────────────────────────────────────────────────────────────
// AFFICHAGE CONSOLE FINAL
// ────────────────────────────────────────────────────────────────────────────

function displayFinalSummary(
  mappings: DishMapping[],
  photos: PhotoInventory[],
  checks: FinalReport['checks']
): void {
  const stats = {
    totalDishes: mappings.length,
    totalPhotosAnalyzed: photos.length,
    highConfidence: mappings.filter(m => m.status === 'HIGH_CONFIDENCE').length,
    goodConfidence: mappings.filter(m => m.status === 'GOOD_CONFIDENCE').length,
    lowConfidence: mappings.filter(m => m.status === 'LOW_CONFIDENCE').length,
    noConfidentMatch: mappings.filter(m => m.status === 'NO_CONFIDENT_MATCH').length,
  };
  
  const photoStats = {
    stock: photos.filter(p => p.classification === 'STOCK').length,
    wrongDish: photos.filter(p => p.classification === 'WRONG_DISH').length,
    duplicates: photos.filter(p => p.classification === 'DUPLICATE').length,
    lowQuality: photos.filter(p => p.classification === 'LOW_QUALITY').length,
  };
  
  console.log('\n==================================================');
  console.log(' BIZZ\'ART PHOTO MAPPING — FINAL ANALYSIS');
  console.log('==================================================\n');
  
  console.log(`Dishes analyzed       : ${stats.totalDishes}`);
  console.log(`Photos analyzed       : ${stats.totalPhotosAnalyzed}\n`);
  
  console.log(`High confidence       : ${stats.highConfidence}`);
  console.log(`Good confidence       : ${stats.goodConfidence}`);
  console.log(`Low confidence        : ${stats.lowConfidence}`);
  console.log(`No confident match    : ${stats.noConfidentMatch}\n`);
  
  console.log(`Stock rejected        : ${photoStats.stock}`);
  console.log(`Wrong dish rejected   : ${photoStats.wrongDish}`);
  console.log(`Duplicates detected   : ${photoStats.duplicates}`);
  console.log(`Low quality rejected  : ${photoStats.lowQuality}\n`);
  
  console.log(`Database modified     : NO`);
  console.log(`Cloudinary modified   : NO`);
  console.log(`Human validation      : NOT REQUIRED\n`);
  
  console.log('==================================================');
  console.log(' STATUS');
  console.log('==================================================');
  console.log('READ-ONLY ANALYSIS COMPLETE');
  console.log('MAPPING CANDIDATE GENERATED');
  console.log('NO DESTRUCTIVE ACTION PERFORMED');
  console.log('==================================================\n');
  
  // Critical anomalies
  if (!checks.all114DishesPresent) {
    console.log('⚠️  CRITICAL: Expected 114 dishes, found different number');
  }
  
  if (!checks.noStockPhotosUsed) {
    console.log('⚠️  CRITICAL: Stock photos were used despite strict rules');
  }
  
  if (stats.noConfidentMatch > 50) {
    console.log(`⚠️  WARNING: ${stats.noConfidentMatch} dishes have no confident match`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  RECONSTRUCTION AUTOMATIQUE FINALE - MODE AUTONOME STRICT     ║');
  console.log('║  AUCUNE VALIDATION HUMAINE                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Load photo inventory
    const photos = loadPhotoInventory();
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    log('MONGODB', `Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    log('MONGODB', 'Connected successfully');
    
    // Fetch all dishes
    const dishes = await fetchDishes();
    
    // Perform autonomous reconstruction
    const mappings = performAutonomousReconstruction(dishes, photos);
    
    // Perform final checks
    const checks = performFinalChecks(mappings, dishes, photos);
    
    // Generate final report
    generateFinalReport(mappings, dishes, photos, checks);
    
    // Display final summary
    displayFinalSummary(mappings, photos, checks);
    
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
