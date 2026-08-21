/**
 * GÉNÉRATION INTERFACE DE VALIDATION MANUELLE
 * 
 * Crée une interface HTML locale pour valider manuellement les 35 photos
 * Les décisions sont enregistrées dans un fichier JSON local
 * 
 * AUCUNE MODIFICATION DE PRODUCTION
 * AUCUNE ÉCRITURE MONGODB
 * AUCUNE MODIFICATION CLOUDINARY
 */

import * as fs from 'fs';
import * as path from 'path';

const AUDIT_JSON_PATH = path.join(__dirname, 'AUDIT-VISUEL-AI-FINAL-2026-08-19.json');
const OUTPUT_DIR = path.join(__dirname, 'validation-reports');
const VALIDATION_JSON_PATH = path.join(OUTPUT_DIR, 'manual-validation.json');

interface PhotoValidation {
  photoId: string;
  url: string;
  status: 'CONFIRMED_BIZZART' | 'STOCK' | 'WRONG_DISH' | 'DUPLICATE' | 'MANUAL_REVIEW' | 'NO_DECISION';
  validatedAt: string;
  notes: string;
}

function generateManualValidationUI() {
  console.log('🖥️  GÉNÉRATION INTERFACE DE VALIDATION MANUELLE\n');
  console.log('⚠️  Mode : LECTURE SEULE - Aucune modification de production\n');

  // Charger l'audit
  console.log('📖 Chargement des données d\'audit...');
  const auditData = JSON.parse(fs.readFileSync(AUDIT_JSON_PATH, 'utf-8'));
  console.log(`✅ ${auditData.photos.length} photos chargées\n`);

  // Créer le fichier de validation initial s'il n'existe pas
  if (!fs.existsSync(VALIDATION_JSON_PATH)) {
    const initialValidations: PhotoValidation[] = auditData.photos.map((photo: any) => ({
      photoId: photo.photoId,
      url: photo.url,
      status: 'NO_DECISION',
      validatedAt: '',
      notes: ''
    }));
    fs.writeFileSync(VALIDATION_JSON_PATH, JSON.stringify(initialValidations, null, 2));
    console.log('✅ Fichier de validation initialisé\n');
  }

  // Construire les données pour l'interface
  const duplicatesMap = new Map();
  auditData.duplicates?.forEach((dup: any) => {
    duplicatesMap.set(dup.photoId, {
      criticality: dup.criticality,
      usageCount: dup.usageCount
    });
  });

  const photoData = auditData.photos.map((photo: any) => {
    const analysis = photo.visionAnalysis;
    const bestMatch = photo.matches && photo.matches.length > 0 ? photo.matches[0] : null;
    
    let validationGroup = 'D';
    if (analysis && analysis.confidence > 0) {
      if (analysis.origin === 'VRAIE_PHOTO_BIZZART') validationGroup = 'A';
      else if (analysis.origin === 'STOCK_GENERIQUE') validationGroup = 'B';
      else validationGroup = 'C';
    }

    return {
      photoId: photo.photoId,
      url: photo.url,
      filename: photo.filename,
      usedBy: photo.usedBy || [],
      usedByCount: photo.usedBy?.length || 0,
      visionAnalyzed: analysis && analysis.confidence > 0,
      detectedDish: analysis?.detectedDish || 'Non analysé',
      detectedType: analysis?.detectedType || 'N/A',
      origin: analysis?.origin || 'N/A',
      confidence: analysis?.confidence || 0,
      bestMatch: bestMatch?.menuItemName || 'Aucun',
      bestMatchScore: bestMatch?.score || 0,
      matchLevel: bestMatch?.level || 'N/A',
      validationGroup,
      isDuplicate: duplicatesMap.has(photo.photoId),
      duplicateInfo: duplicatesMap.get(photo.photoId) || null
    };
  });

  // Générer l'interface HTML
  generateHTML(photoData, auditData);

  console.log('✅ Interface de validation générée\n');
  console.log(`📂 Fichier HTML: ${path.join(OUTPUT_DIR, 'manual-validation.html')}`);
  console.log(`📂 Fichier JSON: ${VALIDATION_JSON_PATH}\n`);
  console.log('⚠️  RAPPEL : AUCUNE MODIFICATION DE PRODUCTION\n');
}

