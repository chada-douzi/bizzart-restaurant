/**
 * AUDIT VISUEL PROFESSIONNEL DES 98 PLATS BIZZ'ART
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Ce script télécharge toutes les photos et génère un rapport HTML interactif
 * permettant une analyse visuelle humaine de chaque photo.
 * 
 * AUCUNE modification MongoDB ou Cloudinary.
 */

import { connectDatabase } from '../config/database';
import { MenuItem } from '../models/menu-item.model';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface MenuItemData {
  _id: string;
  nameFr: string;
  nameAr?: string;
  nameEn?: string;
  categoryId: string;
  categoryName: string;
  image: string;
  isAvailable: boolean;
  price: number;
  description?: string;
}

interface PhotoInfo {
  url: string;
  publicId: string;
  usageCount: number;
  usedByPlats: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

interface AuditResult {
  totalPlats: number;
  totalUniquePhotos: number;
  duplicates: number;
  menuItems: MenuItemData[];
  photos: PhotoInfo[];
  duplicateAnalysis: Array<{
    url: string;
    count: number;
    plats: string[];
    categories: string[];
    verdict: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fonction de téléchargement d'image
// ═══════════════════════════════════════════════════════════════════════════════

function downloadImage(url: string, filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        fs.unlinkSync(filepath);
        resolve(false);
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      console.error(`Erreur téléchargement ${url}: ${err.message}`);
      resolve(false);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fonction principale
// ═══════════════════════════════════════════════════════════════════════════════

async function visualAudit() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('AUDIT VISUEL PROFESSIONNEL — BIZZ\'ART');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('🔒 MODE : STRICTEMENT LECTURE SEULE');
  console.log('   - Aucune modification MongoDB');
  console.log('   - Aucune modification Cloudinary');
  console.log('   - Aucune suppression de données');
  console.log('   - Téléchargement local des photos pour analyse');
  console.log('');

  try {
    // PHASE 1 : Connexion MongoDB et récupération des données
    console.log('PHASE 1 : INVENTAIRE DES DONNÉES');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    await connectDatabase();
    console.log('✅ Connecté à MongoDB');
    
    const menuItems = await MenuItem.find({ isAvailable: true })
      .populate('category', 'name')
      .select('_id name category image isAvailable price description')
      .lean();
    
    console.log(`✅ ${menuItems.length} plats récupérés`);
    console.log('');

    // PHASE 2 : Analyse des photos uniques
    console.log('PHASE 2 : INVENTAIRE DES PHOTOS');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    const photoMap = new Map<string, PhotoInfo>();
    
    for (const item of menuItems) {
      const url = item.image;
      const categoryName = item.category && typeof item.category === 'object' && 'name' in item.category
        ? (item.category.name as any).fr || 'Sans catégorie'
        : 'Sans catégorie';
      
      if (!photoMap.has(url)) {
        // Extraire le public_id Cloudinary
        const matches = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|webp)$/i);
        const publicId = matches ? matches[1] : 'unknown';
        
        photoMap.set(url, {
          url,
          publicId,
          usageCount: 0,
          usedByPlats: [],
        });
      }
      
      const photo = photoMap.get(url)!;
      photo.usageCount++;
      photo.usedByPlats.push({
        id: item._id.toString(),
        name: item.name?.fr || 'Sans nom',
        category: categoryName,
      });
    }
    
    const uniquePhotos = Array.from(photoMap.values());
    const duplicates = uniquePhotos.filter(p => p.usageCount > 1);
    
    console.log(`✅ ${uniquePhotos.length} photos uniques détectées`);
    console.log(`⚠️ ${duplicates.length} URLs utilisées plusieurs fois`);
    console.log('');

    // PHASE 3 : Téléchargement des photos
    console.log('PHASE 3 : TÉLÉCHARGEMENT DES PHOTOS POUR ANALYSE VISUELLE');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    const auditDir = path.join(__dirname, '../../audit-photos');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    
    console.log(`📁 Dossier d'audit : ${auditDir}`);
    console.log('');
    
    let downloadCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < uniquePhotos.length; i++) {
      const photo = uniquePhotos[i];
      const filename = `photo_${i + 1}_${photo.publicId.replace(/\//g, '_')}.jpg`;
      const filepath = path.join(auditDir, filename);
      
      // Ne pas télécharger si déjà présent
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  [${i + 1}/${uniquePhotos.length}] Déjà téléchargé: ${filename}`);
        downloadCount++;
        continue;
      }
      
      console.log(`📥 [${i + 1}/${uniquePhotos.length}] Téléchargement: ${photo.publicId}`);
      
      const success = await downloadImage(photo.url, filepath);
      
      if (success) {
        downloadCount++;
        console.log(`   ✅ Téléchargé: ${filename}`);
      } else {
        errorCount++;
        console.log(`   ❌ Erreur: ${filename}`);
      }
      
      // Pause pour ne pas surcharger Cloudinary
      if (i < uniquePhotos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('');
    console.log(`✅ Photos téléchargées : ${downloadCount}/${uniquePhotos.length}`);
    if (errorCount > 0) {
      console.log(`❌ Erreurs : ${errorCount}`);
    }
    console.log('');

    // PHASE 4 : Analyse des doublons
    console.log('PHASE 4 : ANALYSE DES DOUBLONS');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    const duplicateAnalysis = duplicates.map(photo => {
      const plats = photo.usedByPlats.map(p => p.name);
      const categories = [...new Set(photo.usedByPlats.map(p => p.category))];
      
      let verdict = '';
      if (photo.usageCount > 5) {
        verdict = '🔴 CRITIQUE - Trop de plats différents';
      } else if (categories.length > 2) {
        verdict = '⚠️ SUSPECT - Catégories multiples';
      } else if (categories.length === 1) {
        verdict = '✅ ACCEPTABLE - Même catégorie';
      } else {
        verdict = '⚠️ À VÉRIFIER';
      }
      
      return {
        url: photo.url,
        count: photo.usageCount,
        plats,
        categories,
        verdict,
      };
    });
    
    console.log(`✅ ${duplicateAnalysis.length} doublons analysés`);
    console.log('');

    // Préparer les données de résultat
    const result: AuditResult = {
      totalPlats: menuItems.length,
      totalUniquePhotos: uniquePhotos.length,
      duplicates: duplicates.length,
      menuItems: menuItems.map(item => {
        const categoryName = item.category && typeof item.category === 'object' && 'name' in item.category
          ? (item.category.name as any).fr || 'Sans catégorie'
          : 'Sans catégorie';
        
        return {
          _id: item._id.toString(),
          nameFr: item.name?.fr || 'Sans nom',
          nameAr: item.name?.ar,
          nameEn: item.name?.en,
          categoryId: typeof item.category === 'object' && 'id' in item.category ? String(item.category._id) : String(item.category),
          categoryName,
          image: item.image,
          isAvailable: item.isAvailable,
          price: item.price,
          description: item.description?.fr,
        };
      }),
      photos: uniquePhotos,
      duplicateAnalysis,
    };

    // PHASE 5 : Génération du rapport HTML interactif
    console.log('PHASE 5 : GÉNÉRATION DU RAPPORT HTML INTERACTIF');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    const htmlContent = generateHTML(result, auditDir);
    const htmlPath = path.join(__dirname, '../../AUDIT-VISUEL-98-PLATS.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    
    console.log(`✅ Rapport HTML généré : ${htmlPath}`);
    console.log('');

    // PHASE 6 : Génération du rapport JSON
    const jsonPath = path.join(__dirname, '../../AUDIT-VISUEL-98-PLATS.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    
    console.log(`✅ Rapport JSON généré : ${jsonPath}`);
    console.log('');

    // PHASE 7 : Résumé final
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('AUDIT TERMINÉ');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Plats analysés               : ${result.totalPlats}`);
    console.log(`Photos analysées             : ${result.totalUniquePhotos}`);
    console.log(`Photos téléchargées          : ${downloadCount}`);
    console.log(`Doublons détectés            : ${result.duplicates}`);
    console.log('');
    console.log('📄 RAPPORTS GÉNÉRÉS :');
    console.log('');
    console.log(`   HTML : ${htmlPath}`);
    console.log(`   JSON : ${jsonPath}`);
    console.log(`   Photos : ${auditDir}`);
    console.log('');
    console.log('🔍 PROCHAINE ÉTAPE :');
    console.log('');
    console.log('   1. Ouvrir le rapport HTML dans un navigateur');
    console.log('   2. Examiner visuellement chaque photo');
    console.log('   3. Classifier chaque plat selon les critères définis');
    console.log('   4. Identifier les plats nécessitant une nouvelle photo');
    console.log('');
    console.log('🛑 MODE LECTURE SEULE MAINTENU');
    console.log('   Aucune modification MongoDB ou Cloudinary effectuée');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur durant l\'audit:', error);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Génération HTML
// ═══════════════════════════════════════════════════════════════════════════════

function generateHTML(result: AuditResult, photosDir: string): string {
  const photoRelativePath = path.relative(
    path.join(__dirname, '../../'),
    photosDir
  ).replace(/\\/g, '/');

  const menuItemsHTML = result.menuItems.map((item, index) => {
    const photo = result.photos.find(p => p.url === item.image);
    const isDuplicate = photo && photo.usageCount > 1;
    const photoIndex = result.photos.findIndex(p => p.url === item.image) + 1;
    const photoFilename = photo ? `photo_${photoIndex}_${photo.publicId.replace(/\//g, '_')}.jpg` : '';
    
    return `
      <tr class="menu-item" data-category="${item.categoryName}">
        <td>${index + 1}</td>
        <td>
          <strong>${item.nameFr}</strong>
          ${item.nameAr ? `<br><small style="color: #666;">${item.nameAr}</small>` : ''}
          ${item.nameEn ? `<br><small style="color: #999;">${item.nameEn}</small>` : ''}
        </td>
        <td><span class="badge badge-category">${item.categoryName}</span></td>
        <td class="photo-cell">
          ${photoFilename ? `
            <img src="${photoRelativePath}/${photoFilename}" alt="${item.nameFr}" class="thumbnail" onclick="openModal('${photoRelativePath}/${photoFilename}', '${item.nameFr.replace(/'/g, "\\'")}')">
            ${isDuplicate ? `<span class="badge badge-duplicate">×${photo!.usageCount}</span>` : ''}
          ` : '<span style="color: #999;">Aucune photo</span>'}
        </td>
        <td>
          <select class="classification-select" data-item-id="${item._id}">
            <option value="">-- À classifier --</option>
            <option value="MATCH_REEL_BIZZART">✅ MATCH RÉEL BIZZ'ART</option>
            <option value="MATCH_PROBABLE">🟢 MATCH PROBABLE</option>
            <option value="REAL_BIZZART_WRONG_MATCH">⚠️ RÉEL BIZZ'ART MAUVAIS PLAT</option>
            <option value="STOCK_OR_GENERIC">🔴 STOCK/GÉNÉRIQUE</option>
            <option value="MISSING_PHOTO">❌ PHOTO MANQUANTE</option>
            <option value="DUPLICATE_SUSPECT">🟠 DOUBLON SUSPECT</option>
            <option value="UNCERTAIN">❓ INCERTAIN</option>
          </select>
        </td>
        <td>
          <select class="confidence-select" data-item-id="${item._id}">
            <option value="">--</option>
            <option value="HIGH">Élevée</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="LOW">Faible</option>
          </select>
        </td>
        <td>
          <input type="text" class="notes-input" data-item-id="${item._id}" placeholder="Notes...">
        </td>
      </tr>
    `;
  }).join('');

