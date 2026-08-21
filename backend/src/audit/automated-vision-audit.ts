/**
 * AUDIT VISUEL AUTOMATISÉ PAR VISION IA - BIZZ'ART
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Ce script analyse automatiquement les 35 photos uniques des 98 plats
 * en utilisant Google Gemini Vision AI
 * 
 * AUCUNE MODIFICATION de :
 * - MongoDB
 * - Cloudinary
 * - MenuItems
 * - Media
 */

import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// ========== TYPES ==========

interface MenuItemData {
  _id: string;
  nameFr: string;
  nameAr: string;
  nameEn: string;
  categoryName: string;
  image: string;
  price: number;
  description?: string;
  isAvailable: boolean;
}

interface VisionAnalysis {
  visualDescription: string;
  detectedDish: string;
  detectedType: string;
  visibleIngredients: string[];
  visibleAccompaniments: string[];
  presentation: string;
  origin: 'VRAIE_PHOTO_BIZZART' | 'PROBABLEMENT_BIZZART' | 'STOCK_GENERIQUE' | 'INCERTAINE';
  confidence: number;
  evidence: string[];
  uncertainties: string[];
  reasoning: string;
}

interface PhotoMatch {
  menuItemId: string;
  menuItemName: string;
  category: string;
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

interface PhotoAnalysis {
  photoId: string;
  url: string;
  filename: string;
  usedBy: string[];
  visionAnalysis: VisionAnalysis | null;
  matches: PhotoMatch[];
  error?: string;
}

interface PlatClassification {
  menuItemId: string;
  nameFr: string;
  category: string;
  currentPhoto: string;
  finalClassification: 'PHOTO_REELLE_BIZZART_CORRECTE' | 'PHOTO_REELLE_BIZZART_MAUVAIS_PLAT' | 'PHOTO_STOCK_GENERIQUE' | 'PHOTO_INCERTAINE' | 'PHOTO_MANQUANTE';
  matchedPhotoId: string | null;
  matchScore: number;
  reason: string;
}

// ========== CONFIGURATION ==========

const VISION_PROVIDER = process.env.GOOGLE_API_KEY ? 'Google Gemini' : 'MISSING';
const AUDIT_PHOTOS_DIR = path.join(__dirname, '../../audit-photos');
const CACHE_PATH = path.join(__dirname, '../../vision-analysis-cache.json');

// ========== MODELS ==========

const MenuItemSchema = new mongoose.Schema({
  name: Object,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory' },
  image: String,
  price: Number,
  description: Object,
  isAvailable: Boolean,
});

const MenuCategorySchema = new mongoose.Schema({
  name: Object,
  order: Number,
});

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
const MenuCategory = mongoose.model('MenuCategory', MenuCategorySchema);

// ========== VISION IA ==========

let genAI: GoogleGenerativeAI | null = null;

function initializeVisionAI(isDryRun: boolean = false): void {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    if (isDryRun) {
      console.log('⚠️  Vision API non configurée (mode DRY RUN)\n');
      return;
    }
    console.error('\n❌ VISION_PROVIDER_MISSING\n');
    console.error('Google Gemini Vision API nécessaire pour l\'analyse automatique.');
    console.error('\nÉtapes :');
    console.error('1. Obtenez une clé API gratuite sur https://makersuite.google.com/app/apikey');
    console.error('2. Ajoutez dans backend/.env : GOOGLE_API_KEY=votre_clé');
    console.error('3. Relancez : npm run audit:vision\n');
    console.error('Alternative : OpenAI GPT-4 Vision (payant) avec OPENAI_API_KEY\n');
    throw new Error('VISION_PROVIDER_MISSING');
  }
  
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('✅ Google Gemini Vision initialisé\n');
}