function generateHTML(photoData: any[], auditData: any) {
  const timestamp = new Date().toISOString().split('T')[0];
  const htmlPath = path.join(OUTPUT_DIR, 'manual-validation.html');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validation Manuelle Photos BIZZ'ART</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .progress-bar { background: rgba(255,255,255,0.3); height: 30px; border-radius: 15px; overflow: hidden; margin: 15px 0; }
    .progress-fill { background: #4CAF50; height: 100%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
    .controls { background: white; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .search-input { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; flex: 1; min-width: 200px; }
    .filter-btn { padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .filter-btn:hover { background: #f5f5f5; }
    .filter-btn.active { background: #2196F3; color: white; border-color: #2196F3; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
    .photo-card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; transition: transform 0.2s; }
    .photo-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .photo-card.validated { border: 3px solid #4CAF50; }
    .photo-img { width: 100%; height: 250px; object-fit: cover; cursor: pointer; background: #f5f5f5; }
    .photo-info { padding: 15px; }
    .photo-id { font-weight: bold; font-size: 18px; margin-bottom: 10px; color: #333; }
    .info-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
    .info-label { color: #666; }
    .info-value { font-weight: 500; color: #333; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin: 2px; }
    .badge-a { background: #E8F5E9; color: #4CAF50; }
    .badge-b { background: #FFEBEE; color: #f44336; }
    .badge-c { background: #FFF3E0; color: #F57C00; }
    .badge-d { background: #F5F5F5; color: #666; }
    .badge-high { background: #FFEBEE; color: #f44336; }
    .badge-medium { background: #FFF3E0; color: #F57C00; }
    .validation-btns { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 15px; }
    .val-btn { padding: 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; }
    .val-btn:hover { transform: scale(1.05); }
    .val-btn.confirmed { background: #4CAF50; color: white; }
    .val-btn.stock { background: #f44336; color: white; }
    .val-btn.wrong { background: #FF9800; color: white; }
    .val-btn.duplicate { background: #9C27B0; color: white; }
    .val-btn.review { background: #2196F3; color: white; }
    .val-btn.none { background: #9E9E9E; color: white; }
    .notes-input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 10px; font-size: 12px; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; }
    .modal.show { display: flex; }
    .modal-img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .modal-close { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
    .export-btn { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .export-btn:hover { background: #45a049; }
    .alert { background: #FFF3E0; color: #E65100; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; border-radius: 4px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 15px 0; }
    .stat-card { background: rgba(255,255,255,0.2); padding: 10px; border-radius: 4px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.9; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🖼️ Validation Manuelle Photos BIZZ'ART</h1>
    <p>Validez manuellement chaque photo avant toute modification de production</p>
    <div class="progress-bar">
      <div class="progress-fill" id="progressBar">0 / 35 (0%)</div>
    </div>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value" id="statConfirmed">0</div>
        <div class="stat-label">Confirmées</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statStock">0</div>
        <div class="stat-label">Stock</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statWrong">0</div>
        <div class="stat-label">Mauvais plat</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statDuplicate">0</div>
        <div class="stat-label">Doublons</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statReview">0</div>
        <div class="stat-label">À revoir</div>
      </div>
    </div>
  </div>

  <div class="controls">
    <input type="text" class="search-input" id="searchInput" placeholder="Rechercher par nom de plat, photo ID..." oninput="filterPhotos()">
    <button class="filter-btn active" data-filter="all" onclick="setFilter('all')">Toutes (35)</button>
    <button class="filter-btn" data-filter="A" onclick="setFilter('A')">Groupe A</button>
    <button class="filter-btn" data-filter="B" onclick="setFilter('B')">Groupe B</button>
    <button class="filter-btn" data-filter="C" onclick="setFilter('C')">Groupe C</button>
    <button class="filter-btn" data-filter="D" onclick="setFilter('D')">Groupe D</button>
    <button class="filter-btn" data-filter="duplicates" onclick="setFilter('duplicates')">Doublons</button>
    <button class="filter-btn" data-filter="validated" onclick="setFilter('validated')">Validées</button>
    <button class="export-btn" onclick="exportCSV()">📊 Exporter CSV</button>
  </div>

  <div class="container">
    <div class="alert">
      <strong>⚠️ VALIDATION MANUELLE — AUCUNE MODIFICATION DE PRODUCTION</strong><br>
      Les décisions sont enregistrées localement dans <code>manual-validation.json</code>. Aucune modification MongoDB ou Cloudinary n'est effectuée.
    </div>

    <div class="photo-grid" id="photoGrid">
      ${photoData.map(photo => `
        <div class="photo-card" data-photo-id="${photo.photoId}" data-group="${photo.validationGroup}" data-duplicate="${photo.isDuplicate}">
          <img src="${photo.url}" class="photo-img" alt="${photo.photoId}" onclick="openModal('${photo.url}')" onerror="this.style.display='none'">
          <div class="photo-info">
            <div class="photo-id">${photo.photoId}</div>
            <span class="badge badge-${photo.validationGroup.toLowerCase()}">Groupe ${photo.validationGroup}</span>
            ${photo.isDuplicate ? `<span class="badge badge-${photo.duplicateInfo.criticality.toLowerCase()}">${photo.duplicateInfo.criticality}</span>` : ''}
            
            <div class="info-row">
              <span class="info-label">Fichier:</span>
              <span class="info-value">${photo.filename.substring(0, 30)}...</span>
            </div>
            <div class="info-row">
              <span class="info-label">Utilisée par:</span>
              <span class="info-value">${photo.usedByCount} plat(s)</span>
            </div>
            <div class="info-row">
              <span class="info-label">Plat détecté:</span>
              <span class="info-value">${photo.detectedDish.substring(0, 30)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Origine:</span>
              <span class="info-value">${photo.origin}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Confiance:</span>
              <span class="info-value">${(photo.confidence * 100).toFixed(0)}%</span>
            </div>
            <div class="info-row">
              <span class="info-label">Meilleur match:</span>
              <span class="info-value">${photo.bestMatch.substring(0, 25)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Score match:</span>
              <span class="info-value">${photo.bestMatchScore.toFixed(2)} (${photo.matchLevel})</span>
            </div>
            
            <div class="validation-btns">
              <button class="val-btn confirmed" onclick="validate('${photo.photoId}', 'CONFIRMED_BIZZART')">✅ Confirmée</button>
              <button class="val-btn stock" onclick="validate('${photo.photoId}', 'STOCK')">🚫 Stock</button>
              <button class="val-btn wrong" onclick="validate('${photo.photoId}', 'WRONG_DISH')">⚠️ Mauvais</button>
              <button class="val-btn duplicate" onclick="validate('${photo.photoId}', 'DUPLICATE')">🔁 Doublon</button>
              <button class="val-btn review" onclick="validate('${photo.photoId}', 'MANUAL_REVIEW')">❓ À revoir</button>
              <button class="val-btn none" onclick="validate('${photo.photoId}', 'NO_DECISION')">⏸️ Aucune</button>
            </div>
            <input type="text" class="notes-input" id="notes-${photo.photoId}" placeholder="Notes (optionnel)..." onchange="saveNotes('${photo.photoId}', this.value)">
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="modal" id="imageModal" onclick="closeModal()">
    <span class="modal-close">&times;</span>
    <img class="modal-img" id="modalImage">
  </div>

  <script>
    const photoDataJSON = ${JSON.stringify(photoData)};
    let validations = {};
    let currentFilter = 'all';

    // Charger les validations existantes
    fetch('./manual-validation.json')
      .then(r => r.json())
      .then(data => {
        validations = {};
        data.forEach(v => {
          validations[v.photoId] = v;
          if (v.status !== 'NO_DECISION') {
            document.querySelector(\`[data-photo-id="\${v.photoId}"]\`).classList.add('validated');
          }
          if (v.notes) {
            document.getElementById(\`notes-\${v.photoId}\`).value = v.notes;
          }
        });
        updateProgress();
      })
      .catch(() => {
        // Initialiser si le fichier n'existe pas encore
        photoDataJSON.forEach(p => {
          validations[p.photoId] = {
            photoId: p.photoId,
            url: p.url,
            status: 'NO_DECISION',
            validatedAt: '',
            notes: ''
          };
        });
      });

    function validate(photoId, status) {
      validations[photoId] = {
        ...validations[photoId],
        status: status,
        validatedAt: new Date().toISOString()
      };
      
      document.querySelector(\`[data-photo-id="\${photoId}"]\`).classList.add('validated');
      saveValidations();
      updateProgress();
      
      alert(\`✅ Décision enregistrée localement pour \${photoId}: \${status}\`);
    }

    function saveNotes(photoId, notes) {
      validations[photoId] = {
        ...validations[photoId],
        notes: notes
      };
      saveValidations();
    }

    function saveValidations() {
      const blob = new Blob([JSON.stringify(Object.values(validations), null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'manual-validation.json';
      a.click();
    }

    function updateProgress() {
      const validated = Object.values(validations).filter(v => v.status !== 'NO_DECISION').length;
      const total = Object.keys(validations).length;
      const percent = Math.round((validated / total) * 100);
      
      document.getElementById('progressBar').textContent = \`\${validated} / \${total} (\${percent}%)\`;
      document.getElementById('progressBar').style.width = percent + '%';
      
      // Stats
      const stats = {
        CONFIRMED_BIZZART: 0,
        STOCK: 0,
        WRONG_DISH: 0,
        DUPLICATE: 0,
        MANUAL_REVIEW: 0
      };
      Object.values(validations).forEach(v => {
        if (stats[v.status] !== undefined) stats[v.status]++;
      });
      
      document.getElementById('statConfirmed').textContent = stats.CONFIRMED_BIZZART;
      document.getElementById('statStock').textContent = stats.STOCK;
      document.getElementById('statWrong').textContent = stats.WRONG_DISH;
      document.getElementById('statDuplicate').textContent = stats.DUPLICATE;
      document.getElementById('statReview').textContent = stats.MANUAL_REVIEW;
    }

    function setFilter(filter) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
      });
      filterPhotos();
    }

    function filterPhotos() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('.photo-card');
      
      cards.forEach(card => {
        const photoId = card.dataset.photoId;
        const group = card.dataset.group;
        const isDuplicate = card.dataset.duplicate === 'true';
        const isValidated = card.classList.contains('validated');
        const text = card.textContent.toLowerCase();
        
        let show = true;
        
        // Filtre de groupe
        if (currentFilter === 'A' || currentFilter === 'B' || currentFilter === 'C' || currentFilter === 'D') {
          show = group === currentFilter;
        } else if (currentFilter === 'duplicates') {
          show = isDuplicate;
        } else if (currentFilter === 'validated') {
          show = isValidated;
        }
        
        // Recherche
        if (search && !text.includes(search)) {
          show = false;
        }
        
        card.style.display = show ? 'block' : 'none';
      });
    }

    function openModal(url) {
      document.getElementById('modalImage').src = url;
      document.getElementById('imageModal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('imageModal').classList.remove('show');
    }

    function exportCSV() {
      let csv = 'PhotoID,Status,ValidatedAt,Notes\\n';
      Object.values(validations).forEach(v => {
        csv += \`"\${v.photoId}","\${v.status}","\${v.validatedAt}","\${v.notes}"\\n\`;
      });
      
      const blob = new Blob([csv], {type: 'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'validation-export-' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
    }

    // Initialiser
    updateProgress();
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log(`   ✅ ${path.basename(htmlPath)}`);
}

generateManualValidationUI();