  const duplicatesHTML = result.duplicateAnalysis
    .sort((a, b) => b.count - a.count)
    .map((dup, index) => {
      const photoIndex = result.photos.findIndex(p => p.url === dup.url) + 1;
      const photo = result.photos.find(p => p.url === dup.url);
      const photoFilename = photo ? `photo_${photoIndex}_${photo.publicId.replace(/\//g, '_')}.jpg` : '';
      
      return `
        <div class="duplicate-card">
          <h4>Doublon #${index + 1} : ${dup.count} utilisations ${dup.verdict}</h4>
          ${photoFilename ? `
            <img src="${photoRelativePath}/${photoFilename}" alt="Doublon" class="duplicate-thumbnail" onclick="openModal('${photoRelativePath}/${photoFilename}', 'Doublon #${index + 1}')">
          ` : ''}
          <p><strong>Plats concernés :</strong></p>
          <ul>
            ${dup.plats.map(p => `<li>${p}</li>`).join('')}
          </ul>
          <p><strong>Catégories :</strong> ${dup.categories.join(', ')}</p>
        </div>
      `;
    }).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Visuel BIZZ'ART - 98 Plats</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; margin-bottom: 10px; color: #333; }
    .header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
    .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
    .stat-card { background: #f8f9fa; padding: 15px 20px; border-radius: 6px; flex: 1; min-width: 150px; }
    .stat-card h3 { font-size: 14px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
    .stat-card p { font-size: 32px; font-weight: bold; color: #2196F3; }
    
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #ddd; }
    .tab { padding: 10px 20px; cursor: pointer; background: none; border: none; font-size: 16px; color: #666; border-bottom: 3px solid transparent; }
    .tab.active { color: #2196F3; border-bottom-color: #2196F3; font-weight: 600; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    .filters { margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap; }
    .filters select, .filters input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .filters button { padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .filters button:hover { background: #1976D2; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    thead { background: #f8f9fa; position: sticky; top: 0; z-index: 10; }
    th { padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #333; border-bottom: 2px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
    tr:hover { background: #f8f9fa; }
    
    .photo-cell { text-align: center; width: 120px; }
    .thumbnail { width: 100px; height: 100px; object-fit: cover; border-radius: 6px; cursor: pointer; transition: transform 0.2s; }
    .thumbnail:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-category { background: #E3F2FD; color: #1976D2; }
    .badge-duplicate { background: #FFF3E0; color: #F57C00; margin-top: 5px; }
    
    .classification-select, .confidence-select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; width: 100%; }
    .notes-input { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; width: 100%; }
    
    .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }
    .modal-content { margin: 50px auto; max-width: 90%; max-height: 90%; display: block; border-radius: 8px; }
    .modal-close { position: absolute; top: 20px; right: 35px; color: white; font-size: 40px; font-weight: bold; cursor: pointer; }
    .modal-close:hover { color: #ccc; }
    .modal-title { position: absolute; top: 20px; left: 35px; color: white; font-size: 24px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    
    .duplicate-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #FF9800; }
    .duplicate-card h4 { margin-bottom: 15px; color: #333; }
    .duplicate-thumbnail { width: 200px; height: 200px; object-fit: cover; border-radius: 6px; cursor: pointer; margin-bottom: 15px; }
    .duplicate-card ul { margin: 10px 0 10px 20px; }
    
    .export-buttons { display: flex; gap: 10px; margin-top: 20px; }
    .export-buttons button { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .export-buttons button:hover { background: #45a049; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Audit Visuel Professionnel — BIZZ'ART</h1>
      <p style="color: #666; margin-top: 10px;">Analyse visuelle des ${result.totalPlats} plats du menu</p>
      
      <div class="stats">
        <div class="stat-card">
          <h3>Total Plats</h3>
          <p>${result.totalPlats}</p>
        </div>
        <div class="stat-card">
          <h3>Photos Uniques</h3>
          <p>${result.totalUniquePhotos}</p>
        </div>
        <div class="stat-card">
          <h3>Doublons</h3>
          <p>${result.duplicates}</p>
        </div>
        <div class="stat-card">
          <h3>À Classifier</h3>
          <p id="toClassifyCount">${result.totalPlats}</p>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="showTab('plats')">📋 Liste des Plats (${result.totalPlats})</button>
      <button class="tab" onclick="showTab('duplicates')">🔁 Doublons (${result.duplicates})</button>
      <button class="tab" onclick="showTab('export')">💾 Export</button>
    </div>

    <div id="plats-tab" class="tab-content active">
      <div class="filters">
        <select id="categoryFilter" onchange="applyFilters()">
          <option value="">Toutes catégories</option>
          ${[...new Set(result.menuItems.map(item => item.categoryName))].sort().map(cat => 
            `<option value="${cat}">${cat}</option>`
          ).join('')}
        </select>
        
        <select id="classificationFilter" onchange="applyFilters()">
          <option value="">Toutes classifications</option>
          <option value="MATCH_REEL_BIZZART">✅ MATCH RÉEL BIZZ'ART</option>
          <option value="MATCH_PROBABLE">🟢 MATCH PROBABLE</option>
          <option value="REAL_BIZZART_WRONG_MATCH">⚠️ RÉEL BIZZ'ART MAUVAIS PLAT</option>
          <option value="STOCK_OR_GENERIC">🔴 STOCK/GÉNÉRIQUE</option>
          <option value="MISSING_PHOTO">❌ PHOTO MANQUANTE</option>
          <option value="DUPLICATE_SUSPECT">🟠 DOUBLON SUSPECT</option>
          <option value="UNCERTAIN">❓ INCERTAIN</option>
          <option value="UNCLASSIFIED">⚪ Non classifié</option>
        </select>
        
        <input type="text" id="searchInput" placeholder="Rechercher un plat..." oninput="applyFilters()">
        
        <button onclick="saveToLocalStorage()">💾 Sauvegarder Progression</button>
        <button onclick="resetFilters()">🔄 Réinitialiser Filtres</button>
      </div>

      <table id="menuTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Plat</th>
            <th>Catégorie</th>
            <th>Photo</th>
            <th>Classification</th>
            <th>Confiance</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${menuItemsHTML}
        </tbody>
      </table>
    </div>

    <div id="duplicates-tab" class="tab-content">
      <h2 style="margin-bottom: 20px;">Analyse des Doublons</h2>
      ${duplicatesHTML}
    </div>

    <div id="export-tab" class="tab-content">
      <h2 style="margin-bottom: 20px;">Export de l'Audit</h2>
      <p style="margin-bottom: 20px; color: #666;">
        Une fois votre classification terminée, exportez les résultats pour analyse.
      </p>
      <div class="export-buttons">
        <button onclick="exportToJSON()">📄 Exporter en JSON</button>
        <button onclick="exportToCSV()">📊 Exporter en CSV</button>
      </div>
      <pre id="exportPreview" style="background: #f5f5f5; padding: 20px; border-radius: 6px; margin-top: 20px; overflow: auto; max-height: 500px; display: none;"></pre>
    </div>
  </div>

  <div id="imageModal" class="modal" onclick="closeModal()">
    <span class="modal-close">&times;</span>
    <div class="modal-title" id="modalTitle"></div>
    <img class="modal-content" id="modalImage">
  </div>

  <script>
    // Charger depuis localStorage au démarrage
    window.addEventListener('load', () => {
      loadFromLocalStorage();
      updateClassifiedCount();
    });

    // Gestion des onglets
    function showTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    }

    // Modal
    function openModal(src, title) {
      document.getElementById('imageModal').style.display = 'block';
      document.getElementById('modalImage').src = src;
      document.getElementById('modalTitle').textContent = title;
    }

    function closeModal() {
      document.getElementById('imageModal').style.display = 'none';
    }

    // Filtres
    function applyFilters() {
      const categoryFilter = document.getElementById('categoryFilter').value;
      const classificationFilter = document.getElementById('classificationFilter').value;
      const searchInput = document.getElementById('searchInput').value.toLowerCase();
      
      document.querySelectorAll('.menu-item').forEach(row => {
        const category = row.dataset.category;
        const platName = row.querySelector('strong').textContent.toLowerCase();
        const classification = row.querySelector('.classification-select').value;
        
        let show = true;
        
        if (categoryFilter && category !== categoryFilter) show = false;
        if (searchInput && !platName.includes(searchInput)) show = false;
        if (classificationFilter === 'UNCLASSIFIED' && classification !== '') show = false;
        if (classificationFilter && classificationFilter !== 'UNCLASSIFIED' && classification !== classificationFilter) show = false;
        
        row.style.display = show ? '' : 'none';
      });
    }

    function resetFilters() {
      document.getElementById('categoryFilter').value = '';
      document.getElementById('classificationFilter').value = '';
      document.getElementById('searchInput').value = '';
      applyFilters();
    }

    // Sauvegarder dans localStorage
    function saveToLocalStorage() {
      const data = {};
      document.querySelectorAll('.classification-select').forEach(select => {
        const itemId = select.dataset.itemId;
        const classification = select.value;
        const confidence = document.querySelector(\`.confidence-select[data-item-id="\${itemId}"]\`).value;
        const notes = document.querySelector(\`.notes-input[data-item-id="\${itemId}"]\`).value;
        
        data[itemId] = { classification, confidence, notes };
      });
      
      localStorage.setItem('bizzart-visual-audit', JSON.stringify(data));
      alert('✅ Progression sauvegardée localement');
      updateClassifiedCount();
    }

    function loadFromLocalStorage() {
      const saved = localStorage.getItem('bizzart-visual-audit');
      if (!saved) return;
      
      const data = JSON.parse(saved);
      
      Object.keys(data).forEach(itemId => {
        const item = data[itemId];
        const classSelect = document.querySelector(\`.classification-select[data-item-id="\${itemId}"]\`);
        const confSelect = document.querySelector(\`.confidence-select[data-item-id="\${itemId}"]\`);
        const notesInput = document.querySelector(\`.notes-input[data-item-id="\${itemId}"]\`);
        
        if (classSelect) classSelect.value = item.classification || '';
        if (confSelect) confSelect.value = item.confidence || '';
        if (notesInput) notesInput.value = item.notes || '';
      });
    }

    function updateClassifiedCount() {
      const classified = document.querySelectorAll('.classification-select').length -
                        document.querySelectorAll('.classification-select[value=""]').length;
      document.getElementById('toClassifyCount').textContent = ${result.totalPlats} - classified;
    }

    // Export
    function exportToJSON() {
      const data = {};
      document.querySelectorAll('.classification-select').forEach(select => {
        const itemId = select.dataset.itemId;
        const classification = select.value;
        const confidence = document.querySelector(\`.confidence-select[data-item-id="\${itemId}"]\`).value;
        const notes = document.querySelector(\`.notes-input[data-item-id="\${itemId}"]\`).value;
        
        data[itemId] = { classification, confidence, notes };
      });
      
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-visuel-bizzart-' + Date.now() + '.json';
      a.click();
      
      document.getElementById('exportPreview').textContent = json;
      document.getElementById('exportPreview').style.display = 'block';
    }

    function exportToCSV() {
      let csv = 'ID,Plat,Catégorie,Classification,Confiance,Notes\\n';
      
      document.querySelectorAll('.menu-item').forEach(row => {
        const platName = row.querySelector('strong').textContent;
        const category = row.dataset.category;
        const select = row.querySelector('.classification-select');
        const itemId = select.dataset.itemId;
        const classification = select.value;
        const confidence = document.querySelector(\`.confidence-select[data-item-id="\${itemId}"]\`).value;
        const notes = document.querySelector(\`.notes-input[data-item-id="\${itemId}"]\`).value;
        
        csv += \`"\${itemId}","\${platName}","\${category}","\${classification}","\${confidence}","\${notes}"\\n\`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-visuel-bizzart-' + Date.now() + '.csv';
      a.click();
    }

    // Auto-save toutes les 30 secondes
    setInterval(saveToLocalStorage, 30000);

    // Détecter les changements pour mettre à jour le compteur
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('classification-select')) {
        updateClassifiedCount();
      }
    });
  </script>
</body>
</html>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exécution
// ═══════════════════════════════════════════════════════════════════════════════

visualAudit();