async function analyzePhotoWithVision(photoPath: string, photoId: string, menuItems: MenuItemData[]): Promise<VisionAnalysis> {
  if (!genAI) throw new Error('Vision AI non initialisé');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  
  // Lire l'image
  const imageData = fs.readFileSync(photoPath);
  const base64Image = imageData.toString('base64');
  
  const prompt = `Tu es un expert en analyse visuelle de plats de restaurant italien et fruits de mer.

Analyse cette photo de plat et fournis UNIQUEMENT un JSON valide (sans markdown) avec cette structure exacte :

{
  "visualDescription": "description détaillée de ce qui est visible",
  "detectedDish": "nom du plat identifié",
  "detectedType": "un parmi: Pizza, Pâtes, Viande, Volaille, Poisson, Fruits de mer, Salade, Dessert, Boisson, Tacos, Burger, Accompagnement, Autre, Impossible à identifier",
  "visibleIngredients": ["ingrédient1", "ingrédient2"],
  "visibleAccompaniments": ["accompagnement1", "accompagnement2"],
  "presentation": "description de la présentation et style photographique",
  "origin": "un parmi: VRAIE_PHOTO_BIZZART, PROBABLEMENT_BIZZART, STOCK_GENERIQUE, INCERTAINE",
  "confidence": 0.0 à 1.0,
  "evidence": ["élément 1 qui justifie l'analyse", "élément 2"],
  "uncertainties": ["élément incertain 1", "élément incertain 2"],
  "reasoning": "explication complète de ton analyse"
}

RÈGLES STRICTES :
- N'invente JAMAIS d'ingrédients non visibles
- Si tu ne peux pas identifier précisément : detectedType = "Impossible à identifier"
- L'origine ne peut PAS être prouvée uniquement par l'apparence visuelle
- Si l'origine est incertaine : origin = "INCERTAINE"
- Si tu as des doutes, mentionne-les dans "uncertainties"
- Sois HONNÊTE sur ta confiance (confidence entre 0.0 et 1.0)`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Extraire le JSON (enlever les markdown si présents)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Pas de JSON dans la réponse');
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    return analysis as VisionAnalysis;
  } catch (error: any) {
    console.error(`❌ Erreur analyse ${photoId}:`, error.message);
    return {
      visualDescription: 'Analyse échouée',
      detectedDish: 'Inconnu',
      detectedType: 'Impossible à identifier',
      visibleIngredients: [],
      visibleAccompaniments: [],
      presentation: 'N/A',
      origin: 'INCERTAINE',
      confidence: 0,
      evidence: [],
      uncertainties: ['Erreur technique lors de l\'analyse'],
      reasoning: `Erreur technique: ${error.message}`,
    };
  }
}

// ========== MATCHING ==========

function calculateMatchScore(
  vision: VisionAnalysis,
  menuItem: MenuItemData
): { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW'; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];
  
  // Type de plat (40%)
  const detectedType = vision.detectedType.toLowerCase();
  const category = menuItem.categoryName.toLowerCase();
  
  if (detectedType.includes(category) || category.includes(detectedType)) {
    score += 0.4;
    reasons.push('Catégorie compatible');
  } else if (detectedType === 'impossible à identifier') {
    score += 0.1;
    reasons.push('Type non identifiable');
  }
  
  // Nom du plat (30%)
  const detectedDish = vision.detectedDish.toLowerCase();
  const nameFr = menuItem.nameFr.toLowerCase();
  
  // Mots-clés communs
  const detectedWords = detectedDish.split(/\s+/);
  const nameWords = nameFr.split(/\s+/);
  const commonWords = detectedWords.filter(w => nameWords.some(n => n.includes(w) || w.includes(n)));
  
  if (commonWords.length > 0) {
    const nameScore = Math.min(commonWords.length / Math.max(nameWords.length, detectedWords.length), 1) * 0.3;
    score += nameScore;
    reasons.push(`Mots communs: ${commonWords.join(', ')}`);
  }
  
  // Ingrédients (20%)
  if (menuItem.description) {
    const descLower = menuItem.description.toLowerCase();
    const matchingIngredients = vision.visibleIngredients.filter(ing => 
      descLower.includes(ing.toLowerCase())
    );
    
    if (matchingIngredients.length > 0) {
      const ingScore = Math.min(matchingIngredients.length / vision.visibleIngredients.length, 1) * 0.2;
      score += ingScore;
      reasons.push(`Ingrédients: ${matchingIngredients.join(', ')}`);
    }
  }
  
  // Confiance de la vision (10%)
  score += vision.confidence * 0.1;
  
  // Déterminer le niveau
  let level: 'HIGH' | 'MEDIUM' | 'LOW';
  if (score >= 0.85) level = 'HIGH';
  else if (score >= 0.65) level = 'MEDIUM';
  else level = 'LOW';
  
  return {
    score,
    level,
    reasoning: reasons.length > 0 ? reasons.join('; ') : 'Pas de correspondance évidente',
  };
}

// ========== CLASSIFICATION ==========

function classifyMenuItem(
  menuItem: MenuItemData,
  photoAnalysis: PhotoAnalysis | null
): PlatClassification {
  const classification: PlatClassification = {
    menuItemId: menuItem._id,
    nameFr: menuItem.nameFr,
    category: menuItem.categoryName,
    currentPhoto: menuItem.image,
    finalClassification: 'PHOTO_MANQUANTE',
    matchedPhotoId: null,
    matchScore: 0,
    reason: 'Aucune photo analysée',
  };
  
  if (!photoAnalysis || !photoAnalysis.visionAnalysis) {
    return classification;
  }
  
  const vision = photoAnalysis.visionAnalysis;
  const match = photoAnalysis.matches.find(m => m.menuItemId === menuItem._id);
  
  if (!match) {
    classification.reason = 'Pas de correspondance trouvée';
    return classification;
  }
  
  classification.matchedPhotoId = photoAnalysis.photoId;
  classification.matchScore = match.score;
  
  // Logique de classification
  if (vision.origin === 'VRAIE_PHOTO_BIZZART' || vision.origin === 'PROBABLEMENT_BIZZART') {
    if (match.level === 'HIGH') {
      classification.finalClassification = 'PHOTO_REELLE_BIZZART_CORRECTE';
      classification.reason = `Photo réelle correspondant au plat (${(match.score * 100).toFixed(0)}%)`;
    } else {
      classification.finalClassification = 'PHOTO_REELLE_BIZZART_MAUVAIS_PLAT';
      classification.reason = `Photo réelle mais correspond mieux à: ${vision.detectedDish}`;
    }
  } else if (vision.origin === 'STOCK_GENERIQUE') {
    classification.finalClassification = 'PHOTO_STOCK_GENERIQUE';
    classification.reason = 'Photo générique/stock détectée';
  } else {
    classification.finalClassification = 'PHOTO_INCERTAINE';
    classification.reason = 'Origine ou contenu incertain';
  }
  
  return classification;
}

// ========== MAIN ==========

async function loadCache(): Promise<{ [photoId: string]: VisionAnalysis }> {
  if (fs.existsSync(CACHE_PATH)) {
    const content = fs.readFileSync(CACHE_PATH, 'utf-8');
    return JSON.parse(content);
  }
  return {};
}

async function saveCache(cache: { [photoId: string]: VisionAnalysis }): Promise<void> {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function generateHTMLReport(report: any, stats: any, uncertainCases: any[]): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Visuel Automatique - BIZZ'ART</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; color: #333; margin-bottom: 10px; }
    .header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; }
    .stat-card h3 { font-size: 12px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
    .stat-card p { font-size: 24px; font-weight: bold; color: #2196F3; }
    .stat-card.success p { color: #4CAF50; }
    .stat-card.warning p { color: #FF9800; }
    .stat-card.danger p { color: #f44336; }
    .filters { margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap; }
    .filter-input { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .table thead { background: #f8f9fa; }
    .table th { padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #333; border-bottom: 2px solid #ddd; }
    .table td { padding: 12px; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
    .table tr:hover { background: #f8f9fa; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #E8F5E9; color: #4CAF50; }
    .badge-warning { background: #FFF3E0; color: #F57C00; }
    .badge-danger { background: #FFEBEE; color: #f44336; }
    .badge-info { background: #E3F2FD; color: #2196F3; }
    .tabs { display: flex; gap: 10px; margin: 20px 0; border-bottom: 1px solid #ddd; }
    .tab { padding: 10px 20px; cursor: pointer; background: none; border: none; font-size: 16px; color: #666; border-bottom: 3px solid transparent; }
    .tab.active { color: #2196F3; border-bottom-color: #2196F3; font-weight: 600; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .alert { padding: 15px; border-radius: 6px; margin: 20px 0; }
    .alert-info { background: #E3F2FD; color: #1976D2; border-left: 4px solid #2196F3; }
    .alert-warning { background: #FFF3E0; color: #E65100; border-left: 4px solid #FF9800; }
    .alert-success { background: #E8F5E9; color: #2E7D32; border-left: 4px solid #4CAF50; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Audit Visuel Automatique - BIZZ'ART</h1>
      <p style="color: #666; margin-top: 10px;">Analyse par Vision IA - ${report.metadata.timestamp.split('T')[0]}</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Plats analysés</h3>
          <p>${stats.totalPlats}</p>
        </div>
        <div class="stat-card">
          <h3>Photos uniques</h3>
          <p>${stats.totalPhotosUniques}</p>
        </div>
        <div class="stat-card success">
          <h3>Photos Bizz'Art</h3>
          <p>${stats.photosVraieBizzart + stats.photosProbablementBizzart}</p>
        </div>
        <div class="stat-card warning">
          <h3>Photos stock</h3>
          <p>${stats.photosStock}</p>
        </div>
        <div class="stat-card success">
          <h3>Plats OK</h3>
          <p>${stats.platsPhotoCorrecte}</p>
        </div>
        <div class="stat-card danger">
          <h3>Nouvelles photos</h3>
          <p>${stats.platsManquante + stats.platsMauvaisPlat + stats.platsStock}</p>
        </div>
      </div>
      
      <div class="alert alert-info">
        <strong>Mode:</strong> Lecture seule stricte - Aucune modification de production
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="showTab('all')">📊 Tous les plats (${stats.totalPlats})</button>
      <button class="tab" onclick="showTab('missing')">📸 Photos manquantes (${stats.platsManquante + stats.platsMauvaisPlat + stats.platsStock})</button>
      <button class="tab" onclick="showTab('uncertain')">❓ Cas incertains (${uncertainCases.length})</button>
      <button class="tab" onclick="showTab('duplicates')">🔁 Doublons (${stats.doublonsTotal})</button>
    </div>

    <div id="all-tab" class="tab-content active">
      <div class="filters">
        <input type="text" class="filter-input" placeholder="Rechercher un plat..." oninput="filterTable(this.value)">
        <select class="filter-input" onchange="filterByClassification(this.value)">
          <option value="">Toutes les classifications</option>
          <option value="PHOTO_REELLE_BIZZART_CORRECTE">Photo correcte</option>
          <option value="PHOTO_REELLE_BIZZART_MAUVAIS_PLAT">Mauvais plat</option>
          <option value="PHOTO_STOCK_GENERIQUE">Photo stock</option>
          <option value="PHOTO_INCERTAINE">Incertaine</option>
          <option value="PHOTO_MANQUANTE">Manquante</option>
        </select>
      </div>
      
      <table class="table" id="allPlatsTable">
        <thead>
          <tr>
            <th>Plat</th>
            <th>Catégorie</th>
            <th>Classification</th>
            <th>Score</th>
            <th>Raison</th>
          </tr>
        </thead>
        <tbody>
          ${report.menuItems.map((item: any) => `
            <tr>
              <td><strong>${item.nameFr}</strong></td>
              <td><span class="badge badge-info">${item.category}</span></td>
              <td><span class="badge ${item.finalClassification === 'PHOTO_REELLE_BIZZART_CORRECTE' ? 'badge-success' : item.finalClassification === 'PHOTO_STOCK_GENERIQUE' ? 'badge-warning' : item.finalClassification === 'PHOTO_MANQUANTE' ? 'badge-danger' : 'badge-info'}">${item.finalClassification.replace(/_/g, ' ')}</span></td>
              <td>${(item.matchScore * 100).toFixed(0)}%</td>
              <td>${item.reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div id="missing-tab" class="tab-content">
      <div class="alert alert-warning">
        <strong>${stats.platsManquante + stats.platsMauvaisPlat + stats.platsStock} plats</strong> nécessitent une nouvelle photo.
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Plat</th>
            <th>Catégorie</th>
            <th>Classification</th>
            <th>Raison</th>
          </tr>
        </thead>
        <tbody>
          ${report.menuItems.filter((item: any) => item.finalClassification !== 'PHOTO_REELLE_BIZZART_CORRECTE').map((item: any) => `
            <tr>
              <td><strong>${item.nameFr}</strong></td>
              <td><span class="badge badge-info">${item.category}</span></td>
              <td><span class="badge ${item.finalClassification === 'PHOTO_REELLE_BIZZART_CORRECTE' ? 'badge-success' : item.finalClassification === 'PHOTO_STOCK_GENERIQUE' ? 'badge-warning' : item.finalClassification === 'PHOTO_MANQUANTE' ? 'badge-danger' : 'badge-info'}">${item.finalClassification.replace(/_/g, ' ')}</span></td>
              <td>${item.reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div id="uncertain-tab" class="tab-content">
      <div class="alert alert-warning">
        <strong>${uncertainCases.length} cas incertains</strong> nécessitent une révision manuelle.
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Plat</th>
            <th>Catégorie</th>
            <th>Score</th>
            <th>Raison</th>
          </tr>
        </thead>
        <tbody>
          ${uncertainCases.map((item: any) => `
            <tr>
              <td><strong>${item.nameFr}</strong></td>
              <td><span class="badge badge-info">${item.category}</span></td>
              <td>${(item.matchScore * 100).toFixed(0)}%</td>
              <td>${item.reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div id="duplicates-tab" class="tab-content">
      <div class="alert alert-info">
        <strong>${stats.doublonsTotal} photos</strong> sont utilisées par plusieurs plats.
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Photo ID</th>
            <th>Utilisée par</th>
            <th>Détecté</th>
            <th>Criticité</th>
          </tr>
        </thead>
        <tbody>
          ${report.duplicates.map((dup: any) => `
            <tr>
              <td><strong>${dup.photoId}</strong></td>
              <td>${dup.usageCount} plats</td>
              <td>${dup.detectedDish}</td>
              <td><span class="badge ${dup.criticality === 'HIGH' ? 'badge-danger' : dup.criticality === 'MEDIUM' ? 'badge-warning' : 'badge-success'}">${dup.criticality}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function showTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    }

    function filterTable(searchTerm) {
      const rows = document.querySelectorAll('#allPlatsTable tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
      });
    }

    function filterByClassification(classification) {
      const rows = document.querySelectorAll('#allPlatsTable tbody tr');
      rows.forEach(row => {
        if (!classification) {
          row.style.display = '';
        } else {
          const hasClass = row.textContent.includes(classification);
          row.style.display = hasClass ? '' : 'none';
        }
      });
    }

    function getClassBadge(classification) {
      if (classification === 'PHOTO_REELLE_BIZZART_CORRECTE') return 'badge-success';
      if (classification === 'PHOTO_STOCK_GENERIQUE') return 'badge-warning';
      if (classification === 'PHOTO_MANQUANTE') return 'badge-danger';
      return 'badge-info';
    }

    function formatClassification(classification) {
      return classification.replace(/_/g, ' ');
    }
  </script>
</body>
</html>`;
}

async function runAutomatedAudit() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('\n🤖 === AUDIT VISUEL AUTOMATISÉ BIZZ\'ART ===\n');
  console.log(`Mode : ${isDryRun ? 'DRY RUN (test)' : 'LECTURE SEULE STRICTE'}\n`);
  
  try {
    // 1. Initialiser Vision IA
    console.log('🔧 Initialisation Vision IA...');
    initializeVisionAI(isDryRun);
    
    // 2. Connecter MongoDB (lecture seule)
    console.log('🔧 Connexion MongoDB (lecture seule)...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connecté\n');
    
    // 3. Récupérer les MenuItems depuis MongoDB (source réelle)
    console.log('📖 Récupération des MenuItems depuis MongoDB...');
    const menuItemsFromDB = await MenuItem.find()
      .populate('category', 'name')
      .lean();
    
    console.log(`✅ ${menuItemsFromDB.length} MenuItems trouvés dans MongoDB`);
    
    // Vérifier le nombre attendu
    const EXPECTED_MENUITEMS = 98;
    if (menuItemsFromDB.length !== EXPECTED_MENUITEMS) {
      console.warn(`⚠️  WARNING: EXPECTED_MENUITEMS=${EXPECTED_MENUITEMS}, ACTUAL_MENUITEMS=${menuItemsFromDB.length}\n`);
    } else {
      console.log(`✅ Nombre conforme (${EXPECTED_MENUITEMS})\n`);
    }
    
    // Convertir au format attendu
    const menuItems: MenuItemData[] = menuItemsFromDB.map(item => ({
      _id: item._id.toString(),
      nameFr: item.name?.fr || '',
      nameAr: item.name?.ar || '',
      nameEn: item.name?.en || '',
      categoryName: (item.category as any)?.name?.fr || 'Sans catégorie',
      image: item.image || '',
      price: item.price || 0,
      description: item.description?.fr || '',
      isAvailable: item.isAvailable !== false,
    }));
    
    // 4. Extraire les 35 photos uniques
    console.log('📸 Extraction des photos uniques...');
    const photoGroups: { [url: string]: MenuItemData[] } = {};
    menuItems.forEach(item => {
      if (!photoGroups[item.image]) photoGroups[item.image] = [];
      photoGroups[item.image].push(item);
    });
    
    const uniquePhotos = Object.keys(photoGroups);
    console.log(`✅ ${uniquePhotos.length} photos uniques identifiées\n`);
    
    // 5. Charger le cache
    console.log('💾 Chargement du cache...');
    const cache = await loadCache();
    const cachedCount = Object.keys(cache).length;
    console.log(`✅ ${cachedCount} analyses en cache\n`);
    
    // 6. Analyser chaque photo
    if (isDryRun) {
      console.log('🔍 Mode DRY RUN : analyse Vision IA désactivée\n');
      console.log('✅ Vérifications terminées :\n');
      console.log(`   - MongoDB accessible`);
      console.log(`   - ${menuItems.length} MenuItems récupérés`);
      console.log(`   - ${uniquePhotos.length} photos uniques identifiées`);
      console.log(`   - Déduplication fonctionnelle`);
      console.log(`   - Configuration Vision : ${VISION_PROVIDER === 'MISSING' ? '❌ MANQUANTE' : '✅ OK'}`);
      console.log(`\n⚠️  Mode DRY RUN : aucune analyse Vision effectuée\n`);
      return;
    }
    
    console.log('🔍 Analyse des photos avec Vision IA...\n');
    const photoAnalyses: PhotoAnalysis[] = [];
    let photoIndex = 1;
    let analyzedCount = 0;
    let cachedUsed = 0;
    
    for (const [url, plats] of Object.entries(photoGroups)) {
      const photoId = `photo_${photoIndex}`;
      const filename = url.split('/').pop() || '';
      const photoPath = path.join(AUDIT_PHOTOS_DIR, `${photoId}_bizzart_menu_${filename.split('.')[0]}.jpg`);
      
      process.stdout.write(`   [${photoIndex}/35] ${photoId}... `);
      
      let visionAnalysis: VisionAnalysis | null = null;
      
      // Vérifier le cache
      if (cache[photoId]) {
        visionAnalysis = cache[photoId];
        cachedUsed++;
        console.log('✅ (cache)');
      } else if (fs.existsSync(photoPath)) {
        try {
          visionAnalysis = await analyzePhotoWithVision(photoPath, photoId, menuItems);
          cache[photoId] = visionAnalysis;
          await saveCache(cache);
          analyzedCount++;
          console.log(`✅ (${(visionAnalysis.confidence * 100).toFixed(0)}% confiance)`);
          
          // Petit délai pour éviter rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.log(`❌ ${error.message}`);
        }
      } else {
        console.log('⚠️  fichier introuvable');
      }
      
      // Calculer les matches
      const matches: PhotoMatch[] = [];
      if (visionAnalysis) {
        for (const item of menuItems) {
          const matchResult = calculateMatchScore(visionAnalysis, item);
          matches.push({
            menuItemId: item._id,
            menuItemName: item.nameFr,
            category: item.categoryName,
            score: matchResult.score,
            level: matchResult.level,
            reasoning: matchResult.reasoning,
          });
        }
        
        // Trier par score décroissant
        matches.sort((a, b) => b.score - a.score);
      }
      
      photoAnalyses.push({
        photoId,
        url,
        filename,
        usedBy: plats.map(p => p._id),
        visionAnalysis,
        matches: matches.slice(0, 10), // Top 10 matches
      });
      
      photoIndex++;
    }
    
    console.log(`\n✅ Analyse terminée : ${analyzedCount} nouvelles, ${cachedUsed} en cache\n`);
    
    // 7. Classifier les 98 plats
    console.log('📊 Classification des 98 plats...');
    const platsClassification: PlatClassification[] = [];
    
    for (const item of menuItems) {
      const photoAnalysis = photoAnalyses.find(pa => pa.usedBy.includes(item._id));
      const classification = classifyMenuItem(item, photoAnalysis || null);
      platsClassification.push(classification);
    }
    
    console.log('✅ Classification terminée\n');
    
    // 8. Analyser les doublons
    console.log('🔁 Analyse des doublons...');
    const duplicates = photoAnalyses.filter(pa => pa.usedBy.length > 1).map(pa => {
      const highMatches = pa.matches.filter(m => m.level === 'HIGH' && pa.usedBy.includes(m.menuItemId));
      const incorrectAssignments = pa.usedBy.filter(id => !highMatches.some(m => m.menuItemId === id));
      
      let criticality: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (pa.usedBy.length > 5 || incorrectAssignments.length > 3) criticality = 'HIGH';
      else if (pa.usedBy.length > 3 || incorrectAssignments.length > 1) criticality = 'MEDIUM';
      
      return {
        photoId: pa.photoId,
        url: pa.url,
        usageCount: pa.usedBy.length,
        currentAssignments: pa.usedBy.map(id => {
          const item = menuItems.find(m => m._id === id);
          return { id, name: item?.nameFr || '', category: item?.categoryName || '' };
        }),
        correctMatches: highMatches.map(m => m.menuItemId),
        incorrectAssignments,
        criticality,
        detectedDish: pa.visionAnalysis?.detectedDish || 'N/A',
      };
    });
    
    console.log(`✅ ${duplicates.length} doublons analysés\n`);
    
    // 9. Identifier les cas incertains
    console.log('❓ Identification des cas incertains...');
    const uncertainCases = platsClassification.filter(p => 
      p.finalClassification === 'PHOTO_INCERTAINE' || p.matchScore < 0.70
    ).map(p => ({
      menuItemId: p.menuItemId,
      nameFr: p.nameFr,
      category: p.category,
      classification: p.finalClassification,
      matchScore: p.matchScore,
      reason: p.reason,
      requiresManualReview: true,
    }));
    console.log(`✅ ${uncertainCases.length} cas incertains identifiés\n`);
    
    // 10. Calculer les statistiques
    console.log('📈 Calcul des statistiques...');
    
    const stats = {
      totalPlats: menuItems.length,
      totalPhotosUniques: uniquePhotos.length,
      photosAnalyzed: photoAnalyses.filter(pa => pa.visionAnalysis).length,
      
      photosVraieBizzart: photoAnalyses.filter(pa => pa.visionAnalysis?.origin === 'VRAIE_PHOTO_BIZZART').length,
      photosProbablementBizzart: photoAnalyses.filter(pa => pa.visionAnalysis?.origin === 'PROBABLEMENT_BIZZART').length,
      photosStock: photoAnalyses.filter(pa => pa.visionAnalysis?.origin === 'STOCK_GENERIQUE').length,
      photosIncertaines: photoAnalyses.filter(pa => pa.visionAnalysis?.origin === 'INCERTAINE').length,
      
      platsPhotoCorrecte: platsClassification.filter(p => p.finalClassification === 'PHOTO_REELLE_BIZZART_CORRECTE').length,
      platsMauvaisPlat: platsClassification.filter(p => p.finalClassification === 'PHOTO_REELLE_BIZZART_MAUVAIS_PLAT').length,
      platsStock: platsClassification.filter(p => p.finalClassification === 'PHOTO_STOCK_GENERIQUE').length,
      platsIncertaine: platsClassification.filter(p => p.finalClassification === 'PHOTO_INCERTAINE').length,
      platsManquante: platsClassification.filter(p => p.finalClassification === 'PHOTO_MANQUANTE').length,
      
      matchesHIGH: photoAnalyses.flatMap(pa => pa.matches.filter(m => m.level === 'HIGH')).length,
      matchesMEDIUM: photoAnalyses.flatMap(pa => pa.matches.filter(m => m.level === 'MEDIUM')).length,
      matchesLOW: photoAnalyses.flatMap(pa => pa.matches.filter(m => m.level === 'LOW')).length,
      
      doublonsTotal: duplicates.length,
      doublonsHIGH: duplicates.filter(d => d.criticality === 'HIGH').length,
      doublonsMEDIUM: duplicates.filter(d => d.criticality === 'MEDIUM').length,
    };
    
    console.log('✅ Statistiques calculées\n');
    
    // 11. Générer les rapports
    console.log('💾 Génération des rapports...\n');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputDir = path.join(__dirname, '../..');
    
    // 11.1 Rapport JSON principal
    const finalReport = {
      metadata: {
        restaurant: 'BIZZ\'ART Monastir',
        totalMenuItems: stats.totalPlats,
        totalUniquePhotos: stats.totalPhotosUniques,
        visionProvider: VISION_PROVIDER,
        visionModel: 'gemini-1.5-flash',
        auditMode: 'AUTOMATED_VISION_AI',
        readOnly: true,
        timestamp: new Date().toISOString(),
      },
      statistics: stats,
      photos: photoAnalyses,
      menuItems: platsClassification,
      duplicates,
      uncertainCases,
    };
    
    const jsonPath = path.join(outputDir, `AUDIT-VISUEL-AI-FINAL-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(finalReport, null, 2));
    console.log(`   ✅ ${path.basename(jsonPath)}`);
    
    // 11.2 CSV Inventaire photos manquantes
    const missingPhotos = platsClassification.filter(p => 
      p.finalClassification !== 'PHOTO_REELLE_BIZZART_CORRECTE'
    );
    
    let csv = 'MenuItemId,Nom FR,Catégorie,Photo Actuelle,Classification,Score Match,Raison\n';
    missingPhotos.forEach(p => {
      csv += `"${p.menuItemId}","${p.nameFr}","${p.category}","${p.currentPhoto}","${p.finalClassification}","${(p.matchScore * 100).toFixed(0)}%","${p.reason}"\n`;
    });
    
    const csvPath = path.join(outputDir, `INVENTAIRE-PHOTOS-MANQUANTES-AI-${timestamp}.csv`);
    fs.writeFileSync(csvPath, csv);
    console.log(`   ✅ ${path.basename(csvPath)}`);
    
    // 11.3 JSON Doublons
    const doublonsPath = path.join(outputDir, `RAPPORT-DOUBLONS-AI-${timestamp}.json`);
    fs.writeFileSync(doublonsPath, JSON.stringify(duplicates, null, 2));
    console.log(`   ✅ ${path.basename(doublonsPath)}`);
    
    // 11.4 Rapport Markdown
    let markdown = `# 🤖 AUDIT VISUEL AUTOMATISÉ - BIZZ'ART

**Date:** ${new Date().toISOString().split('T')[0]}  
**Vision Provider:** ${VISION_PROVIDER}  
**Mode:** Automatisé 100% (aucune validation manuelle)

---

## 📊 STATISTIQUES GLOBALES

| Métrique | Valeur |
|----------|--------|
| Plats analysés | ${stats.totalPlats} |
| Photos uniques | ${stats.totalPhotosUniques} |
| Photos analysées | ${stats.photosAnalyzed} |

---

## 📸 ANALYSE DES PHOTOS

| Catégorie | Nombre |
|-----------|--------|
| ✅ Vraies photos Bizz'Art | ${stats.photosVraieBizzart} |
| 🟡 Probablement Bizz'Art | ${stats.photosProbablementBizzart} |
| 📦 Photos stock/génériques | ${stats.photosStock} |
| ❓ Photos incertaines | ${stats.photosIncertaines} |

---

## 🍽️  CLASSIFICATION DES PLATS

| Statut | Nombre | % |
|--------|--------|---|
| ✅ Photo réelle correcte | ${stats.platsPhotoCorrecte} | ${((stats.platsPhotoCorrecte / stats.totalPlats) * 100).toFixed(1)}% |
| ⚠️  Photo réelle mauvais plat | ${stats.platsMauvaisPlat} | ${((stats.platsMauvaisPlat / stats.totalPlats) * 100).toFixed(1)}% |
| 📦 Photo stock/générique | ${stats.platsStock} | ${((stats.platsStock / stats.totalPlats) * 100).toFixed(1)}% |
| ❓ Photo incertaine | ${stats.platsIncertaine} | ${((stats.platsIncertaine / stats.totalPlats) * 100).toFixed(1)}% |
| ❌ Photo manquante | ${stats.platsManquante} | ${((stats.platsManquante / stats.totalPlats) * 100).toFixed(1)}% |

---

## 🔁 DOUBLONS

| Métrique | Valeur |
|----------|--------|
| Doublons totaux | ${stats.doublonsTotal} |
| Criticité HIGH | ${stats.doublonsHIGH} |
| Criticité MEDIUM | ${stats.doublonsMEDIUM} |

---

## 📋 NOUVELLES PHOTOS NÉCESSAIRES

**${missingPhotos.length} plats** nécessitent une nouvelle photo ou une photo correcte.

Voir fichier : \`INVENTAIRE-PHOTOS-MANQUANTES-AI-${timestamp}.csv\`

---

## ⚠️  VALIDATION FINALE

**IMPORTANT:** Cette analyse est entièrement automatisée.

**AUCUNE MODIFICATION n'a été apportée à:**
- MongoDB
- Cloudinary
- MenuItems
- Media

**Prochaine étape:** Vérifier les cas INCERTAINS et HIGH priority avant toute migration.

`;
    
    const mdPath = path.join(outputDir, `RAPPORT-AUDIT-AI-${timestamp}.md`);
    fs.writeFileSync(mdPath, markdown);
    console.log(`   ✅ ${path.basename(mdPath)}`);
    
    // 11.5 Rapport HTML interactif
    const htmlPath = path.join(outputDir, `AUDIT-VISUEL-AUTOMATIQUE-BIZZART-${timestamp}.html`);
    const htmlContent = generateHTMLReport(finalReport, stats, uncertainCases);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`   ✅ ${path.basename(htmlPath)}\n`);
    
    // 12. Afficher le résumé
    console.log('='.repeat(80));
    console.log('📊 RÉSUMÉ DE L\'AUDIT AUTOMATISÉ');
    console.log('='.repeat(80));
    console.log(`\n${stats.totalPlats} plats analysés`);
    console.log(`${stats.totalPhotosUniques} photos uniques`);
    console.log(`${stats.photosAnalyzed} photos analysées par Vision IA`);
    console.log(`${cachedUsed} résultats récupérés du cache\n`);
    console.log(`✅ Photos vraies Bizz'Art : ${stats.photosVraieBizzart}`);
    console.log(`🟡 Probablement Bizz'Art : ${stats.photosProbablementBizzart}`);
    console.log(`📦 Photos stock : ${stats.photosStock}`);
    console.log(`❓ Incertaines : ${stats.photosIncertaines}\n`);
    console.log(`✅ Plats photo correcte : ${stats.platsPhotoCorrecte}`);
    console.log(`⚠️  Plats mauvais plat : ${stats.platsMauvaisPlat}`);
    console.log(`❌ Plats photo manquante : ${stats.platsManquante}\n`);
    console.log(`🔁 Doublons HIGH : ${stats.doublonsHIGH}`);
    console.log(`🔁 Doublons MEDIUM : ${stats.doublonsMEDIUM}\n`);
    console.log(`❓ Cas incertains : ${uncertainCases.length}\n`);
    console.log('Reports générés :');
    console.log(`   - AUDIT-VISUEL-AI-FINAL-${timestamp}.json`);
    console.log(`   - INVENTAIRE-PHOTOS-MANQUANTES-AI-${timestamp}.csv`);
    console.log(`   - RAPPORT-DOUBLONS-AI-${timestamp}.json`);
    console.log(`   - RAPPORT-AUDIT-AI-${timestamp}.md`);
    console.log(`   - AUDIT-VISUEL-AUTOMATIQUE-BIZZART-${timestamp}.html`);
    console.log('='.repeat(80));
    console.log('\n✅ AUDIT AUTOMATISÉ TERMINÉ — AUCUNE MODIFICATION DE PRODUCTION\n');
    console.log('⚠️  NE PAS MODIFIER MONGODB');
    console.log('⚠️  NE PAS MODIFIER CLOUDINARY');
    console.log('⚠️  NE PAS LANCER LA MIGRATION\n');
    
  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
    if (error.message === 'VISION_PROVIDER_MISSING') {
      process.exit(2);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Déconnecté de MongoDB\n');
  }
}

// Exécution
runAutomatedAudit()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
